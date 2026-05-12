from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Notifica


@admin.register(Notifica)
class NotificaAdmin(ModelAdmin):
    list_display = ('titolo', 'tipo', 'user', 'letta', 'created_at')
    list_filter = ('tipo', 'letta')
    search_fields = ('titolo', 'messaggio', 'user__email')
    readonly_fields = ('created_at', 'read_at')
    autocomplete_fields = ('user',)
