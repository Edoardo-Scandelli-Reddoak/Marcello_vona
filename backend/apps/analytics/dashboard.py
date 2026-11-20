"""Aggregati per la pagina "Analisi dati" dell'admin.

Tutto è calcolato on-demand dai modelli esistenti, con i filtri scelti in
pagina (periodo, provincia, città, categoria, tipo di piano). Le query
pesanti restano nel database (COUNT/SUM/GROUP BY); in Python facciamo solo
il raggruppamento di valori già aggregati (referer, sezioni del sito).

Convenzioni:
- "periodo" = intervallo [inizio, fine] scelto nei filtri, in ora italiana;
- ogni KPI ha anche il valore del periodo precedente di pari durata, per
  mostrare la variazione percentuale;
- i filtri provincia/città/categoria restringono tutto ciò che riguarda le
  escort (schede, abbonamenti, recensioni, preferiti, visite alle schede).
  Il traffico generale del sito non ha una città, quindi non viene filtrato.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any
from urllib.parse import urlparse

from django.db.models import (
    Avg, Case, CharField, Count, DurationField, ExpressionWrapper, F, Max, Min, Q, Sum, Value, When,
)
from django.db.models.functions import (
    ExtractHour, ExtractIsoWeekDay, TruncDay, TruncMonth, TruncWeek,
)
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento, PianoAbbonamento
from apps.accounts.models import User
from apps.notifiche.models import Notifica
from apps.preferiti.models import Preferito
from apps.professioniste.models import Categoria, Professionista
from apps.reviews.models import Recensione, RecensioneSito
from apps.sblocchi.models import SbloccoSocial

from .models import PageView


# ---------------------------------------------------------------------------
# Filtri
# ---------------------------------------------------------------------------

PRESET_PERIODI = (
    ('oggi', 'Oggi'),
    ('ieri', 'Ieri'),
    ('7', 'Ultimi 7 giorni'),
    ('30', 'Ultimi 30 giorni'),
    ('90', 'Ultimi 90 giorni'),
    ('mese', 'Questo mese'),
    ('mese_scorso', 'Mese scorso'),
    ('anno', "Quest'anno"),
    ('365', 'Ultimi 12 mesi'),
    ('tutto', 'Da sempre'),
    ('custom', 'Personalizzato'),
)

ORDINAMENTI_ESCORT = (
    ('visite', 'Visite alla scheda'),
    ('unici', 'Visitatori unici'),
    ('preferiti', 'Preferiti nel periodo'),
    ('recensioni', 'Recensioni nel periodo'),
    ('click', 'Click sul telefono (totale)'),
    ('incasso', 'Incasso nel periodo'),
    ('nome', 'Nome'),
)

# Data minima per "Da sempre": prima del lancio non ci sono dati.
_INIZIO_STORICO = date(2026, 1, 1)


@dataclass
class Filtri:
    inizio: date
    fine: date
    preset: str = '30'
    provincia: str = ''
    citta: str = ''
    categoria: str = ''
    tipo_piano: str = ''
    ordina: str = 'visite'
    errori: list[str] = field(default_factory=list)

    @property
    def giorni(self) -> int:
        return (self.fine - self.inizio).days + 1

    @property
    def precedente(self) -> tuple[date, date]:
        fine = self.inizio - timedelta(days=1)
        return fine - timedelta(days=self.giorni - 1), fine

    @property
    def filtra_escort(self) -> bool:
        return bool(self.provincia or self.citta or self.categoria)

    def as_querydict(self) -> dict[str, str]:
        d = {'periodo': self.preset, 'provincia': self.provincia, 'citta': self.citta,
             'categoria': self.categoria, 'tipo_piano': self.tipo_piano, 'ordina': self.ordina}
        if self.preset == 'custom':
            d['da'] = self.inizio.isoformat()
            d['a'] = self.fine.isoformat()
        return {k: v for k, v in d.items() if v}


def _parse_data(valore: str | None) -> date | None:
    if not valore:
        return None
    try:
        return date.fromisoformat(valore)
    except ValueError:
        return None


def parse_filtri(params, oggi: date | None = None) -> Filtri:
    """Legge i filtri dai parametri GET, con default sensati e mai un errore 500."""
    oggi = oggi or timezone.localdate()
    preset = params.get('periodo') or '30'
    if preset not in dict(PRESET_PERIODI):
        preset = '30'
    errori: list[str] = []

    if preset == 'oggi':
        inizio = fine = oggi
    elif preset == 'ieri':
        inizio = fine = oggi - timedelta(days=1)
    elif preset in ('7', '30', '90', '365'):
        inizio, fine = oggi - timedelta(days=int(preset) - 1), oggi
    elif preset == 'mese':
        inizio, fine = oggi.replace(day=1), oggi
    elif preset == 'mese_scorso':
        fine = oggi.replace(day=1) - timedelta(days=1)
        inizio = fine.replace(day=1)
    elif preset == 'anno':
        inizio, fine = oggi.replace(month=1, day=1), oggi
    elif preset == 'tutto':
        inizio, fine = _INIZIO_STORICO, oggi
    else:  # custom
        inizio = _parse_data(params.get('da'))
        fine = _parse_data(params.get('a'))
        if not inizio or not fine:
            errori.append('Per il periodo personalizzato indica sia la data di inizio sia quella di fine.')
            inizio, fine = oggi - timedelta(days=29), oggi
            preset = '30'
        elif inizio > fine:
            errori.append('La data di inizio era successiva a quella di fine: le ho invertite.')
            inizio, fine = fine, inizio
        if fine > oggi:
            fine = oggi
        if inizio > oggi:
            inizio = oggi

    ordina = params.get('ordina') or 'visite'
    if ordina not in dict(ORDINAMENTI_ESCORT):
        ordina = 'visite'
    tipo_piano = params.get('tipo_piano') or ''
    if tipo_piano not in dict(PianoAbbonamento.TIPO_CHOICES):
        tipo_piano = ''

    return Filtri(
        inizio=inizio, fine=fine, preset=preset,
        provincia=(params.get('provincia') or '').strip().upper()[:2],
        citta=(params.get('citta') or '').strip()[:200],
        categoria=(params.get('categoria') or '').strip()[:50],
        tipo_piano=tipo_piano, ordina=ordina, errori=errori,
    )


def opzioni_filtri() -> dict[str, Any]:
    """Valori disponibili nei menu a tendina dei filtri."""
    province = (
        Professionista.objects.exclude(provincia='')
        .values_list('provincia', flat=True).distinct().order_by('provincia')
    )
    citta = (
        Professionista.objects.exclude(citta='')
        .values_list('citta', flat=True).distinct().order_by('citta')
    )
    return {
        'periodi': PRESET_PERIODI,
        'province': sorted({p.upper() for p in province}),
        'citta': sorted({c.strip() for c in citta}, key=str.lower),
        'categorie': list(Categoria.objects.order_by('ordine', 'label').values('nome', 'label')),
        'tipi_piano': PianoAbbonamento.TIPO_CHOICES,
        'ordinamenti': ORDINAMENTI_ESCORT,
    }


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _range_dt(inizio: date, fine: date) -> tuple[datetime, datetime]:
    """[inizio 00:00, fine+1 00:00) in ora italiana, come datetime aware."""
    tz = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.combine(inizio, time.min), tz),
        timezone.make_aware(datetime.combine(fine + timedelta(days=1), time.min), tz),
    )


def _nel(campo: str, inizio: date, fine: date) -> Q:
    a, b = _range_dt(inizio, fine)
    return Q(**{f'{campo}__gte': a, f'{campo}__lt': b})


def _delta(attuale: float | int | None, precedente: float | int | None) -> float | None:
    """Variazione % rispetto al periodo precedente (None se non calcolabile)."""
    if attuale is None or precedente is None:
        return None
    if precedente == 0:
        return None if attuale == 0 else 100.0
    return round((attuale - precedente) / precedente * 100, 1)


def _kpi(label: str, attuale, precedente, formato: str = 'int', nota: str = '') -> dict[str, Any]:
    return {
        'label': label, 'valore': attuale, 'precedente': precedente,
        'delta': _delta(attuale, precedente), 'formato': formato, 'nota': nota,
    }


def _granularita(f: Filtri) -> str:
    if f.giorni <= 62:
        return 'giorno'
    if f.giorni <= 186:
        return 'settimana'
    return 'mese'


def _buckets(f: Filtri) -> list[date]:
    g = _granularita(f)
    out: list[date] = []
    if g == 'giorno':
        d = f.inizio
        while d <= f.fine:
            out.append(d)
            d += timedelta(days=1)
    elif g == 'settimana':
        d = f.inizio - timedelta(days=f.inizio.weekday())
        while d <= f.fine:
            out.append(d)
            d += timedelta(days=7)
    else:
        d = f.inizio.replace(day=1)
        while d <= f.fine:
            out.append(d)
            d = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
    return out


def _etichetta_bucket(d: date, g: str) -> str:
    if g == 'giorno':
        return d.strftime('%d/%m')
    if g == 'settimana':
        return 'sett. ' + d.strftime('%d/%m')
    mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
    return f'{mesi[d.month - 1]} {d.year % 100:02d}'


def _serie(qs, campo: str, f: Filtri, valore=None) -> list[float]:
    """Serie temporale (conteggio, o somma di `valore`) nei bucket del periodo."""
    g = _granularita(f)
    trunc = {'giorno': TruncDay, 'settimana': TruncWeek, 'mese': TruncMonth}[g]
    tz = timezone.get_current_timezone()
    rows = (
        qs.annotate(_b=trunc(campo, tzinfo=tz))
        .values('_b')
        .annotate(_v=valore if valore is not None else Count('pk'))
    )
    per_bucket: dict[date, float] = {}
    for r in rows:
        b = r['_b']
        if b is None:
            continue
        key = b.date() if isinstance(b, datetime) else b
        per_bucket[key] = per_bucket.get(key, 0) + (r['_v'] or 0)
    return [per_bucket.get(b, 0) for b in _buckets(f)]


def _top(qs, campo: str, n: int = 15, etichette: dict | None = None) -> list[dict[str, Any]]:
    rows = qs.values(campo).annotate(c=Count('pk')).order_by('-c', campo)[:n]
    return [
        {'label': (etichette or {}).get(r[campo], r[campo]) or '—', 'count': r['c']}
        for r in rows
    ]


def _percent(parte: int | float, totale: int | float) -> float | None:
    return round(parte / totale * 100, 1) if totale else None


# ---------------------------------------------------------------------------
# Classificazioni del traffico
# ---------------------------------------------------------------------------

_MOTORI = ('google.', 'bing.', 'duckduckgo.', 'yahoo.', 'ecosia.', 'yandex.', 'qwant.', 'startpage.', 'brave.')
_SOCIAL = ('facebook.', 'fb.', 'instagram.', 't.co', 'twitter.', 'x.com', 'tiktok.', 'telegram.', 't.me',
           'whatsapp.', 'reddit.', 'linkedin.', 'pinterest.', 'snapchat.', 'onlyfans.')
_DOMINIO_SITO = 'escort-bella.it'


def classifica_referer(referer: str) -> tuple[str, str]:
    """(canale, dominio) a partire dal referer."""
    if not referer:
        return 'Diretto', '(nessuno)'
    host = (urlparse(referer).hostname or '').lower()
    if host.startswith('www.'):
        host = host[4:]
    if not host:
        return 'Diretto', '(nessuno)'
    if host == _DOMINIO_SITO or host.endswith('.' + _DOMINIO_SITO) or host in ('localhost', '127.0.0.1'):
        return 'Interno', host
    if any(m in host for m in _MOTORI):
        return 'Motori di ricerca', host
    if any(host == s or host.startswith(s) or ('.' + s) in host for s in _SOCIAL):
        return 'Social e messaggistica', host
    return 'Altri siti', host


_SEZIONI_FISSE = {
    '': 'Home',
    'escort': 'Elenco escort',
    'login': 'Login e registrazione',
    'registrati': 'Login e registrazione',
    'registrazione': 'Login e registrazione',
    'password-dimenticata': 'Login e registrazione',
    'reimposta-password': 'Login e registrazione',
    'dashboard': 'Area personale',
    'abbonamento': 'Abbonamenti',
    'chi-siamo': 'Pagine informative',
    'privacy': 'Pagine informative',
    'termini': 'Pagine informative',
    'cookie': 'Pagine informative',
}


def sezione_path(path: str) -> str:
    parti = [p for p in (path or '/').split('?')[0].split('/') if p]
    if not parti:
        return 'Home'
    if parti[0] == 'escort' and len(parti) > 1:
        return 'Schede escort'
    return _SEZIONI_FISSE.get(parti[0], 'Pagine città / categoria')


def slug_scheda(path: str) -> str | None:
    parti = [p for p in (path or '').split('?')[0].split('/') if p]
    if len(parti) >= 2 and parti[0] == 'escort':
        return parti[1]
    return None


def _ua_dispositivo():
    ua = 'user_agent'
    return Case(
        When(Q(**{f'{ua}__icontains': 'ipad'}) | Q(**{f'{ua}__icontains': 'tablet'})
             | (Q(**{f'{ua}__icontains': 'android'}) & ~Q(**{f'{ua}__icontains': 'mobile'})),
             then=Value('Tablet')),
        When(Q(**{f'{ua}__icontains': 'mobi'}) | Q(**{f'{ua}__icontains': 'iphone'}), then=Value('Smartphone')),
        When(**{f'{ua}': ''}, then=Value('Sconosciuto')),
        default=Value('Computer'),
        output_field=CharField(),
    )


def _ua_browser():
    ua = 'user_agent'
    return Case(
        When(**{f'{ua}__icontains': 'edg'}, then=Value('Edge')),
        When(Q(**{f'{ua}__icontains': 'opr/'}) | Q(**{f'{ua}__icontains': 'opera'}), then=Value('Opera')),
        When(**{f'{ua}__icontains': 'samsungbrowser'}, then=Value('Samsung Internet')),
        When(Q(**{f'{ua}__icontains': 'instagram'}) | Q(**{f'{ua}__icontains': 'fban'})
             | Q(**{f'{ua}__icontains': 'fbav'}), then=Value('App social (Instagram/Facebook)')),
        When(Q(**{f'{ua}__icontains': 'firefox'}) | Q(**{f'{ua}__icontains': 'fxios'}), then=Value('Firefox')),
        When(Q(**{f'{ua}__icontains': 'chrome'}) | Q(**{f'{ua}__icontains': 'crios'}), then=Value('Chrome')),
        When(**{f'{ua}__icontains': 'safari'}, then=Value('Safari')),
        default=Value('Altro'),
        output_field=CharField(),
    )


def _ua_os():
    ua = 'user_agent'
    return Case(
        When(Q(**{f'{ua}__icontains': 'iphone'}) | Q(**{f'{ua}__icontains': 'ipad'}), then=Value('iOS')),
        When(**{f'{ua}__icontains': 'android'}, then=Value('Android')),
        When(**{f'{ua}__icontains': 'windows'}, then=Value('Windows')),
        When(**{f'{ua}__icontains': 'mac os'}, then=Value('macOS')),
        When(**{f'{ua}__icontains': 'linux'}, then=Value('Linux')),
        default=Value('Altro'),
        output_field=CharField(),
    )


def _distribuzione(qs, espressione) -> list[dict[str, Any]]:
    rows = qs.annotate(_k=espressione).values('_k').annotate(c=Count('pk')).order_by('-c')
    totale = sum(r['c'] for r in rows) or 0
    return [{'label': r['_k'], 'count': r['c'], 'pct': _percent(r['c'], totale)} for r in rows]


# ---------------------------------------------------------------------------
# Querysets base
# ---------------------------------------------------------------------------

def _schede(f: Filtri):
    qs = Professionista.objects.all()
    if f.provincia:
        qs = qs.filter(provincia__iexact=f.provincia)
    if f.citta:
        qs = qs.filter(citta__iexact=f.citta)
    if f.categoria:
        qs = qs.filter(categoria__nome=f.categoria)
    return qs


def _pagati(f: Filtri, schede):
    """Abbonamenti realmente pagati (esclusi omaggi), nell'ambito dei filtri."""
    qs = Abbonamento.objects.filter(paid_at__isnull=False, importo_centesimi__gt=0).exclude(payment_method='mock')
    if f.filtra_escort:
        qs = qs.filter(professionista__in=schede)
    if f.tipo_piano:
        qs = qs.filter(piano__tipo=f.tipo_piano)
    return qs


