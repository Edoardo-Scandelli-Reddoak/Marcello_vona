import json

from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.template.response import TemplateResponse

from .dashboard import collect_stats


@staff_member_required
def analytics_dashboard(request):
    stats = collect_stats()
    context = {
        **admin.site.each_context(request),
        'title': 'Analisi dati',
        'stats': stats,
        # Serializzo qui le serie temporali così il template può usarle
        # direttamente in JS senza ulteriori conversioni.
        'serie_30_labels_json': json.dumps([row['date'] for row in stats['visite']['serie_30']]),
        'serie_30_values_json': json.dumps([row['count'] for row in stats['visite']['serie_30']]),
    }
    return TemplateResponse(request, 'analytics/dashboard.html', context)
