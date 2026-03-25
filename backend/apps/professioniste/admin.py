from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from .models import Professionista, FotoProfessionista, Categoria, Tag


class FotoInline(TabularInline):
    model = FotoProfessionista
    extra = 0


@admin.register(Professionista)
class ProfessionistaAdmin(ModelAdmin):
    list_display = ('nome', 'categoria', 'provincia', 'citta', 'stato_approvazione', 'rating_medio', 'created_at')
    list_filter = ('stato_approvazione', 'categoria', 'provincia')
    search_fields = ('nome', 'citta', 'provincia', 'user__email')
    readonly_fields = ('visualizzazioni', 'click_telefono', 'documento_fronte_preview', 'documento_retro_preview')
    inlines = [FotoInline]
    actions = ['approva_professioniste', 'rifiuta_professioniste']

    def documento_fronte_preview(self, obj):
        if obj.documento_fronte:
            return format_html('<img src="{}" style="max-width:400px;max-height:300px;" />', obj.documento_fronte.url)
        return '-'
    documento_fronte_preview.short_description = 'Documento Fronte'

    def documento_retro_preview(self, obj):
        if obj.documento_retro:
            return format_html('<img src="{}" style="max-width:400px;max-height:300px;" />', obj.documento_retro.url)
        return '-'
    documento_retro_preview.short_description = 'Documento Retro'

    @admin.action(description='Approva professioniste selezionate')
    def approva_professioniste(self, request, queryset):
        queryset.update(stato_approvazione='approvata')

    @admin.action(description='Rifiuta professioniste selezionate')
    def rifiuta_professioniste(self, request, queryset):
        queryset.update(stato_approvazione='rifiutata')


@admin.register(Categoria)
class CategoriaAdmin(ModelAdmin):
    list_display = ('nome',)


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    list_display = ('nome',)
