from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Recensione, RecensioneSito


@admin.register(Recensione)
class RecensioneAdmin(ModelAdmin):
    list_display = ('professionista', 'autore', 'stelle', 'ha_risposta', 'created_at')
    list_filter = ('stelle',)
    search_fields = ('professionista__nome', 'autore__email', 'testo', 'risposta_escort')
    readonly_fields = ('created_at', 'risposta_at')
    fieldsets = (
        ('Recensione', {'fields': ('professionista', 'autore', 'stelle', 'testo', 'created_at')}),
        ('Risposta della escort', {'fields': ('risposta_escort', 'risposta_at')}),
    )

    def ha_risposta(self, obj):
        return bool(obj.risposta_escort)
    ha_risposta.boolean = True
    ha_risposta.short_description = 'Risposta'


@admin.register(RecensioneSito)
class RecensioneSitoAdmin(ModelAdmin):
    list_display = ('nome', 'stelle', 'attiva', 'ordine')
    list_editable = ('attiva', 'ordine')
    list_filter = ('attiva',)
