import csv

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse
from django.template.response import TemplateResponse
from django.utils.http import urlencode

from .dashboard import COLONNE_CSV, classifica_escort, collect_stats, opzioni_filtri, parse_filtri

RIGHE_CLASSIFICA = 50


@staff_member_required
def analytics_dashboard(request):
    filtri = parse_filtri(request.GET)

    if request.GET.get('export') == 'escort':
        return _csv_escort(filtri)

    stats = collect_stats(filtri)
    query = filtri.as_querydict()
    classifica = stats['classifica']
    context = {
        **admin.site.each_context(request),
        'title': 'Analisi dati',
        'stats': stats,
        'filtri': filtri,
        'opzioni': opzioni_filtri(),
        'classifica': classifica[:RIGHE_CLASSIFICA],
        'classifica_totale': len(classifica),
        'export_url': '?' + urlencode({**query, 'export': 'escort'}),
        'grafici': stats['grafici'],
        'distribuzioni': {
            'canali': stats['traffico']['canali'],
            'dispositivi': stats['traffico']['dispositivi'],
            'sezioni': stats['traffico']['sezioni'],
            'stelle': stats['engagement']['recensioni_stelle'],
        },
    }
    return TemplateResponse(request, 'analytics/dashboard.html', context)


def _csv_escort(filtri):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    nome = f'escort_{filtri.inizio:%Y%m%d}-{filtri.fine:%Y%m%d}.csv'
    response['Content-Disposition'] = f'attachment; filename="{nome}"'
    response.write('﻿')  # BOM: Excel apre correttamente gli accenti
    writer = csv.writer(response, delimiter=';')
    writer.writerow([label for _, label in COLONNE_CSV])
    for riga in classifica_escort(filtri):
        valori = []
        for chiave, _ in COLONNE_CSV:
            v = riga[chiave]
            if isinstance(v, bool):
                v = 'sì' if v else 'no'
            elif isinstance(v, float):
                v = f'{v:.2f}'.replace('.', ',')
            elif v is None:
                v = ''
            valori.append(v)
        writer.writerow(valori)
    return response
