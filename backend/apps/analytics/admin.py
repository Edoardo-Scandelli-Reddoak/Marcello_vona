from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import PageView


@admin.register(PageView)
class PageViewAdmin(ModelAdmin):
    """Lista raw delle visite — utile per debug, ma il vero strumento di
    monitoraggio è la pagina dedicata `Analisi dati`.
    """
    list_display = ('created_at', 'path', 'short_ua')
    list_filter = ('created_at',)
    search_fields = ('path', 'user_agent', 'referer')
    readonly_fields = ('path', 'ip_hash', 'user_agent', 'referer', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        # I record si creano solo via beacon dal frontend, non manualmente.
        return False

    def short_ua(self, obj):
        return (obj.user_agent or '')[:60]
    short_ua.short_description = 'User-Agent'
