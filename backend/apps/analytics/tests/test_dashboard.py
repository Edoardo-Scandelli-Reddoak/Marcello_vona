"""Pagina admin "Analisi dati": filtri, numeri, export CSV e permessi."""

from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento, PianoAbbonamento
from apps.analytics.dashboard import (
    classifica_escort, classifica_referer, collect_stats, parse_filtri, sezione_path, slug_scheda,
)
from apps.analytics.models import PageView
from apps.preferiti.models import Preferito
from apps.professioniste.models import Categoria, Professionista
from apps.reviews.models import Recensione

User = get_user_model()
URL = '/admin/analytics/'


class ParseFiltriTest(TestCase):
    oggi = date(2026, 11, 20)

    def test_default_ultimi_30_giorni(self):
        f = parse_filtri({}, oggi=self.oggi)
        self.assertEqual((f.inizio, f.fine, f.giorni), (date(2026, 10, 22), self.oggi, 30))
        self.assertEqual(f.precedente, (date(2026, 9, 22), date(2026, 10, 21)))

    def test_mese_scorso(self):
        f = parse_filtri({'periodo': 'mese_scorso'}, oggi=self.oggi)
        self.assertEqual((f.inizio, f.fine), (date(2026, 10, 1), date(2026, 10, 31)))

    def test_personalizzato_invertito(self):
        f = parse_filtri({'periodo': 'custom', 'da': '2026-11-10', 'a': '2026-11-01'}, oggi=self.oggi)
        self.assertEqual((f.inizio, f.fine), (date(2026, 11, 1), date(2026, 11, 10)))
        self.assertTrue(f.errori)

    def test_personalizzato_incompleto_torna_ai_30_giorni(self):
        f = parse_filtri({'periodo': 'custom', 'da': 'boh'}, oggi=self.oggi)
        self.assertEqual(f.preset, '30')
        self.assertTrue(f.errori)

    def test_valori_strani_ignorati(self):
        f = parse_filtri({'periodo': 'xyz', 'ordina': 'drop table', 'tipo_piano': 'oro', 'provincia': 'rmx'},
                         oggi=self.oggi)
        self.assertEqual((f.preset, f.ordina, f.tipo_piano, f.provincia), ('30', 'visite', '', 'RM'))


class ClassificazioniTest(TestCase):
    def test_referer(self):
        self.assertEqual(classifica_referer('')[0], 'Diretto')
        self.assertEqual(classifica_referer('https://www.google.it/')[0], 'Motori di ricerca')
        self.assertEqual(classifica_referer('https://l.instagram.com/?u=x')[0], 'Social e messaggistica')
        self.assertEqual(classifica_referer('https://t.co/abc')[0], 'Social e messaggistica')
        self.assertEqual(classifica_referer('https://escort-bella.it/escort')[0], 'Interno')
        self.assertEqual(classifica_referer('https://forum.example.org/x'), ('Altri siti', 'forum.example.org'))

    def test_sezioni(self):
        self.assertEqual(sezione_path('/'), 'Home')
        self.assertEqual(sezione_path('/escort'), 'Elenco escort')
        self.assertEqual(sezione_path('/escort/giulia-roma'), 'Schede escort')
        self.assertEqual(sezione_path('/roma'), 'Pagine città / categoria')
        self.assertEqual(sezione_path('/dashboard/utente'), 'Area personale')
        self.assertEqual(slug_scheda('/escort/giulia-roma'), 'giulia-roma')
        self.assertIsNone(slug_scheda('/escort'))


