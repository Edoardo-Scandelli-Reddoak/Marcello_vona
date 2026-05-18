from datetime import date
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from unfold.admin import ModelAdmin, TabularInline
from .models import Professionista, FotoProfessionista, VideoProfessionista, Categoria, Tag


class FotoInline(TabularInline):
    model = FotoProfessionista
    extra = 0


class VideoInline(TabularInline):
    model = VideoProfessionista
    extra = 0


@admin.register(Professionista)
class ProfessionistaAdmin(ModelAdmin):
    list_display = ('nome', 'categoria', 'provincia', 'citta', 'stato_approvazione', 'in_pausa', 'eta', 'rating_medio', 'created_at')
    list_filter = ('stato_approvazione', 'in_pausa', 'categoria', 'provincia', 'tags')
    search_fields = (
        'nome', 'citta', 'provincia',
        'user__email', 'onlyfans_url', 'instagram_url', 'facebook_url', 'tiktok_url', 'telegram_url',
    )
    readonly_fields = (
        'click_telefono', 'data_verifica',
        'indirizzo_pubblico_aggiornato_at',
        'documento_fronte_preview', 'documento_retro_preview',
    )

    def eta(self, obj):
        if not obj.data_nascita:
            return '-'
        today = date.today()
        return today.year - obj.data_nascita.year - (
            (today.month, today.day) < (obj.data_nascita.month, obj.data_nascita.day)
        )
    eta.short_description = 'Età'
    inlines = [FotoInline, VideoInline]
    actions = ['approva_escort', 'rifiuta_escort']

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

    @admin.action(description='Approva escort selezionate')
    def approva_escort(self, request, queryset):
        queryset.update(stato_approvazione='approvata')

    @admin.action(description='Rifiuta escort selezionate')
    def rifiuta_escort(self, request, queryset):
        queryset.update(stato_approvazione='rifiutata')


def _escort_block(escort_qs, filter_param: str, obj_id: int):
    """Renderizza un elenco con link alle escort + link 'Vedi tutte (n)'."""
    items = list(escort_qs.order_by('nome')[:50])
    listing_url = (
        reverse('admin:professioniste_professionista_changelist')
        + f'?{filter_param}={obj_id}'
    )
    total = escort_qs.count()
    if not items:
        return format_html(
            '<p style="margin:0;color:#888;">Nessuna escort associata.</p>'
            '<p style="margin-top:8px;"><a href="{}">Vai alla lista filtrata →</a></p>',
            listing_url,
        )
    list_html = format_html_join(
        '\n',
        '<li><a href="{}">{}</a> <span style="color:#888;">— {} ({})</span></li>',
        (
            (
                reverse('admin:professioniste_professionista_change', args=[p.pk]),
                p.nome,
                p.citta or '—',
                p.provincia or '—',
            )
            for p in items
        ),
    )
    return format_html(
        '<ul style="margin:0;padding-left:18px;">{}</ul>'
        '<p style="margin-top:10px;"><a href="{}">Vedi tutte ({}) →</a></p>',
        list_html,
        listing_url,
        total,
    )


@admin.register(Categoria)
class CategoriaAdmin(ModelAdmin):
    list_display = ('nome', 'count_escort')
    readonly_fields = ('escort_list',)
    search_fields = ('nome',)

    def get_fields(self, request, obj=None):
        if obj is None:
            return ('nome',)
        return ('nome', 'escort_list')

    def count_escort(self, obj):
        return obj.escort.count()
    count_escort.short_description = 'N. escort'

    def escort_list(self, obj):
        return _escort_block(
            obj.escort.all(),
            filter_param='categoria__id__exact',
            obj_id=obj.pk,
        )
    escort_list.short_description = 'Escort in questa categoria'


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    list_display = ('nome', 'count_escort')
    readonly_fields = ('escort_list',)
    search_fields = ('nome',)

    def get_fields(self, request, obj=None):
        if obj is None:
            return ('nome',)
        return ('nome', 'escort_list')

    def count_escort(self, obj):
        return obj.escort.count()
    count_escort.short_description = 'N. escort'

    def escort_list(self, obj):
        return _escort_block(
            obj.escort.all(),
            filter_param='tags__id__exact',
            obj_id=obj.pk,
        )
    escort_list.short_description = 'Escort con questo tag'
