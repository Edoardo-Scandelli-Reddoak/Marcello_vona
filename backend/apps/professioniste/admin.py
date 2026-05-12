from datetime import date
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from unfold.admin import ModelAdmin, TabularInline
from .models import Professionista, FotoProfessionista, Categoria, Tag


class FotoInline(TabularInline):
    model = FotoProfessionista
    extra = 0


@admin.register(Professionista)
class ProfessionistaAdmin(ModelAdmin):
    list_display = ('nome', 'categoria', 'provincia', 'citta', 'stato_approvazione', 'eta', 'rating_medio', 'created_at')
    list_filter = ('stato_approvazione', 'categoria', 'provincia', 'tags')
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


def _professioniste_block(professioniste_qs, filter_param: str, obj_id: int):
    """Renderizza un elenco con link alle professioniste + link 'Vedi tutte (n)'."""
    items = list(professioniste_qs.order_by('nome')[:50])
    listing_url = (
        reverse('admin:professioniste_professionista_changelist')
        + f'?{filter_param}={obj_id}'
    )
    total = professioniste_qs.count()
    if not items:
        return format_html(
            '<p style="margin:0;color:#888;">Nessuna professionista associata.</p>'
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
    list_display = ('nome', 'count_professioniste')
    readonly_fields = ('professioniste_list',)
    search_fields = ('nome',)

    def get_fields(self, request, obj=None):
        if obj is None:
            return ('nome',)
        return ('nome', 'professioniste_list')

    def count_professioniste(self, obj):
        return obj.professioniste.count()
    count_professioniste.short_description = 'N. professioniste'

    def professioniste_list(self, obj):
        return _professioniste_block(
            obj.professioniste.all(),
            filter_param='categoria__id__exact',
            obj_id=obj.pk,
        )
    professioniste_list.short_description = 'Professioniste in questa categoria'


@admin.register(Tag)
class TagAdmin(ModelAdmin):
    list_display = ('nome', 'count_professioniste')
    readonly_fields = ('professioniste_list',)
    search_fields = ('nome',)

    def get_fields(self, request, obj=None):
        if obj is None:
            return ('nome',)
        return ('nome', 'professioniste_list')

    def count_professioniste(self, obj):
        return obj.professioniste.count()
    count_professioniste.short_description = 'N. professioniste'

    def professioniste_list(self, obj):
        return _professioniste_block(
            obj.professioniste.all(),
            filter_param='tags__id__exact',
            obj_id=obj.pk,
        )
    professioniste_list.short_description = 'Professioniste con questo tag'