@override_settings(STORAGES={
    **settings.STORAGES,
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class DashboardDatiTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(username='admin', email='admin@example.com', password='x')
        cls.donna = Categoria.objects.create(nome='donna', label='Donna')
        cls.trans = Categoria.objects.create(nome='trans', label='Trans')
        cls.piano = PianoAbbonamento.objects.create(tipo='standard', nome='30 giorni', durata_giorni=30,
                                                    prezzo_centesimi=5000)
        cls.piano_evi = PianoAbbonamento.objects.create(tipo='evidenza', nome='Evidenza 7', durata_giorni=7,
                                                        prezzo_centesimi=3000)
        now = timezone.now()

        def escort(nome, citta, prov, cat):
            return Professionista.objects.create(
                user=User.objects.create_user(username=nome, email=f'{nome}@example.com', password='x',
                                              user_type='escort'),
                nome=nome, categoria=cat, telefono='3330000000', via='Via 1', citta=citta, provincia=prov,
                stato_approvazione='approvata', foto_profilo='p.jpg', documento_fronte='f.jpg',
                documento_retro='r.jpg', tariffa_1ora=150, click_telefono=4,
            )

        cls.giulia = escort('Giulia', 'Roma', 'RM', cls.donna)
        cls.sara = escort('Sara', 'Milano', 'MI', cls.trans)
        cls.cliente = User.objects.create_user(username='c', email='c@example.com', password='x')

        def abb(prof, piano, importo, pagato_giorni_fa, scade_tra, metodo='manuale'):
            return Abbonamento.objects.create(
                professionista=prof, piano=piano, stato='attivo' if scade_tra > 0 else 'scaduto',
                importo_centesimi=importo, payment_method=metodo,
                paid_at=now - timedelta(days=pagato_giorni_fa),
                inizio=now - timedelta(days=pagato_giorni_fa),
                scadenza=now + timedelta(days=scade_tra),
            )

        abb(cls.giulia, cls.piano, 5000, 2, 28)
        abb(cls.sara, cls.piano_evi, 3000, 5, 2)
        abb(cls.sara, cls.piano, 0, 1, 29, metodo='mock')       # omaggio: non è un incasso
        abb(cls.giulia, cls.piano, 5000, 100, -70)               # pagato fuori periodo

        for i in range(3):
            PageView.objects.create(path=f'/escort/{cls.giulia.slug}', ip_hash=f'ip{i}',
                                    user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile Safari',
                                    referer='https://www.google.com/')
        PageView.objects.create(path=f'/escort/{cls.sara.slug}', ip_hash='ip0',
                                user_agent='Mozilla/5.0 (Windows NT 10.0) Chrome/120', referer='')
        PageView.objects.create(path='/', ip_hash='ip9', user_agent='Mozilla/5.0 (Windows NT 10.0) Chrome/120')

        Preferito.objects.create(user=cls.cliente, professionista=cls.giulia)
        Recensione.objects.create(professionista=cls.giulia, autore=cls.cliente, stelle=5, testo='Top')

    def kpi(self, stats, label):
        return next(k for k in stats['kpi'] if k['label'] == label)

    def test_numeri_principali(self):
        s = collect_stats(parse_filtri({'periodo': '30'}))
        self.assertEqual(self.kpi(s, 'Visite')['valore'], 5)
        self.assertEqual(self.kpi(s, 'Visitatori unici')['valore'], 4)
        self.assertEqual(self.kpi(s, 'Visite alle schede escort')['valore'], 4)
        self.assertEqual(self.kpi(s, 'Incassi abbonamenti')['valore'], 80.0)   # 50 + 30, no omaggio
        self.assertEqual(self.kpi(s, 'Pagamenti ricevuti')['valore'], 2)
        self.assertEqual(s['abbonamenti']['omaggi'], 1)
        self.assertEqual(s['abbonamenti']['attivi_ora'], 3)
        self.assertEqual(s['abbonamenti']['incasso_storico'], 130.0)
        self.assertEqual(len(s['abbonamenti']['in_scadenza']), 1)
        self.assertEqual(s['schede']['visibili'], 2)
        self.assertEqual(s['schede']['click_telefono'], 8)
        self.assertEqual(s['engagement']['recensioni'], 1)
        self.assertEqual(s['engagement']['preferiti'], 1)
        canali = {c['label']: c['count'] for c in s['traffico']['canali']}
        self.assertEqual(canali, {'Motori di ricerca': 3, 'Diretto': 2})
        dispositivi = {d['label']: d['count'] for d in s['traffico']['dispositivi']}
        self.assertEqual(dispositivi, {'Smartphone': 3, 'Computer': 2})
        self.assertEqual(sum(s['grafici']['visite']), 5)
        self.assertEqual(len(s['grafici']['visite']), 30)

    def test_funnel_conta_chi_ha_anche_un_omaggio(self):
        # Sara ha un omaggio e un abbonamento pagato: è una scheda pagante.
        s = collect_stats(parse_filtri({'periodo': '30'}))
        self.assertEqual(s['funnel'][-1]['count'], 2)

    def test_filtro_citta(self):
        s = collect_stats(parse_filtri({'citta': 'roma'}))
        self.assertEqual(s['schede']['totali'], 1)
        self.assertEqual(self.kpi(s, 'Incassi abbonamenti')['valore'], 50.0)
        self.assertEqual(self.kpi(s, 'Visite alle schede escort')['valore'], 3)
        self.assertEqual([r['nome'] for r in s['classifica']], ['Giulia'])
        # Il traffico generale resta complessivo.
        self.assertEqual(self.kpi(s, 'Visite')['valore'], 5)

    def test_filtro_categoria_e_tipo_piano(self):
        s = collect_stats(parse_filtri({'categoria': 'trans', 'tipo_piano': 'evidenza'}))
        self.assertEqual(s['schede']['totali'], 1)
        self.assertEqual(self.kpi(s, 'Incassi abbonamenti')['valore'], 30.0)

    def test_classifica_ordinata_e_completa(self):
        righe = classifica_escort(parse_filtri({'ordina': 'visite'}))
        self.assertEqual([r['nome'] for r in righe], ['Giulia', 'Sara'])
        g = righe[0]
        self.assertEqual((g['visite'], g['unici'], g['preferiti'], g['recensioni'], g['incasso']),
                         (3, 3, 1, 1, 50.0))
        righe = classifica_escort(parse_filtri({'ordina': 'incasso'}))
        self.assertEqual(righe[0]['nome'], 'Giulia')

    def test_periodo_vuoto_non_rompe(self):
        s = collect_stats(parse_filtri({'periodo': 'custom', 'da': '2026-01-01', 'a': '2026-01-03'}))
        self.assertEqual(self.kpi(s, 'Visite')['valore'], 0)
        self.assertIsNone(s['abbonamenti']['scontrino_medio'])

    def test_periodo_lungo_raggruppa_per_mese(self):
        s = collect_stats(parse_filtri({'periodo': 'tutto'}))
        self.assertEqual(s['periodo']['granularita'], 'mese')
        self.assertEqual(sum(s['grafici']['incassi']), 130.0)

    def test_pagina_admin(self):
        self.client.force_login(self.admin)
        for params in ({}, {'periodo': '7', 'provincia': 'RM'}, {'periodo': '365'}, {'periodo': 'tutto'},
                       {'periodo': 'custom', 'da': '2026-11-01', 'a': '2026-11-15', 'ordina': 'nome'}):
            r = self.client.get(URL, params)
            self.assertEqual(r.status_code, 200, params)
        self.assertContains(r, 'Classifica escort')
        self.assertContains(r, 'Giulia')

    def test_export_csv(self):
        self.client.force_login(self.admin)
        r = self.client.get(URL, {'export': 'escort', 'ordina': 'nome'})
        self.assertEqual(r.status_code, 200)
        self.assertIn('attachment', r['Content-Disposition'])
        righe = r.content.decode('utf-8-sig').strip().splitlines()
        self.assertEqual(len(righe), 3)
        self.assertTrue(righe[0].startswith('Nome;Categoria;'))
        self.assertTrue(righe[1].startswith('Giulia;Donna;Roma;RM;'))
        self.assertIn('50,00', righe[1])

    def test_solo_staff(self):
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 302)
        self.client.force_login(self.cliente)
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 302)
