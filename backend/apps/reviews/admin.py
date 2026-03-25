from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Recensione, RecensioneSito


@admin.register(Recensione)
class RecensioneAdmin(ModelAdmin):
    list_display = ('professionista', 'autore', 'stelle', 'created_at')
    list_filter = ('stelle',)
    search_fields = ('professionista__nome', 'autore__email')


@admin.register(RecensioneSito)
class RecensioneSitoAdmin(ModelAdmin):
    list_display = ('nome', 'stelle', 'attiva', 'ordine')
    list_editable = ('attiva', 'ordine')
    list_filter = ('attiva',)
