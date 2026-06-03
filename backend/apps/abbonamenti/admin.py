from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import PianoAbbonamento, Abbonamento, Promozione


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


@admin.register(Abbonamento)
class AbbonamentoAdmin(ModelAdmin):
    list_display = (
        'professionista', 'piano', 'stato', 'importo_eur',
        'inizio', 'scadenza', 'payment_method', 'created_at',
    )
    list_filter = ('stato', 'piano__tipo', 'payment_method')
    search_fields = (
        'professionista__nome', 'professionista__user__email',
        'stripe_session_id', 'stripe_payment_intent_id',
    )
    readonly_fields = (
        'created_at', 'paid_at', 'inizio', 'scadenza',
        'stripe_session_id', 'stripe_payment_intent_id', 'payment_method',
    )
    fieldsets = (
        ('Abbonamento', {
            'fields': ('professionista', 'piano', 'stato', 'importo_centesimi'),
        }),
        ('Periodo di validità', {
            'fields': ('inizio', 'scadenza'),
        }),
        ('Pagamento', {
            'fields': ('payment_method', 'stripe_session_id', 'stripe_payment_intent_id', 'paid_at'),
        }),
        ('Metadati', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )
