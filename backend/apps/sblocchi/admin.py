from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import SbloccoSocial


@admin.register(SbloccoSocial)
class SbloccoSocialAdmin(ModelAdmin):
    list_display = ('user', 'professionista', 'attivo', 'importo_eur', 'payment_method', 'paid_at', 'created_at')
    list_filter = ('attivo', 'payment_method')
    search_fields = ('user__email', 'professionista__nome', 'stripe_session_id', 'stripe_payment_intent_id')
    readonly_fields = ('created_at', 'paid_at', 'stripe_session_id', 'stripe_payment_intent_id', 'payment_method')
    autocomplete_fields = ('user', 'professionista')
