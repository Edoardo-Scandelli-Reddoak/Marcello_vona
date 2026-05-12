from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Preferito


@admin.register(Preferito)
class PreferitoAdmin(ModelAdmin):
    list_display = ('user', 'professionista', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'professionista__nome')
    autocomplete_fields = ('user', 'professionista')
