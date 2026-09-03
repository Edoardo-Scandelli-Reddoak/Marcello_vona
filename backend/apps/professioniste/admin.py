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

    Espone direttamente la scelta `tipo` (Standard vs Evidenza): l'admin
    non deve cercare un "piano" specifico, sceglie semplicemente la
    visibilità e quanti giorni dura.
    """
    TIPO_CHOICES = (
        ('evidenza', 'Evidenza — appare in cima ai risultati ("Le più apprezzate")'),
        ('standard', 'Standard — visibilità base (compare nelle liste, non in evidenza)'),
    )
    tipo = forms.ChoiceField(
        choices=TIPO_CHOICES,
        widget=forms.RadioSelect,
        initial='evidenza',
        label='Tipo abbonamento',
    )
    durata_giorni = forms.IntegerField(
        min_value=1, max_value=3650, initial=30,
        label='Durata (giorni)',
        help_text='Esempi: 1 (test) · 7 (settimana) · 30 (mese) · 90 (trimestre) · 180 (semestre) · 365 (anno).',
    )
    importo_incassato = forms.DecimalField(
        required=False, min_value=0, max_digits=8, decimal_places=2,
        label='Importo incassato (€)',
        help_text=(
            'Quanto hai incassato davvero, concordato su WhatsApp (bonifico, contanti…). '
            'Serve perché il fatturato in "Analisi dati" resti corretto. '
            'Lascia vuoto solo se è un vero omaggio: verrà registrato 0 €.'
        ),
    )


def _grant_subscription(professionista, tipo: str, durata_giorni: int, importo_centesimi: int = 0):
    """Crea un Abbonamento attivo per `professionista` con il `tipo`
    richiesto ('standard' o 'evidenza') e la durata in giorni.

    Replica la logica cumulativa di Abbonamento.activate(): se la escort ha
    già un abbonamento dello stesso tipo non scaduto, la nuova scadenza
    parte da QUELLA (non da now), così l'omaggio si somma al pre-esistente
    invece di accorciarlo.

    Il record `piano` è obbligatorio (FK PROTECT su Abbonamento): scelgo il
    piano attivo più corto del tipo richiesto come "anchor". Non influenza
    la durata effettiva, perché `scadenza` viene calcolata da `durata_giorni`.
    """
    from apps.abbonamenti.models import Abbonamento, PianoAbbonamento
    piano = (
        PianoAbbonamento.objects
        .filter(tipo=tipo, attivo=True)
        .order_by('durata_giorni')
        .first()
    )
    if piano is None:
        # Fallback: pianifica anche se nessun piano attivo esiste (es. listino svuotato)
        piano = PianoAbbonamento.objects.filter(tipo=tipo).order_by('durata_giorni').first()
    if piano is None:
        raise ValueError(
            f'Nessun piano "{tipo}" presente. Crea un PianoAbbonamento di tipo "{tipo}" '
            'prima di concedere omaggi (vedi: Piani abbonamento).'
        )
    now = timezone.now()
    last_active = (
        Abbonamento.objects
        .filter(
            professionista=professionista,
            piano__tipo=tipo,
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
        importo_centesimi=importo_centesimi,
        inizio=now,
        scadenza=starting_point + timedelta(days=durata_giorni),
        # importo 0 = omaggio vero; importo > 0 = pagamento concordato fuori dal
        # sito. La distinzione tiene puliti i conti in "Analisi dati".
        payment_method='manuale' if importo_centesimi else 'mock',
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

    def save_model(self, request, obj, form, change):
        """Geocodifica automatica dell'indirizzo pubblico anche quando la
        scheda viene creata/modificata dall'admin.

        La registrazione via API lo fa già nei serializer; qui replichiamo lo
        stesso comportamento per il percorso admin, così lat/lng vengono
        sempre valorizzati. Best-effort: se Nominatim non risponde, lat/lng
        restano invariati. Se l'admin inserisce le coordinate a mano, le
        rispettiamo e non sovrascriviamo.
        """
        super().save_model(request, obj, form, change)

        coords_a_mano = 'latitudine' in form.changed_data or 'longitudine' in form.changed_data
        if coords_a_mano:
            return

        address_fields = ('via', 'cap', 'citta', 'provincia', 'nazione')
        address_changed = any(f in form.changed_data for f in address_fields)
        # Geocodifica alla creazione, oppure quando cambia l'indirizzo, oppure
        # quando le coordinate mancano del tutto (es. scheda importata senza).
        coords_mancanti = obj.latitudine is None or obj.longitudine is None
        if not (not change or address_changed or coords_mancanti):
            return

        from apps.professioniste.geocoding import geocode_location
        if not any([obj.via, obj.citta, obj.provincia, obj.nazione]):
            return
        geo = geocode_location(obj.via, obj.cap, obj.citta, obj.provincia, obj.nazione)
        if geo and geo.get('lat') is not None and geo.get('lng') is not None:
            obj.latitudine = geo['lat']
            obj.longitudine = geo['lng']
            obj.indirizzo_pubblico_aggiornato_at = timezone.now()
            obj.save(update_fields=[
                'latitudine', 'longitudine', 'indirizzo_pubblico_aggiornato_at',
            ])

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
        """Sezione readonly: mostra gli ultimi abbonamenti (attivi/scaduti/...)
        e un bottone per concederne uno omaggio.

        Mostro anche gli scaduti perché aiuta a capire perché una scheda è/non è
        visibile pubblicamente — lo stato "vera visibilità" è calcolato qui
        in real-time (scadenza__gt=now) e indipendente dallo stato nel DB
        (che potrebbe essere ancora 'attivo' se expire_subscriptions non gira
        come cron).
        """
        if not obj or not obj.pk:
            return format_html('<span style="color:#888;">Salva la scheda per poter gestire gli abbonamenti.</span>')
        from apps.abbonamenti.models import Abbonamento
        now = timezone.now()
        ultimi = (
            Abbonamento.objects
            .filter(professionista=obj)
            .select_related('piano')
            .order_by('-created_at')[:10]
        )
        # NB: `ultimi` è uno slice ([:10]) → non si può chiamare .filter() su di
        # esso (Django solleva "Cannot filter a query once a slice has been
        # taken"). Lo stato "attivo" va calcolato con una query separata.
        ha_attivo = Abbonamento.objects.filter(
            professionista=obj, stato='attivo', scadenza__gt=now,
        ).exists()
        # Status reale: la scheda è "online" solo se ha almeno un abbonamento
        # con stato='attivo' AND scadenza > now (logica di Professionista.objects.visible()).
        if ha_attivo:
            status_box = (
                '<div style="color:#065f46;background:#ecfdf5;border:1px solid #6ee7b7;'
                'padding:8px 12px;border-radius:6px;margin-bottom:8px;">'
                '<strong>✓ Scheda visibile pubblicamente</strong> — c\'è almeno un '
                'abbonamento attivo non scaduto.</div>'
            )
        else:
            status_box = (
                '<div style="color:#b54708;background:#fff7ed;border:1px solid #fed7aa;'
                'padding:8px 12px;border-radius:6px;margin-bottom:8px;">'
                '<strong>✗ Scheda NON visibile pubblicamente</strong> — nessun '
                'abbonamento attivo non scaduto.</div>'
            )
        grant_url = reverse('admin:professioniste_professionista_grant', args=[obj.pk])
        button = format_html(
            '<a href="{}" class="button" style="background:#E91E8C;color:#fff;'
            'padding:6px 14px;border-radius:6px;text-decoration:none;'
            'display:inline-block;margin-top:6px;font-weight:600;">'
            '+ Concedi abbonamento omaggio</a>',
            grant_url,
        )
        if not ultimi.exists():
            return format_html(
                '{}{}',
                format_html(status_box),
                button,
            )

        def _row(a):
            scaduto = a.scadenza is None or a.scadenza <= now
            if a.stato == 'attivo' and not scaduto:
                badge = '<span style="color:#065f46;font-weight:600;">attivo</span>'
            elif a.stato == 'attivo' and scaduto:
                badge = '<span style="color:#b91c1c;font-weight:600;">scaduto (stato DB: attivo)</span>'
            else:
                badge = f'<span style="color:#666;">{a.get_stato_display()}</span>'
            scadenza_str = a.scadenza.strftime('%d/%m/%Y %H:%M') if a.scadenza else '—'
            return format_html(
                '<li><strong>{}</strong> ({}) — scadenza {} · {}</li>',
                a.piano.nome, a.piano.get_tipo_display(), scadenza_str, format_html(badge),
            )

        rows = format_html_join('\n', '{}', ((_row(a),) for a in ultimi))
        return format_html(
            '{}<ul style="margin:0 0 6px 0;padding-left:20px;">{}</ul>{}',
            format_html(status_box),
            rows,
            button,
        )
    abbonamento_omaggio.short_description = 'Abbonamenti (ultimi 10)'

    def grant_abbonamento_view(self, request, professionista_id):
        professionista = get_object_or_404(Professionista, pk=professionista_id)
        if request.method == 'POST':
            form = _GrantAbbonamentoForm(request.POST)
            if form.is_valid():
                tipo = form.cleaned_data['tipo']
                durata = form.cleaned_data['durata_giorni']
                importo = form.cleaned_data.get('importo_incassato') or 0
                ab = _grant_subscription(professionista, tipo, durata, int(round(importo * 100)))
                etichetta = 'omaggio' if not importo else f'da {importo:.2f} €'
                messages.success(
                    request,
                    f'Abbonamento {etichetta} {ab.piano.get_tipo_display()} creato per '
                    f'{professionista.nome} — scade il '
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
        """Azione bulk: applica lo stesso tipo+durata a tutte le escort selezionate."""
        if request.POST.get('apply'):
            form = _GrantAbbonamentoForm(request.POST)
            if form.is_valid():
                tipo = form.cleaned_data['tipo']
                durata = form.cleaned_data['durata_giorni']
                importo = form.cleaned_data.get('importo_incassato') or 0
                cent = int(round(importo * 100))
                count = 0
                for prof in queryset:
                    _grant_subscription(prof, tipo, durata, cent)
                    count += 1
                tipo_label = dict(_GrantAbbonamentoForm.TIPO_CHOICES).get(tipo, tipo).split('—')[0].strip()
                etichetta = 'omaggio' if not importo else f'da {importo:.2f} €'
                self.message_user(
                    request,
                    f'Abbonamento {etichetta} {tipo_label} ({durata} giorni) creato per {count} scheda/e.',
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
