"""Filtro admin "Abbonamento" sulle escort: trovare chi ha l'abbonamento scaduto
per ricontattarla e proporle il rinnovo.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento, PianoAbbonamento
from apps.professioniste.models import Categoria, Professionista


# L'admin (unfold) disegna la pagina con i file statici: nei test non c'è il
# manifest di collectstatic, quindi uso lo storage semplice.
@override_settings(STORAGES={
    **settings.STORAGES,
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class AbbonamentoFilterTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='x')
        categoria = Categoria.objects.create(nome='donna', label='Donna')
        piano = PianoAbbonamento.objects.create(tipo='standard', nome='30 giorni', durata_giorni=30, prezzo_centesimi=1000)
        now = timezone.now()

        def escort(nome, *abbonamenti):
            prof = Professionista.objects.create(
                user=User.objects.create_user(username=nome, email=f'{nome}@example.com', password='x'),
                nome=nome, categoria=categoria, telefono='3330000000',
                via='Via Roma 1', citta='Roma', provincia='RM', stato_approvazione='approvata',
                foto_profilo='p.jpg', documento_fronte='f.jpg', documento_retro='r.jpg',
            )
            for stato, scadenza in abbonamenti:
                Abbonamento.objects.create(
                    professionista=prof, piano=piano, stato=stato, scadenza=scadenza, importo_centesimi=1000,
                )

        # Scaduta e segnata "scaduto" dal comando giornaliero
        escort('Scaduta', ('scaduto', now - timedelta(days=3)))
        # Scaduta ma il comando giornaliero non è ancora passato
        escort('ScadutaOggi', ('attivo', now - timedelta(hours=1)))
        # Aveva un abbonamento scaduto ma l'ha rinnovato: non è scaduta
        escort('Rinnovata', ('scaduto', now - timedelta(days=40)), ('attivo', now + timedelta(days=10)))
        escort('Attiva', ('attivo', now + timedelta(days=5)))
        # Mai pagato: richiesta in attesa e una annullata
        escort('MaiPagato', ('in_attesa', None), ('annullato', now - timedelta(days=1)))
        escort('Nuova')

    def _nomi(self, filtro):
        self.client.force_login(self.admin)
        url = reverse('admin:professioniste_professionista_changelist')
        res = self.client.get(url, {'abbonamento': filtro} if filtro else {})
        self.assertEqual(res.status_code, 200)
        return sorted(p.nome for p in res.context['cl'].result_list)

    def test_scaduto(self):
        self.assertEqual(self._nomi('scaduto'), ['Scaduta', 'ScadutaOggi'])

    def test_attivo(self):
        self.assertEqual(self._nomi('attivo'), ['Attiva', 'Rinnovata'])

    def test_mai_attivato(self):
        self.assertEqual(self._nomi('mai'), ['MaiPagato', 'Nuova'])

    def test_senza_filtro_ci_sono_tutte_una_volta(self):
        self.assertEqual(
            self._nomi(None),
            ['Attiva', 'MaiPagato', 'Nuova', 'Rinnovata', 'Scaduta', 'ScadutaOggi'],
        )

    def test_colonna_scadenza_ordinabile_e_segna_gli_scaduti(self):
        self.client.force_login(self.admin)
        res = self.client.get(
            reverse('admin:professioniste_professionista_changelist'),
            {'o': '7'},  # 7a colonna: "Scadenza abbonamento"
        )
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, '(scaduto)', count=2)
        # Per chi ha rinnovato conta l'ultima scadenza, quella futura
        rinnovata = next(p for p in res.context['cl'].result_list if p.nome == 'Rinnovata')
        self.assertGreater(rinnovata.ultima_scadenza, timezone.now())
