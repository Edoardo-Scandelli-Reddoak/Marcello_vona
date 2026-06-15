from datetime import date, timedelta
from django import forms
from django.contrib import admin, messages
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html, format_html_join
from unfold.admin import ModelAdmin, TabularInline
from .models import Professionista, FotoProfessionista, VideoProfessionista, Categoria, Tag


class FotoInline(TabularInline):
    model = FotoProfessionista
    extra = 0


class VideoInline(TabularInline):
    model = VideoProfessionista
    extra = 0


class _GrantAbbonamentoForm(forms.Form):
    """Form usato da admin per creare un abbonamento "omaggio" — attivo
    subito, senza pagamento Stripe, di durata arbitraria.
    """
    piano = forms.ModelChoiceField(
        queryset=None,  # popolato in __init__ per evitare query a import-time
        label='Piano',
        help_text='Standard = visibilità base · Evidenza = in cima ai risultati',
    )
    durata_giorni = forms.IntegerField(
        min_value=1, max_value=3650, initial=30,
        label='Durata (giorni)',
        help_text='Esempi: 7 (settimana) · 30 (mese) · 90 (trimestre) · 180 (semestre) · 365 (anno)',
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from apps.abbonamenti.models import PianoAbbonamento
        self.fields['piano'].queryset = (
            PianoAbbonamento.objects.filter(attivo=True).order_by('tipo', 'durata_giorni')
        )


def _grant_subscription(professionista, piano, durata_giorni: int):
    """Crea un Abbonamento attivo per `professionista` con la durata richiesta.

    Replica la logica cumulativa di Abbonamento.activate(): se la escort ha
    già un abbonamento dello stesso tipo non scaduto, la nuova scadenza
    parte da QUELLA (non da now), così l'omaggio si somma al pre-esistente
    invece di accorciarlo.
    """
    from apps.abbonamenti.models import Abbonamento
    now = timezone.now()
    last_active = (
        Abbonamento.objects
        .filter(
            professionista=professionista,
            piano__tipo=piano.tipo,
            stato='attivo',
            scadenza__gt=now,
        )
        .order_by('-scadenza')
        .first()
    )
    starting_point = last_active.scadenza if last_active else now
    return Abbonamento.objects.create(
        professionista=professionista,
        piano=piano,
        stato='attivo',
        importo_centesimi=0,
        inizio=now,
        scadenza=starting_point + timedelta(days=durata_giorni),
        payment_method='mock',
        paid_at=now,
    )


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
        'abbonamento_omaggio',
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
    actions = ['approva_escort', 'rifiuta_escort', 'concedi_abbonamento_omaggio']

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:professionista_id>/grant-abbonamento/',
                self.admin_site.admin_view(self.grant_abbonamento_view),
                name='professioniste_professionista_grant',
            ),
        ]
        return custom + urls

    def abbonamento_omaggio(self, obj):
        """Sezione readonly dentro la pagina escort che mostra gli
        abbonamenti attivi correnti e un bottone per concederne uno omaggio.
        """
        if not obj or not obj.pk:
            return format_html('<span style="color:#888;">Salva la scheda per poter gestire gli abbonamenti.</span>')
        from apps.abbonamenti.models import Abbonamento
        now = timezone.now()
        attivi = (
            Abbonamento.objects
            .filter(professionista=obj, stato='attivo', scadenza__gt=now)
            .select_related('piano')
            .order_by('-scadenza')
        )
        grant_url = reverse('admin:professioniste_professionista_grant', args=[obj.pk])
        button = format_html(
            '<a href="{}" class="button" style="background:#E91E8C;color:#fff;'
            'padding:6px 14px;border-radius:6px;text-decoration:none;'
            'display:inline-block;margin-top:6px;font-weight:600;">'
            '+ Concedi abbonamento omaggio</a>',
            grant_url,
        )
        if not attivi.exists():
            return format_html(
                '<div style="color:#b54708;background:#fff7ed;border:1px solid #fed7aa;'
                'padding:8px 12px;border-radius:6px;">'
                '<strong>Nessun abbonamento attivo.</strong> '
                'La scheda <em>non è visibile pubblicamente</em> finché non c\'è un abbonamento attivo.'
                '</div>{}',
                button,
            )
        list_html = format_html_join(
            '\n',
            '<li><strong>{}</strong> ({}) — scade il {}</li>',
            ((a.piano.nome, a.piano.get_tipo_display(), a.scadenza.strftime('%d/%m/%Y %H:%M')) for a in attivi),
        )
        return format_html(
            '<ul style="margin:0 0 6px 0;padding-left:20px;">{}</ul>{}',
            list_html,
            button,
        )
    abbonamento_omaggio.short_description = 'Abbonamenti attivi'

    def grant_abbonamento_view(self, request, professionista_id):
        professionista = get_object_or_404(Professionista, pk=professionista_id)
        if request.method == 'POST':
            form = _GrantAbbonamentoForm(request.POST)
            if form.is_valid():
                piano = form.cleaned_data['piano']
                durata = form.cleaned_data['durata_giorni']
                ab = _grant_subscription(professionista, piano, durata)
                messages.success(
                    request,
                    f'Abbonamento omaggio creato per {professionista.nome}: '
                    f'{piano.nome} ({piano.get_tipo_display()}) — scade il '
                    f'{ab.scadenza.strftime("%d/%m/%Y %H:%M")}.'
                )
                return redirect('admin:professioniste_professionista_change', professionista_id)
        else:
            form = _GrantAbbonamentoForm()
        context = {
            **self.admin_site.each_context(request),
            'title': f'Concedi abbonamento omaggio — {professionista.nome}',
            'professionista': professionista,
            'form': form,
            'opts': self.opts,
        }
        return render(request, 'admin/grant_abbonamento.html', context)

    @admin.action(description='Concedi abbonamento omaggio')
    def concedi_abbonamento_omaggio(self, request, queryset):
        """Azione bulk: applica lo stesso piano+durata a tutte le escort selezionate."""
        if request.POST.get('apply'):
            form = _GrantAbbonamentoForm(request.POST)
            if form.is_valid():
                piano = form.cleaned_data['piano']
                durata = form.cleaned_data['durata_giorni']
                count = 0
                for prof in queryset:
                    _grant_subscription(prof, piano, durata)
                    count += 1
                self.message_user(
                    request,
                    f'Abbonamento omaggio {piano.nome} ({durata} giorni) creato per {count} scheda/e.',
                    level=messages.SUCCESS,
                )
                return None
        else:
            form = _GrantAbbonamentoForm()
        return render(request, 'admin/grant_abbonamento_bulk.html', {
            **self.admin_site.each_context(request),
            'title': 'Concedi abbonamento omaggio (bulk)',
            'queryset': queryset,
            'form': form,
            'action': 'concedi_abbonamento_omaggio',
            'opts': self.opts,
        })

    @staticmethod
    def _doc_url(filefield):
        """URL del documento con scadenza breve (5 min) quando lo storage è
        S3/R2 (signed URL), così il link non resta valido a lungo se finisce
        nella cache del browser o nei log. Con FileSystemStorage (dev) ricade
        sull'URL normale (`.url()` non accetta `expire`).
        """
        if not filefield:
            return None
        try:
            return filefield.storage.url(filefield.name, expire=300)
        except TypeError:
            return filefield.url

    def documento_fronte_preview(self, obj):
        url = self._doc_url(obj.documento_fronte)
        if url:
            return format_html('<img src="{}" style="max-width:400px;max-height:300px;" />', url)
        return '-'
    documento_fronte_preview.short_description = 'Documento Fronte'

    def documento_retro_preview(self, obj):
        url = self._doc_url(obj.documento_retro)
        if url:
            return format_html('<img src="{}" style="max-width:400px;max-height:300px;" />', url)
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
