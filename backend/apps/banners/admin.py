from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import Banner, HeroSettings


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


@admin.register(HeroSettings)
class HeroSettingsAdmin(ModelAdmin):
    """Singleton: una sola riga. Editi titolo/sottotitolo/immagine dell'hero
    homepage. I campi vuoti fanno tornare al default codificato lato frontend.
    """
    list_display = ('__str__', 'titolo', 'updated_at')
    readonly_fields = ('updated_at', 'immagine_preview')
    fieldsets = (
        ('Testo', {
            'fields': ('titolo', 'sottotitolo'),
            'description': 'Lascia i campi vuoti per usare il testo di default del sito.',
        }),
        ('Immagine di sfondo', {
            'fields': ('immagine', 'immagine_preview'),
            'description': 'Lascia vuoto per usare l\'immagine di default del sito.',
        }),
        ('Metadati', {'fields': ('updated_at',), 'classes': ('collapse',)}),
    )

    def has_add_permission(self, request):
        # Singleton: una sola riga consentita.
        return not HeroSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Non cancelliamo il singleton: si "resetta" svuotando i campi.
        return False

    def immagine_preview(self, obj):
        if obj and obj.immagine:
            return format_html(
                '<img src="{}" style="max-width:480px;max-height:240px;border-radius:8px;" />',
                obj.immagine.url,
            )
        return '—'
    immagine_preview.short_description = 'Anteprima immagine'
