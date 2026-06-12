"""Aggregati per la pagina "Analisi dati" dell'admin.

Tutto è derivato da modelli esistenti — niente cron, niente cache: la
pagina è amministrativa e la facciamo eseguire on-demand. Se le tabelle
crescono molto (>1M righe PageView) si può aggiungere caching o
denormalizzazione, ma per ora le query sono indicizzate e veloci.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento
from apps.accounts.models import User
from apps.professioniste.models import Professionista
from apps.reviews.models import Recensione, RecensioneSito
from apps.sblocchi.models import SbloccoSocial

from .models import PageView


def _since(days: int):
    return timezone.now() - timedelta(days=days)


def _bucket_by_day(qs, days: int) -> list[dict[str, Any]]:
    """Conteggio per giorno degli ultimi N giorni (riempie a 0 i giorni vuoti).

    Restituisce lista ordinata [{date: 'YYYY-MM-DD', count: int}, …].
    """
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    rows = (
        qs.filter(created_at__date__gte=start)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(c=Count('id'))
    )
    by_day = {r['day']: r['c'] for r in rows}
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        out.append({'date': d.isoformat(), 'count': by_day.get(d, 0)})
    return out


def collect_stats() -> dict[str, Any]:
    now = timezone.now()
    last7 = _since(7)
    last30 = _since(30)
    last90 = _since(90)

    # --- VISITE (PageView) ----------------------------------------------
    pv_qs = PageView.objects.all()
    visite_tot = pv_qs.count()
    visite_7 = pv_qs.filter(created_at__gte=last7).count()
    visite_30 = pv_qs.filter(created_at__gte=last30).count()
    unique_7 = pv_qs.filter(created_at__gte=last7).values('ip_hash').distinct().count()
    unique_30 = pv_qs.filter(created_at__gte=last30).values('ip_hash').distinct().count()

    serie_30 = _bucket_by_day(pv_qs, 30)
    top_pages = list(
        pv_qs.filter(created_at__gte=last30)
        .values('path')
        .annotate(c=Count('id'))
        .order_by('-c')[:10]
    )

    # --- UTENTI ----------------------------------------------------------
    u_qs = User.objects.all()
    utenti_tot = u_qs.count()
    escort_tot = u_qs.filter(user_type='escort').count()
    user_tot = u_qs.filter(user_type='user').count()
    utenti_nuovi_7 = u_qs.filter(date_joined__gte=last7).count()
    utenti_nuovi_30 = u_qs.filter(date_joined__gte=last30).count()
    escort_nuove_30 = u_qs.filter(user_type='escort', date_joined__gte=last30).count()

    # --- SCHEDE ESCORT ---------------------------------------------------
    p_qs = Professionista.objects.all()
    schede_tot = p_qs.count()
    schede_approvate = p_qs.filter(stato_approvazione='approvata').count()
    schede_in_attesa = p_qs.filter(stato_approvazione='in_attesa').count()
    schede_rifiutate = p_qs.filter(stato_approvazione='rifiutata').count()
    schede_in_pausa = p_qs.filter(in_pausa=True).count()

    click_telefono_tot = p_qs.aggregate(s=Sum('click_telefono'))['s'] or 0

    # --- ABBONAMENTI -----------------------------------------------------
    # Stato "attivo" = pagamento confermato; il filtro su scadenza esclude
    # quelli pagati ma già scaduti (potenzialmente da rinnovare).
    abb_qs = Abbonamento.objects.all()
    abb_attivi = abb_qs.filter(stato='attivo', scadenza__gt=now)
    abb_attivi_std = abb_attivi.filter(piano__tipo='standard').count()
    abb_attivi_evi = abb_attivi.filter(piano__tipo='evidenza').count()
    fatturato_tot_cent = abb_qs.filter(stato='attivo').aggregate(s=Sum('importo_centesimi'))['s'] or 0
    fatturato_30_cent = abb_qs.filter(stato='attivo', created_at__gte=last30).aggregate(s=Sum('importo_centesimi'))['s'] or 0
    fatturato_90_cent = abb_qs.filter(stato='attivo', created_at__gte=last90).aggregate(s=Sum('importo_centesimi'))['s'] or 0

    # --- SBLOCCHI / MICROSACQUISTI --------------------------------------
    # SbloccoSocial usa flag bool `attivo` (True post-conferma pagamento).
    sb_tot = SbloccoSocial.objects.filter(attivo=True).count()
    sb_fatturato_cent = SbloccoSocial.objects.filter(attivo=True).aggregate(s=Sum('importo_centesimi'))['s'] or 0

    # --- RECENSIONI ------------------------------------------------------
    rec_tot = Recensione.objects.count()
    rec_sito_tot = RecensioneSito.objects.count()
    rec_sito_media = RecensioneSito.objects.aggregate(m=Sum('stelle'))['m']
    rec_sito_media = round(rec_sito_media / rec_sito_tot, 2) if rec_sito_tot else None

    return {
        'visite': {
            'totali': visite_tot,
            'ultimi_7': visite_7,
            'ultimi_30': visite_30,
            'unique_7': unique_7,
            'unique_30': unique_30,
            'serie_30': serie_30,
            'top_pages': top_pages,
        },
        'utenti': {
            'totali': utenti_tot,
            'escort': escort_tot,
            'clienti': user_tot,
            'nuovi_7': utenti_nuovi_7,
            'nuovi_30': utenti_nuovi_30,
            'escort_nuove_30': escort_nuove_30,
        },
        'schede': {
            'totali': schede_tot,
            'approvate': schede_approvate,
            'in_attesa': schede_in_attesa,
            'rifiutate': schede_rifiutate,
            'in_pausa': schede_in_pausa,
            'click_telefono_tot': click_telefono_tot,
        },
        'abbonamenti': {
            'attivi_standard': abb_attivi_std,
            'attivi_evidenza': abb_attivi_evi,
            'fatturato_tot_eur': fatturato_tot_cent / 100,
            'fatturato_30_eur': fatturato_30_cent / 100,
            'fatturato_90_eur': fatturato_90_cent / 100,
        },
        'sblocchi': {
            'totali': sb_tot,
            'fatturato_eur': sb_fatturato_cent / 100,
        },
        'recensioni': {
            'escort': rec_tot,
            'sito': rec_sito_tot,
            'sito_media': rec_sito_media,
        },
    }