# ---------------------------------------------------------------------------
# Raccolta
# ---------------------------------------------------------------------------

def collect_stats(f: Filtri) -> dict[str, Any]:
    now = timezone.now()
    p_ini, p_fine = f.precedente
    periodo = lambda campo: _nel(campo, f.inizio, f.fine)  # noqa: E731
    prima = lambda campo: _nel(campo, p_ini, p_fine)  # noqa: E731
    g = _granularita(f)
    etichette = [_etichetta_bucket(b, g) for b in _buckets(f)]

    schede = _schede(f)
    schede_ids = schede.values('pk')

    # ======================= TRAFFICO ===================================
    pv = PageView.objects.all()
    pv_p = pv.filter(periodo('created_at'))
    pv_prev = pv.filter(prima('created_at'))
    visite = pv_p.count()
    visite_prev = pv_prev.count()
    unici = pv_p.values('ip_hash').distinct().count()
    unici_prev = pv_prev.values('ip_hash').distinct().count()
    inizio_dt, _ = _range_dt(f.inizio, f.fine)
    di_ritorno = (
        pv_p.filter(ip_hash__in=pv.filter(created_at__lt=inizio_dt).values('ip_hash'))
        .values('ip_hash').distinct().count()
    )

    serie_visite = _serie(pv_p, 'created_at', f)
    serie_unici = _serie(pv_p, 'created_at', f, valore=Count('ip_hash', distinct=True))

    # Pagine e sezioni (raggruppate in Python su valori già aggregati).
    per_path = list(pv_p.values('path').annotate(c=Count('pk'), u=Count('ip_hash', distinct=True)).order_by('-c'))
    top_pagine = [{'label': r['path'], 'count': r['c'], 'unici': r['u']} for r in per_path[:20]]
    sezioni: Counter = Counter()
    for r in per_path:
        sezioni[sezione_path(r['path'])] += r['c']
    sezioni_list = [{'label': k, 'count': v, 'pct': _percent(v, visite)} for k, v in sezioni.most_common()]

    # Provenienza
    canali: Counter = Counter()
    domini: Counter = Counter()
    for r in pv_p.values('referer').annotate(c=Count('pk')):
        canale, dominio = classifica_referer(r['referer'])
        canali[canale] += r['c']
        if canale not in ('Diretto', 'Interno'):
            domini[dominio] += r['c']
    canali_list = [{'label': k, 'count': v, 'pct': _percent(v, visite)} for k, v in canali.most_common()]
    domini_list = [{'label': k, 'count': v} for k, v in domini.most_common(15)]

    dispositivi = _distribuzione(pv_p, _ua_dispositivo())
    browser = _distribuzione(pv_p, _ua_browser())
    sistemi = _distribuzione(pv_p, _ua_os())

    ore = {r['h']: r['c'] for r in pv_p.annotate(h=ExtractHour('created_at')).values('h').annotate(c=Count('pk'))}
    per_ora = [ore.get(h, 0) for h in range(24)]
    gg = {r['d']: r['c'] for r in pv_p.annotate(d=ExtractIsoWeekDay('created_at')).values('d').annotate(c=Count('pk'))}
    per_giorno_settimana = [gg.get(d, 0) for d in range(1, 8)]

    # Visite alle schede escort (path /escort/<slug>)
    visite_schede: dict[str, dict[str, int]] = {}
    for r in (pv_p.filter(path__startswith='/escort/')
              .values('path').annotate(c=Count('pk'), u=Count('ip_hash', distinct=True))):
        slug = slug_scheda(r['path'])
        if not slug:
            continue
        d = visite_schede.setdefault(slug, {'visite': 0, 'unici': 0})
        d['visite'] += r['c']
        d['unici'] += r['u']  # approssimato se lo stesso slug ha più path
    slug_in_ambito = set(schede.values_list('slug', flat=True))
    visite_schede_tot = sum(v['visite'] for s, v in visite_schede.items() if s in slug_in_ambito)
    visite_schede_prev = 0
    for r in pv_prev.filter(path__startswith='/escort/').values('path').annotate(c=Count('pk')):
        if slug_scheda(r['path']) in slug_in_ambito:
            visite_schede_prev += r['c']

    # ======================= UTENTI =====================================
    u = User.objects.filter(is_staff=False)
    nuovi_clienti = u.filter(periodo('date_joined'), user_type='user').count()
    nuovi_clienti_prev = u.filter(prima('date_joined'), user_type='user').count()
    nuove_escort = u.filter(periodo('date_joined'), user_type='escort').count()
    nuove_escort_prev = u.filter(prima('date_joined'), user_type='escort').count()
    serie_reg_clienti = _serie(u.filter(periodo('date_joined'), user_type='user'), 'date_joined', f)
    serie_reg_escort = _serie(u.filter(periodo('date_joined'), user_type='escort'), 'date_joined', f)
    attivi = u.filter(periodo('last_login'))
    utenti = {
        'totali': u.count(),
        'clienti': u.filter(user_type='user').count(),
        'escort': u.filter(user_type='escort').count(),
        'attivi_clienti': attivi.filter(user_type='user').count(),
        'attivi_escort': attivi.filter(user_type='escort').count(),
        'mai_entrati': u.filter(last_login__isnull=True).count(),
    }

    # ======================= SCHEDE ESCORT ==============================
    visibili_ids = set(Professionista.objects.with_active_subscription().filter(pk__in=schede_ids)
                       .values_list('pk', flat=True))
    evidenza_ids = set(Professionista.objects.with_active_subscription('evidenza').filter(pk__in=schede_ids)
                       .values_list('pk', flat=True))
    stato_counts = {r['stato_approvazione']: r['c'] for r in
                    schede.values('stato_approvazione').annotate(c=Count('pk'))}
    approvate = stato_counts.get('approvata', 0)
    approvate_senza_abb = schede.filter(stato_approvazione='approvata', in_pausa=False).exclude(
        pk__in=visibili_ids).count()

    nuove_schede = schede.filter(periodo('created_at'))
    nuove_schede_n = nuove_schede.count()
    nuove_schede_prev = schede.filter(prima('created_at')).count()

    cat_label = dict(Categoria.objects.values_list('pk', 'label'))
    per_categoria = _top(schede, 'categoria', 20, cat_label)
    per_provincia = _top(schede.exclude(provincia=''), 'provincia', 20)
    per_citta = _top(schede.exclude(citta=''), 'citta', 20)
    per_disponibilita = _top(schede, 'disponibilita', 10, {**dict(Professionista.DISPONIBILITA_CHOICES), '': 'Non indicata'})

    tariffe = []
    for r in (schede.values('categoria').annotate(
            n=Count('pk'),
            m30=Avg('tariffa_30min'), m60=Avg('tariffa_1ora'),
            min60=Min('tariffa_1ora'), max60=Max('tariffa_1ora'),
    ).order_by('-n')):
        tariffe.append({
            'label': cat_label.get(r['categoria'], '—'), 'schede': r['n'],
            'media_30': round(r['m30']) if r['m30'] else None,
            'media_60': round(r['m60']) if r['m60'] else None,
            'min_60': r['min60'], 'max_60': r['max60'],
        })

    oggi = timezone.localdate()
    fasce_eta = Counter()
    for nascita in schede.exclude(data_nascita__isnull=True).values_list('data_nascita', flat=True):
        eta = oggi.year - nascita.year - ((oggi.month, oggi.day) < (nascita.month, nascita.day))
        fasce_eta['18–24' if eta < 25 else '25–29' if eta < 30 else '30–39' if eta < 40 else '40+'] += 1
    eta_list = [{'label': k, 'count': fasce_eta.get(k, 0)} for k in ('18–24', '25–29', '30–39', '40+')]

    tot_schede = schede.count()
    social = (Q(onlyfans_url__gt='') | Q(instagram_url__gt='') | Q(facebook_url__gt='')
              | Q(tiktok_url__gt='') | Q(telegram_url__gt=''))
    completezza_raw = schede.aggregate(
        galleria=Count('pk', filter=Q(galleria__isnull=False), distinct=True),
        video=Count('pk', filter=Q(video__isnull=False), distinct=True),
        social=Count('pk', filter=social, distinct=True),
        mappa=Count('pk', filter=Q(latitudine__isnull=False), distinct=True),
        bio=Count('pk', filter=~Q(bio=''), distinct=True),
        tag=Count('pk', filter=Q(tags__isnull=False), distinct=True),
    )
    completezza = [
        {'label': lbl, 'count': completezza_raw[k], 'pct': _percent(completezza_raw[k], tot_schede)}
        for k, lbl in (('galleria', 'Con foto in galleria'), ('video', 'Con almeno un video'),
                       ('social', 'Con almeno un social'), ('bio', 'Con descrizione'),
                       ('tag', 'Con tag'), ('mappa', 'Con posizione sulla mappa'))
    ]

    verifica = schede.filter(periodo('created_at'), data_verifica__gte=F('created_at')).aggregate(
        m=Avg(ExpressionWrapper(F('data_verifica') - F('created_at'), output_field=DurationField())))['m']
    ore_verifica = round(verifica.total_seconds() / 3600, 1) if verifica else None

    schede_stats = {
        'totali': tot_schede,
        'approvate': approvate,
        'in_attesa': stato_counts.get('in_attesa', 0),
        'rifiutate': stato_counts.get('rifiutata', 0),
        'in_pausa': schede.filter(in_pausa=True).count(),
        'visibili': len(visibili_ids),
        'in_evidenza': len(evidenza_ids),
        'approvate_senza_abbonamento': approvate_senza_abb,
        'click_telefono': schede.aggregate(s=Sum('click_telefono'))['s'] or 0,
        'ore_medie_verifica': ore_verifica,
    }
    serie_nuove_schede = _serie(nuove_schede, 'created_at', f)

    # ======================= ABBONAMENTI E INCASSI ======================
    pagati = _pagati(f, schede)
    pag_p = pagati.filter(periodo('paid_at'))
    pag_prev = pagati.filter(prima('paid_at'))
    incasso = (pag_p.aggregate(s=Sum('importo_centesimi'))['s'] or 0) / 100
    incasso_prev = (pag_prev.aggregate(s=Sum('importo_centesimi'))['s'] or 0) / 100
    n_pagamenti = pag_p.count()
    n_pagamenti_prev = pag_prev.count()
    serie_incassi = [v / 100 for v in _serie(pag_p, 'paid_at', f, valore=Sum('importo_centesimi'))]

    per_piano = [
        {'label': f"{r['piano__nome']} ({dict(PianoAbbonamento.TIPO_CHOICES).get(r['piano__tipo'], r['piano__tipo'])})",
         'count': r['c'], 'euro': (r['s'] or 0) / 100}
        for r in pag_p.values('piano__nome', 'piano__tipo').annotate(c=Count('pk'), s=Sum('importo_centesimi')).order_by('-s')
    ]

    abb_ambito = Abbonamento.objects.all()
    if f.filtra_escort:
        abb_ambito = abb_ambito.filter(professionista__in=schede)
    if f.tipo_piano:
        abb_ambito = abb_ambito.filter(piano__tipo=f.tipo_piano)
    attivi_ora = abb_ambito.filter(stato='attivo', scadenza__gt=now)
    omaggi = abb_ambito.filter(periodo('created_at')).filter(Q(payment_method='mock') | Q(importo_centesimi=0)).exclude(stato='in_attesa').count()

    richieste = abb_ambito.filter(periodo('created_at'), payment_method='manuale')
    richieste_n = richieste.count()
    richieste_pagate = richieste.filter(paid_at__isnull=False).count()

    in_scadenza = list(
        attivi_ora.filter(scadenza__lte=now + timedelta(days=7))
        .select_related('professionista', 'piano').order_by('scadenza')[:30]
    )

    # Rinnovi: escort con un abbonamento pagato scaduto nel periodo; "rinnovata"
    # se dopo quel pagamento ne ha fatto almeno un altro.
    scaduti = abb_ambito.filter(periodo('scadenza'), scadenza__lte=now, paid_at__isnull=False)
    pagamento_scaduto: dict[int, datetime] = {}
    for prof_id, pagato in scaduti.order_by('scadenza').values_list('professionista_id', 'paid_at'):
        pagamento_scaduto.setdefault(prof_id, pagato)
    escort_scadute = set(pagamento_scaduto)
    rinnovate = 0
    if escort_scadute:
        for prof_id, ultima_pagata in (Abbonamento.objects.filter(professionista_id__in=escort_scadute,
                                                                  paid_at__isnull=False)
                                       .values('professionista_id').annotate(m=Max('paid_at'))
                                       .values_list('professionista_id', 'm')):
            if ultima_pagata > pagamento_scaduto[prof_id]:
                rinnovate += 1

    clienti_paganti = pag_p.values('professionista_id').distinct().count()
    storico = pagati.aggregate(s=Sum('importo_centesimi'), n=Count('pk'))
    abbonamenti = {
        'attivi_ora': attivi_ora.count(),
        'attivi_standard': attivi_ora.filter(piano__tipo='standard').count(),
        'attivi_evidenza': attivi_ora.filter(piano__tipo='evidenza').count(),
        'omaggi': omaggi,
        'richieste': richieste_n,
        'richieste_pagate': richieste_pagate,
        'conversione_richieste': _percent(richieste_pagate, richieste_n),
        'scontrino_medio': round(incasso / n_pagamenti, 2) if n_pagamenti else None,
        'escort_paganti': clienti_paganti,
        'incasso_per_escort': round(incasso / clienti_paganti, 2) if clienti_paganti else None,
        'scaduti_nel_periodo': len(escort_scadute),
        'rinnovati': rinnovate,
        'tasso_rinnovo': _percent(rinnovate, len(escort_scadute)),
        'incasso_storico': (storico['s'] or 0) / 100,
        'pagamenti_storici': storico['n'],
        'per_piano': per_piano,
        'in_scadenza': [
            {'id': a.pk, 'prof_id': a.professionista_id, 'nome': a.professionista.nome,
             'piano': a.piano.nome, 'scadenza': timezone.localtime(a.scadenza)}
            for a in in_scadenza
        ],
    }

    sblocchi_p = SbloccoSocial.objects.filter(attivo=True).filter(periodo('created_at'))
    if f.filtra_escort:
        sblocchi_p = sblocchi_p.filter(professionista__in=schede)
    sblocchi = {
        'periodo': sblocchi_p.count(),
        'euro': (sblocchi_p.aggregate(s=Sum('importo_centesimi'))['s'] or 0) / 100,
    }

    # ======================= ENGAGEMENT =================================
    rec = Recensione.objects.all()
    pref = Preferito.objects.all()
    if f.filtra_escort:
        rec = rec.filter(professionista__in=schede)
        pref = pref.filter(professionista__in=schede)
    rec_p = rec.filter(periodo('created_at'))
    rec_n = rec_p.count()
    rec_prev = rec.filter(prima('created_at')).count()
    rec_media = rec_p.aggregate(m=Avg('stelle'))['m']
    stelle = {r['stelle']: r['c'] for r in rec_p.values('stelle').annotate(c=Count('pk'))}
    risposte = rec_p.exclude(risposta_escort='').count()
    tempo_risposta = rec_p.filter(risposta_at__gte=F('created_at')).aggregate(
        m=Avg(ExpressionWrapper(F('risposta_at') - F('created_at'), output_field=DurationField())))['m']
    pref_p = pref.filter(periodo('created_at'))
    pref_n = pref_p.count()
    pref_prev = pref.filter(prima('created_at')).count()
    notifiche_p = Notifica.objects.filter(periodo('created_at'))
    notifiche_n = notifiche_p.count()

    engagement = {
        'recensioni': rec_n,
        'recensioni_media': round(rec_media, 2) if rec_media else None,
        'recensioni_stelle': [stelle.get(s, 0) for s in range(1, 6)],
        'recensioni_risposte_pct': _percent(risposte, rec_n),
        'ore_medie_risposta': round(tempo_risposta.total_seconds() / 3600, 1) if tempo_risposta else None,
        'recensioni_totali': rec.count(),
        'preferiti': pref_n,
        'preferiti_totali': pref.count(),
        'clienti_con_preferiti': pref_p.values('user_id').distinct().count(),
        'notifiche': notifiche_n,
        'notifiche_lette_pct': _percent(notifiche_p.filter(letta=True).count(), notifiche_n),
        'recensioni_sito': RecensioneSito.objects.filter(attiva=True).count(),
        'recensioni_sito_media': (lambda m: round(m, 2) if m else None)(
            RecensioneSito.objects.filter(attiva=True).aggregate(m=Avg('stelle'))['m']),
    }
    serie_recensioni = _serie(rec_p, 'created_at', f)
    serie_preferiti = _serie(pref_p, 'created_at', f)

    # ======================= FUNNEL ESCORT ==============================
    visitatori_registrazione = pv_p.filter(
        Q(path__startswith='/registrati') | Q(path__startswith='/registrazione')
    ).values('ip_hash').distinct().count()
    schede_create = nuove_schede_n
    schede_create_approvate = nuove_schede.filter(stato_approvazione='approvata').count()
    # Sottoquery, non exclude() sulla relazione: una scheda con un omaggio E un
    # abbonamento pagato verrebbe altrimenti scartata del tutto.
    pagamenti_reali = Abbonamento.objects.filter(
        paid_at__isnull=False, importo_centesimi__gt=0).exclude(payment_method='mock')
    schede_create_paganti = nuove_schede.filter(
        pk__in=pagamenti_reali.values('professionista_id')).count()
    funnel = [
        {'label': 'Visitatori delle pagine di registrazione', 'count': visitatori_registrazione},
        {'label': 'Account escort creati', 'count': nuove_escort},
        {'label': 'Schede compilate', 'count': schede_create},
        {'label': 'Schede approvate', 'count': schede_create_approvate},
        {'label': 'Schede con almeno un abbonamento pagato', 'count': schede_create_paganti},
    ]
    base = funnel[0]['count'] or None
    for i, step in enumerate(funnel):
        step['pct_inizio'] = _percent(step['count'], base) if base else None
        step['pct_prec'] = _percent(step['count'], funnel[i - 1]['count']) if i else None

    # ======================= KPI DI SINTESI =============================
    kpi = [
        _kpi('Visite', visite, visite_prev),
        _kpi('Visitatori unici', unici, unici_prev),
        _kpi('Visite alle schede escort', visite_schede_tot, visite_schede_prev),
        _kpi('Nuovi clienti registrati', nuovi_clienti, nuovi_clienti_prev),
        _kpi('Nuove escort registrate', nuove_escort, nuove_escort_prev),
        _kpi('Nuove schede', nuove_schede_n, nuove_schede_prev),
        _kpi('Incassi abbonamenti', incasso, incasso_prev, 'euro'),
        _kpi('Pagamenti ricevuti', n_pagamenti, n_pagamenti_prev),
        _kpi('Recensioni', rec_n, rec_prev),
        _kpi('Preferiti aggiunti', pref_n, pref_prev),
    ]

    return {
        'periodo': {
            'inizio': f.inizio, 'fine': f.fine, 'giorni': f.giorni,
            'prec_inizio': p_ini, 'prec_fine': p_fine, 'granularita': g,
        },
        'kpi': kpi,
        'grafici': {
            'etichette': etichette,
            'visite': serie_visite,
            'unici': serie_unici,
            'reg_clienti': serie_reg_clienti,
            'reg_escort': serie_reg_escort,
            'nuove_schede': serie_nuove_schede,
            'incassi': serie_incassi,
            'recensioni': serie_recensioni,
            'preferiti': serie_preferiti,
            'per_ora': per_ora,
            'per_giorno_settimana': per_giorno_settimana,
        },
        'traffico': {
            'visite': visite,
            'unici': unici,
            'di_ritorno': di_ritorno,
            'di_ritorno_pct': _percent(di_ritorno, unici),
            'pagine_per_visitatore': round(visite / unici, 2) if unici else None,
            'top_pagine': top_pagine,
            'sezioni': sezioni_list,
            'canali': canali_list,
            'domini': domini_list,
            'dispositivi': dispositivi,
            'browser': browser,
            'sistemi': sistemi,
        },
        'utenti': utenti,
        'schede': schede_stats,
        'per_categoria': per_categoria,
        'per_provincia': per_provincia,
        'per_citta': per_citta,
        'per_disponibilita': per_disponibilita,
        'tariffe': tariffe,
        'eta': eta_list,
        'completezza': completezza,
        'abbonamenti': abbonamenti,
        'sblocchi': sblocchi,
        'engagement': engagement,
        'funnel': funnel,
        'classifica': classifica_escort(f, schede, visite_schede),
    }


