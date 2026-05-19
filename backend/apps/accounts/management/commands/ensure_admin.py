"""Crea (o aggiorna la password di) un superuser admin in modo idempotente.

Pensato per essere eseguito in produzione a ogni deploy:
- Legge `DJANGO_ADMIN_EMAIL` e `DJANGO_ADMIN_PASSWORD` da env.
- Se mancano: no-op (così il command non rompe il boot quando non configurato).
- Se l'utente non esiste: lo crea come superuser.
- Se esiste: aggiorna la password e si assicura che abbia is_superuser/is_staff.
"""
import os

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Crea/aggiorna un superuser admin da DJANGO_ADMIN_EMAIL / DJANGO_ADMIN_PASSWORD'

    def handle(self, *args, **options):
        email = os.environ.get('DJANGO_ADMIN_EMAIL', '').strip()
        password = os.environ.get('DJANGO_ADMIN_PASSWORD', '')

        if not email or not password:
            self.stdout.write('DJANGO_ADMIN_EMAIL/PASSWORD non settati — skip.')
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'user_type': 'user',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Superuser creato: {email}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Superuser aggiornato (password reset): {email}'))
