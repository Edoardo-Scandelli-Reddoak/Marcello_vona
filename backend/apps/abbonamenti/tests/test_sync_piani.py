"""`sync_piani` gira a ogni deploy: non deve mai toccare i piani esistenti.

I prezzi si gestiscono dall'admin. In produzione l'admin ha creato un listino
nuovo (stessi tipo+durata dei vecchi, prezzi diversi) e disattivato i vecchi,
che restano perche' hanno abbonamenti collegati. Il comando faceva
update_or_create su (tipo, durata): coi doppioni andava in errore, e senza
doppioni avrebbe riscritto i prezzi dell'admin col listino del codice.
"""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.abbonamenti.models import PianoAbbonamento, Promozione


def sync():
    call_command('sync_piani', stdout=StringIO())


class SyncPianiTest(TestCase):
    def setUp(self):
        # Parto da zero, non dal seed della migration 0002.
        PianoAbbonamento.objects.all().delete()

    def test_con_piani_doppi_come_in_produzione_non_va_in_errore_e_non_tocca_nulla(self):
        vecchio = PianoAbbonamento.objects.create(
            tipo='standard', durata_giorni=1, nome='1 giorno',
            prezzo_centesimi=1990, sconto_percentuale=50, attivo=False,
        )
        nuovo = PianoAbbonamento.objects.create(
            tipo='standard', durata_giorni=1, nome='1 GIORNO',
            prezzo_centesimi=300, sconto_percentuale=0, attivo=True,
        )
        sync()
        vecchio.refresh_from_db()
        nuovo.refresh_from_db()
        self.assertEqual((vecchio.prezzo_centesimi, vecchio.attivo), (1990, False))
        self.assertEqual((nuovo.nome, nuovo.prezzo_centesimi, nuovo.sconto_percentuale, nuovo.attivo),
                         ('1 GIORNO', 300, 0, True))
        self.assertEqual(PianoAbbonamento.objects.filter(tipo='standard', durata_giorni=1).count(), 2)

    def test_non_riscrive_il_prezzo_impostato_dall_admin(self):
        piano = PianoAbbonamento.objects.create(
            tipo='standard', durata_giorni=30, nome='30 GIORNI', prezzo_centesimi=990,
        )
        sync()
        piano.refresh_from_db()
        self.assertEqual((piano.nome, piano.prezzo_centesimi), ('30 GIORNI', 990))

    def test_non_riattiva_un_piano_disattivato_dall_admin(self):
        piano = PianoAbbonamento.objects.create(
            tipo='standard', durata_giorni=60, nome='60 giorni', prezzo_centesimi=45000, attivo=False,
        )
        sync()
        piano.refresh_from_db()
        self.assertFalse(piano.attivo)

    def test_non_cancella_un_piano_fuori_listino_creato_dall_admin(self):
        piano = PianoAbbonamento.objects.create(
            tipo='standard', durata_giorni=45, nome='45 GIORNI', prezzo_centesimi=1500,
        )
        sync()
        self.assertTrue(PianoAbbonamento.objects.filter(pk=piano.pk, attivo=True).exists())

    def test_su_database_vuoto_crea_il_listino(self):
        sync()
        self.assertEqual(PianoAbbonamento.objects.count(), 11)
        self.assertTrue(PianoAbbonamento.objects.filter(tipo='standard', durata_giorni=365).exists())

    def test_crea_la_promozione_di_default_se_manca(self):
        Promozione.objects.all().delete()
        sync()
        self.assertEqual(Promozione.objects.count(), 1)
        self.assertFalse(Promozione.objects.get().attiva)