# ---------------------------------------------------------------------------
# Classifica escort (tabella + export CSV)
# ---------------------------------------------------------------------------

def classifica_escort(f: Filtri, schede=None, visite_schede: dict | None = None) -> list[dict[str, Any]]:
    """Una riga per scheda escort con le sue metriche nel periodo."""
    now = timezone.now()
    schede = schede if schede is not None else _schede(f)
    a, b = _range_dt(f.inizio, f.fine)

    if visite_schede is None:
        visite_schede = {}
        for r in (PageView.objects.filter(created_at__gte=a, created_at__lt=b, path__startswith='/escort/')
                  .values('path').annotate(c=Count('pk'), u=Count('ip_hash', distinct=True))):
            slug = slug_scheda(r['path'])
            if slug:
                d = visite_schede.setdefault(slug, {'visite': 0, 'unici': 0})
                d['visite'] += r['c']
                d['unici'] += r['u']

    nel = Q(created_at__gte=a, created_at__lt=b)
    pagati_filter = (Q(abbonamenti__paid_at__gte=a, abbonamenti__paid_at__lt=b,
                       abbonamenti__importo_centesimi__gt=0)
                     & ~Q(abbonamenti__payment_method='mock'))
    if f.tipo_piano:
        pagati_filter &= Q(abbonamenti__piano__tipo=f.tipo_piano)

    # Le annotazioni su relazioni diverse si moltiplicano tra loro nelle JOIN:
    # le calcolo in query separate e le unisco per id.
    pref = dict(schede.annotate(c=Count('preferito_da', filter=Q(preferito_da__created_at__gte=a,
                                                                  preferito_da__created_at__lt=b)))
                .values_list('pk', 'c'))
    pref_tot = dict(schede.annotate(c=Count('preferito_da')).values_list('pk', 'c'))
    rec = {r['pk']: r for r in schede.annotate(
        n=Count('recensioni', filter=Q(recensioni__created_at__gte=a, recensioni__created_at__lt=b)),
        m=Avg('recensioni__stelle'), tot=Count('recensioni'),
    ).values('pk', 'n', 'm', 'tot')}
    incassi = dict(schede.annotate(s=Sum('abbonamenti__importo_centesimi', filter=pagati_filter))
                   .values_list('pk', 's'))
    abb_attivo = {}
    for ab in (Abbonamento.objects.filter(professionista__in=schede, stato='attivo', scadenza__gt=now)
               .select_related('piano').order_by('scadenza')):
        attuale = abb_attivo.get(ab.professionista_id)
        # Se ne ha due attivi mostro quello "evidenza", che vale di più.
        if attuale is None or ab.piano.tipo == 'evidenza':
            abb_attivo[ab.professionista_id] = ab

    stati = dict(Professionista.STATO_CHOICES)
    righe = []
    for p in schede.select_related('categoria').only(
            'pk', 'nome', 'slug', 'citta', 'provincia', 'categoria__label', 'stato_approvazione',
            'in_pausa', 'click_telefono', 'created_at'):
        v = visite_schede.get(p.slug, {'visite': 0, 'unici': 0})
        r = rec.get(p.pk, {})
        ab = abb_attivo.get(p.pk)
        righe.append({
            'id': p.pk,
            'nome': p.nome,
            'slug': p.slug,
            'citta': p.citta,
            'provincia': p.provincia,
            'categoria': p.categoria.label if p.categoria_id else '',
            'stato': stati.get(p.stato_approvazione, p.stato_approvazione),
            'in_pausa': p.in_pausa,
            'abbonamento': f"{ab.piano.get_tipo_display()} fino al {timezone.localtime(ab.scadenza):%d/%m/%Y}" if ab else '',
            'visite': v['visite'],
            'unici': v['unici'],
            'preferiti': pref.get(p.pk, 0),
            'preferiti_totali': pref_tot.get(p.pk, 0),
            'recensioni': r.get('n', 0),
            'recensioni_totali': r.get('tot', 0),
            'media_stelle': round(r['m'], 1) if r.get('m') else None,
            'click': p.click_telefono,
            'incasso': (incassi.get(p.pk) or 0) / 100,
            'iscritta_il': timezone.localtime(p.created_at).date(),
        })

    chiave = {
        'visite': lambda r: (-r['visite'], -r['unici'], r['nome'].lower()),
        'unici': lambda r: (-r['unici'], -r['visite'], r['nome'].lower()),
        'preferiti': lambda r: (-r['preferiti'], -r['preferiti_totali'], r['nome'].lower()),
        'recensioni': lambda r: (-r['recensioni'], -r['recensioni_totali'], r['nome'].lower()),
        'click': lambda r: (-r['click'], r['nome'].lower()),
        'incasso': lambda r: (-r['incasso'], r['nome'].lower()),
        'nome': lambda r: r['nome'].lower(),
    }[f.ordina]
    righe.sort(key=chiave)
    return righe


COLONNE_CSV = (
    ('nome', 'Nome'), ('categoria', 'Categoria'), ('citta', 'Città'), ('provincia', 'Provincia'),
    ('stato', 'Stato'), ('in_pausa', 'In pausa'), ('abbonamento', 'Abbonamento attivo'),
    ('visite', 'Visite scheda (periodo)'), ('unici', 'Visitatori unici (periodo)'),
    ('preferiti', 'Preferiti (periodo)'), ('preferiti_totali', 'Preferiti (totali)'),
    ('recensioni', 'Recensioni (periodo)'), ('recensioni_totali', 'Recensioni (totali)'),
    ('media_stelle', 'Media stelle'), ('click', 'Click telefono (totali)'),
    ('incasso', 'Incasso € (periodo)'), ('iscritta_il', 'Iscritta il'),
)
