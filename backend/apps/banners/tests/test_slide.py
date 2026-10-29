"""Ogni banner puo' avere fino a 2 slide in piu' (3 in tutto).

Con 2 o piu' slide il frontend le fa scorrere da sole ogni
`intervallo_secondi`. Ogni slide ha i suoi testi, immagine, link e bottone,
con le stesse regole del banner.
"""

import shutil
import tempfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.banners.models import Banner, SlideBanner

from .test_banner import immagine_png


MEDIA_ROOT = tempfile.mkdtemp()


class SlideValidazioneTest(TestCase):
    def setUp(self):
        self.banner = Banner.objects.get(posizione='homepage_middle')

    def test_slide_con_sola_immagine_e_valida(self):
        slide = SlideBanner(banner=self.banner, immagine='banners/b.png', link='https://example.com')
        slide.full_clean()

    def test_slide_vuota_da_errore(self):
        with self.assertRaises(ValidationError):
            SlideBanner(banner=self.banner).full_clean()

    def test_slide_bottone_senza_link_da_errore(self):
        slide = SlideBanner(banner=self.banner, titolo='Promo', button_testo='Vai')
        with self.assertRaises(ValidationError) as ctx:
            slide.full_clean()
        self.assertIn('button_link', ctx.exception.message_dict)

    def test_intervallo_fuori_dai_limiti_da_errore(self):
        for valore in (1, 61):
            self.banner.intervallo_secondi = valore
            with self.assertRaises(ValidationError) as ctx:
                self.banner.full_clean()
            self.assertIn('intervallo_secondi', ctx.exception.message_dict)


class SlideApiTest(TestCase):
    def setUp(self):
        self.banner = Banner.objects.get(posizione='homepage_middle')

    def test_senza_slide_la_lista_e_vuota(self):
        data = self.client.get('/api/banners/homepage_middle/').json()
        self.assertEqual(data['slides'], [])
        self.assertEqual(data['intervallo_secondi'], 6)

    def test_slide_attive_in_ordine(self):
        SlideBanner.objects.create(banner=self.banner, titolo='Seconda', ordine=2)
        SlideBanner.objects.create(banner=self.banner, titolo='Prima', ordine=1, link='https://example.com/a')
        SlideBanner.objects.create(banner=self.banner, titolo='Spenta', ordine=0, attivo=False)
        data = self.client.get('/api/banners/homepage_middle/').json()
        self.assertEqual([s['titolo'] for s in data['slides']], ['Prima', 'Seconda'])
        self.assertEqual(data['slides'][0]['link'], 'https://example.com/a')
        self.assertEqual(
            set(data['slides'][0]),
            {'id', 'titolo', 'descrizione', 'immagine', 'link', 'button_testo', 'button_link'},
        )


@override_settings(
    MEDIA_ROOT=MEDIA_ROOT,
    STORAGES={
        **settings.STORAGES,
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    },
)
class SlideAdminTest(TestCase):
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

    def _post(self, slides, **banner):
        data = {
            'titolo': self.banner.titolo, 'descrizione': '', 'link': '',
            'button_testo': '', 'button_link': '', 'attivo': 'on', 'intervallo_secondi': '5',
            'slides-TOTAL_FORMS': str(len(slides)), 'slides-INITIAL_FORMS': '0',
            'slides-MIN_NUM_FORMS': '0', 'slides-MAX_NUM_FORMS': '2',
        }
        data.update(banner)
        for i, slide in enumerate(slides):
            base = {'titolo': '', 'descrizione': '', 'link': '', 'button_testo': '',
                    'button_link': '', 'ordine': str(i), 'attivo': 'on'}
            base.update(slide)
            data.update({f'slides-{i}-{k}': v for k, v in base.items()})
        return self.client.post(self.url, data)

    def test_la_pagina_mostra_le_slide(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'slides-TOTAL_FORMS')
        self.assertContains(res, 'name="intervallo_secondi"')

    def test_aggiunge_due_slide_con_immagine_e_link(self):
        res = self._post([
            {'immagine': immagine_png('a.png'), 'link': 'https://example.com/a'},
            {'titolo': 'Terza', 'button_testo': 'Scopri', 'button_link': 'https://example.com/c'},
        ])
        self.assertEqual(res.status_code, 302, res.content.decode()[:3000])
        slides = list(self.banner.slides.order_by('ordine'))
        self.assertEqual(len(slides), 2)
        self.assertTrue(slides[0].immagine.name.startswith('banners/'))
        self.assertEqual(slides[1].titolo, 'Terza')
        self.banner.refresh_from_db()
        self.assertEqual(self.banner.intervallo_secondi, 5)

    def test_non_si_superano_tre_slide_in_tutto(self):
        res = self._post([{'titolo': 'A'}, {'titolo': 'B'}, {'titolo': 'C'}])
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.banner.slides.count(), 0)
