from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    list_display = ('email', 'user_type', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
