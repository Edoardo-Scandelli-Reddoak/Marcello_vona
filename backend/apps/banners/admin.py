from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import Banner


@admin.register(Banner)
class BannerAdmin(ModelAdmin):
    list_display = ('titolo', 'posizione', 'attivo', 'ordine', 'updated_at')
    list_filter = ('posizione', 'attivo')
    search_fields = ('titolo', 'descrizione')
    list_editable = ('attivo', 'ordine')
    readonly_fields = ('created_at', 'updated_at', 'immagine_preview')
    fieldsets = (
        ('Contenuto', {
            'fields': ('posizione', 'titolo', 'descrizione', 'immagine', 'immagine_preview'),
        }),
        ('Bottone (opzionale)', {
            'fields': ('button_testo', 'button_link'),
        }),
        ('Pubblicazione', {
            'fields': ('attivo', 'ordine'),
        }),
        ('Metadati', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def immagine_preview(self, obj):
        if obj.immagine:
            return format_html('<img src="{}" style="max-width:480px;max-height:240px;border-radius:8px;" />', obj.immagine.url)
        return '-'
    immagine_preview.short_description = 'Anteprima immagine'
