from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from unfold.admin import ModelAdmin
from .models import User


class CustomUserCreationForm(UserCreationForm):
    """Form di creazione utente da admin.

    Espone solo email + user_type + password (NO username): il frontend
    registra gli utenti con `username = email` per consistenza, e qui
    facciamo lo stesso così non ci sono utenti con username diverso
    dall'email che possono confondere il flow di login/lookup.
    """
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('email', 'user_type')

    def save(self, commit=True):
        user = super().save(commit=False)
        # Allineiamo username all'email — stesso pattern del RegisterSerializer
        # del frontend. AbstractUser richiede username unique non-null.
        user.username = user.email
        if commit:
            user.save()
        return user


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    list_display = ('email', 'username', 'user_type', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'is_staff')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'user_type', 'password1', 'password2'),
        }),
    )
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Informazioni personali', {'fields': ('first_name', 'last_name')}),
        ('Tipologia', {'fields': ('user_type',)}),
        ('Permessi', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Date importanti', {'fields': ('last_login', 'date_joined')}),
    )
