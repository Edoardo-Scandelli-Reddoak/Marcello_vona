"""Banner pubblicitari della home.

Il banner deve poter essere anche solo un'immagine: il titolo e' facoltativo,
come il bottone. E deve poter portare a un link cliccando in qualsiasi punto,
anche quando il bottone non c'e'.
"""

import shutil
import tempfile
from io import BytesIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image

from apps.banners.models import Banner


MEDIA_ROOT = tempfile.mkdtemp()


def immagine_png(nome='banner.png'):
    buf = BytesIO()
    Image.new('RGB', (1200, 200), '#E91E8C').save(buf, 'PNG')
    return SimpleUploadedFile(nome, buf.getvalue(), content_type='image/png')


class BannerValidazioneTest(TestCase):
    """I 3 banner esistono gia': li crea la migration 0010."""

    def setUp(self):
        self.banner = Banner.objects.get(posizione='homepage_middle')

    def test_solo_immagine_senza_titolo_e_valido(self):
        self.banner.titolo = ''
        self.banner.descrizione = ''
        self.banner.button_testo = ''
        self.banner.button_link = ''
        self.banner.immagine = 'banners/pubblicita.png'
        self.banner.full_clean()

    def test_banner_del_tutto_vuoto_da_errore(self):
        self.banner.titolo = ''
        self.banner.descrizione = ''
        self.banner.immagine = None
        with self.assertRaises(ValidationError):
            self.banner.full_clean()

    def test_link_del_banner_deve_essere_un_url(self):
        self.banner.link = 'sito a caso'
        with self.assertRaises(ValidationError) as ctx:
            self.banner.full_clean()
        self.assertIn('link', ctx.exception.message_dict)

    def test_link_del_banner_accetta_https_mailto_tel(self):
        for link in ('https://example.com/offerta', 'mailto:info@example.com', 'tel:+39 333 1234567'):
            self.banner.link = link
            self.banner.full_clean()

    def test_bottone_senza_nessun_link_da_errore(self):
        self.banner.button_testo = 'Scopri'
        self.banner.button_link = ''
        self.banner.link = ''
        with self.assertRaises(ValidationError) as ctx:
            self.banner.full_clean()
        self.assertIn('button_link', ctx.exception.message_dict)

    def test_bottone_senza_link_proprio_usa_quello_del_banner(self):
        self.banner.button_testo = 'Scopri'
        self.banner.button_link = ''
        self.banner.link = 'https://example.com'
        self.banner.full_clean()


class BannerApiTest(TestCase):
    def test_api_espone_il_link_del_banner(self):
        Banner.objects.filter(posizione='homepage_middle').update(
            titolo='', link='https://example.com/offerta',
        )
        res = self.client.get('/api/banners/homepage_middle/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['titolo'], '')
        self.assertEqual(res.json()['link'], 'https://example.com/offerta')


# L'admin (unfold) disegna la pagina con i file statici: nei test non c'e' il
# manifest di collectstatic, quindi uso lo storage semplice. Le immagini
# caricate finiscono in una cartella temporanea.
@override_settings(
    MEDIA_ROOT=MEDIA_ROOT,
    STORAGES={
        **settings.STORAGES,
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    },
)
class BannerAdminTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = get_user_model().objects.create_superuser(
            username='admin', email='admin@example.com', password='x'
        )

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.client.force_login(self.admin)
        self.banner = Banner.objects.get(posizione='homepage_middle')
        self.url = reverse('admin:banners_banner_change', args=[self.banner.pk])

    def _post(self, **dati):
        data = {
            'titolo': '', 'descrizione': '', 'link': '',
            'button_testo': '', 'button_link': '', 'attivo': 'on', 'intervallo_secondi': '6',
            # Le slide aggiuntive (vedi test_slide): qui nessuna.
            'slides-TOTAL_FORMS': '0', 'slides-INITIAL_FORMS': '0',
            'slides-MIN_NUM_FORMS': '0', 'slides-MAX_NUM_FORMS': '2',
        }
        data.update(dati)
        return self.client.post(self.url, data)

    def test_la_pagina_di_modifica_si_apre(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'name="link"')

    def test_salva_banner_con_sola_immagine_e_link(self):
        res = self._post(immagine=immagine_png(), link='https://example.com/offerta')
        self.assertEqual(res.status_code, 302, res.content.decode()[:2000])
        self.banner.refresh_from_db()
        self.assertEqual(self.banner.titolo, '')
        self.assertEqual(self.banner.link, 'https://example.com/offerta')
        self.assertTrue(self.banner.immagine.name.startswith('banners/'))

    def test_banner_vuoto_non_si_salva(self):
        res = self._post()
        self.assertEqual(res.status_code, 200)
        self.banner.refresh_from_db()
        self.assertNotEqual(self.banner.titolo, '')
