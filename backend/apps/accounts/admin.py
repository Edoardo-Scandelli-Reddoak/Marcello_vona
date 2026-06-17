from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.urls import reverse
from django.utils.html import format_html
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
    readonly_fields = ('cambia_password',)
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password', 'cambia_password')}),
        ('Informazioni personali', {'fields': ('first_name', 'last_name')}),
        ('Tipologia', {'fields': ('user_type',)}),
        ('Permessi', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Date importanti', {'fields': ('last_login', 'date_joined')}),
    )

    def cambia_password(self, obj):
        """Bottone rosa per andare alla form di reset password.

        Unfold non renderizza il link "Change password" nei classici object
        tools, quindi lo mostriamo qui inline dentro al fieldset "Email/etc".
        """
        if not obj or not obj.pk:
            return format_html('<span style="color:#888;">Salva l\'utente per poterne cambiare la password.</span>')
        url = reverse('admin:accounts_user_password_change', args=[obj.pk])
        return format_html(
            '<a href="{}" class="button" style="background:#E91E8C;color:#fff;'
            'padding:6px 14px;border-radius:6px;text-decoration:none;'
            'display:inline-block;font-weight:600;">'
            '🔑 Imposta nuova password</a>',
            url,
        )
    cambia_password.short_description = 'Reset password'
