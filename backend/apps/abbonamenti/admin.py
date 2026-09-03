from datetime import timedelta

from django.contrib import admin, messages
from django.utils import timezone
from unfold.admin import ModelAdmin
from .models import PianoAbbonamento, Abbonamento, Promozione, CodicePromo


class InScadenzaFilter(admin.SimpleListFilter):
    """Filtro operativo: chi va contattato adesso.

    Serve perche' i promemoria automatici arrivano nella dashboard della escort
    (e per email, quando l'SMTP sara' configurato), ma il contatto vero avviene
    su WhatsApp: qui trovi l'elenco pronto senza doverlo ricavare ordinando la
    tabella.
    """
    title = 'In scadenza'
    parameter_name = 'in_scadenza'

    def lookups(self, request, model_admin):
        return (
            ('7', 'Nei prossimi 7 giorni'),
            ('2', 'Nei prossimi 2 giorni'),
            ('scaduti_ma_attivi', 'Scaduti ma ancora marcati attivi'),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        valore = self.value()
        if valore in ('7', '2'):
            return queryset.filter(
                stato='attivo',
                scadenza__gt=now,
                scadenza__lte=now + timedelta(days=int(valore)),
            )
        if valore == 'scaduti_ma_attivi':
            # Se questa lista non e' vuota, il comando giornaliero non sta girando.
            return queryset.filter(stato='attivo', scadenza__lt=now)
        return queryset


@admin.register(PianoAbbonamento)
class PianoAbbonamentoAdmin(ModelAdmin):
    list_display = (
        'nome', 'tipo', 'durata_giorni', 'prezzo_eur',
        'sconto_percentuale', 'attivo', 'ordine',
    )
    list_filter = ('tipo', 'attivo')
    list_editable = ('sconto_percentuale', 'attivo', 'ordine')
    search_fields = ('nome',)


@admin.register(Promozione)
class PromozioneAdmin(ModelAdmin):
    """Singleton: l'admin permette UN solo record di Promozione (il primo)."""
    list_display = ('nome', 'attiva', 'scadenza', 'is_current')

    def has_add_permission(self, request):
        # Vietato creare più di una Promozione: c'è già un singleton.
        return not Promozione.objects.exists()

    def is_current(self, obj):
        return obj.is_current
    is_current.boolean = True
    is_current.short_description = 'In corso ora?'


@admin.register(CodicePromo)
class CodicePromoAdmin(ModelAdmin):
    list_display = ('codice', 'nome', 'sconto_percentuale', 'attivo', 'scadenza', 'is_current')
    list_filter = ('attivo',)
    list_editable = ('attivo',)
    search_fields = ('codice', 'nome')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Codice referral', {'fields': ('codice', 'nome', 'sconto_percentuale')}),
        ('Validità', {'fields': ('attivo', 'scadenza')}),
        ('Metadati', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

    def is_current(self, obj):
        return obj.is_current
    is_current.boolean = True
    is_current.short_description = 'Valido ora?'


@admin.register(Abbonamento)
class AbbonamentoAdmin(ModelAdmin):
    list_display = (
        'codice_causale', 'professionista', 'piano', 'stato', 'importo_eur',
        'inizio', 'scadenza', 'payment_method', 'created_at',
    )
    list_filter = (InScadenzaFilter, 'stato', 'piano__tipo', 'payment_method')
    search_fields = (
        'professionista__nome', 'professionista__user__email',
        'stripe_session_id', 'stripe_payment_intent_id',
    )
    readonly_fields = (
        'codice_causale', 'created_at', 'paid_at', 'inizio', 'scadenza',
        'promemoria_7_inviato_at', 'promemoria_2_inviato_at',
        'stripe_session_id', 'stripe_payment_intent_id', 'payment_method',
    )
    actions = ['attiva_pagamento_ricevuto']
    fieldsets = (
        ('Abbonamento', {
            'fields': ('codice_causale', 'professionista', 'piano', 'stato', 'importo_centesimi'),
            'description': (
                'Sul bonifico la escort scrive questo codice seguito da '
                '"inserzione pubblicitaria" (es. "ESB-0042 inserzione pubblicitaria"): '
                'cerca il codice per capire a quale richiesta corrisponde un accredito.'
            ),
        }),
        ('Periodo di validità', {
            'fields': ('inizio', 'scadenza'),
            'description': (
                'Si valorizzano da sole quando usi l\'azione '
                '"Attiva — pagamento ricevuto".'
            ),
        }),
        ('Pagamento', {
            'fields': ('payment_method', 'paid_at'),
            'description': (
                'I pagamenti si concordano su WhatsApp, fuori dal sito: '
                'qui si registra solo l\'esito.'
            ),
        }),
        ('Promemoria di scadenza', {
            'fields': ('promemoria_7_inviato_at', 'promemoria_2_inviato_at'),
            'description': (
                'Compilati dal comando giornaliero quando parte l\'avviso. '
                'Se restano vuoti su abbonamenti prossimi alla scadenza, '
                'il comando non sta girando.'
            ),
            'classes': ('collapse',),
        }),
        ('Storico Stripe (solo abbonamenti vecchi)', {
            'fields': ('stripe_session_id', 'stripe_payment_intent_id'),
            'classes': ('collapse',),
        }),
        ('Metadati', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

    @admin.display(description='Causale')
    def codice_causale(self, obj):
        """Codice mostrato alla escort nella finestra di pagamento.

        Deve restare identico al formato generato dal frontend
        (`PagamentoModal`): ESB- piu' l'id dell'abbonamento su 4 cifre.
        """
        if not obj or not obj.pk:
            return '—'
        return f'ESB-{obj.pk:04d}'

    @admin.action(description='Attiva — pagamento ricevuto')
    def attiva_pagamento_ricevuto(self, request, queryset):
        """Attiva le richieste selezionate dopo che il pagamento e' arrivato.

        La durata e la scadenza le calcola `Abbonamento.activate()`, che somma
        alla scadenza esistente se la scheda ha gia' un abbonamento attivo
        dello stesso tipo: chi rinnova in anticipo non perde giorni.
        """
        attivati, saltati = 0, 0
        for abb in queryset.select_related('piano', 'professionista'):
            if abb.stato == 'attivo' and abb.is_attivo:
                saltati += 1
                continue
            if not abb.importo_centesimi:
                # Richiesta senza importo (o omaggio): registra il prezzo di listino
                # cosi' il fatturato in "Analisi dati" resta corretto.
                abb.importo_centesimi = abb.piano.prezzo_centesimi
            abb.activate(payment_method='manuale')
            attivati += 1

        if attivati:
            self.message_user(
                request,
                f'{attivati} abbonamento/i attivato/i. Le schede sono ora visibili sul sito.',
                level=messages.SUCCESS,
            )
        if saltati:
            self.message_user(
                request,
                f'{saltati} erano già attivi e non scaduti: lasciati invariati.',
                level=messages.WARNING,
            )
