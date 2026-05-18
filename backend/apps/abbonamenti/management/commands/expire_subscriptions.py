"""Marca gli abbonamenti scaduti e crea le notifiche per le escort.

Uso (manuale):
    docker exec marcellovona-backend-1 python manage.py expire_subscriptions

In produzione, schedulare ogni 1-15 minuti via cron / Celery beat / Kubernetes CronJob:
    *​/15 * * * *  python manage.py expire_subscriptions
"""

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento
from apps.notifiche.models import Notifica


class Command(BaseCommand):
    help = "Marca come 'scaduto' gli abbonamenti con scadenza nel passato e notifica le escort."

    def handle(self, *args, **options):
        now = timezone.now()
        expired = list(
            Abbonamento.objects
            .filter(stato='attivo', scadenza__lt=now)
            .select_related('professionista', 'professionista__user', 'piano')
        )

        if not expired:
            self.stdout.write('Nessun abbonamento scaduto da processare.')
            return

        notificati = set()  # un'unica notifica per escort (profilo) per giro

        for abb in expired:
            abb.stato = 'scaduto'
            abb.save(update_fields=['stato'])

            prof = abb.professionista
            user = prof.user
            if user.id in notificati:
                continue

            # Verifica se la prof ha ancora qualche abbonamento attivo (qualsiasi tipo).
            still_active = Abbonamento.objects.filter(
                professionista=prof,
                stato='attivo',
                scadenza__gt=now,
            ).exists()

            tipo_label = abb.piano.get_tipo_display()
            piano_nome = abb.piano.nome
            scadenza_str = abb.scadenza.strftime('%d/%m/%Y') if abb.scadenza else '—'

            if still_active:
                titolo = f'Abbonamento {tipo_label} scaduto'
                messaggio = (
                    f"Il tuo abbonamento {tipo_label} ({piano_nome}) è scaduto il {scadenza_str}. "
                    f"Hai ancora altri abbonamenti attivi: il tuo profilo resta visibile, "
                    f"ma considera di rinnovare per continuare ad usare tutti i benefici."
                )
            else:
                titolo = 'Abbonamento scaduto — profilo non più visibile'
                messaggio = (
                    f"Il tuo abbonamento {tipo_label} ({piano_nome}) è scaduto il {scadenza_str}. "
                    f"Il tuo profilo non è più visibile sul sito. "
                    f"Rinnova l'abbonamento per tornare online."
                )

            Notifica.objects.create(
                user=user,
                tipo='abbonamento_scaduto',
                titolo=titolo,
                messaggio=messaggio,
                link='/abbonamento',
            )

            # Email (in dev finisce nei log Django via console backend)
            try:
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3001').rstrip('/')
                send_mail(
                    subject=titolo,
                    message=(
                        f"Ciao {prof.nome},\n\n"
                        f"{messaggio}\n\n"
                        f"Rinnova ora: {frontend_url}/abbonamento\n\n"
                        f"— Directory Escort"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

            notificati.add(user.id)

            self.stdout.write(self.style.SUCCESS(
                f'Notifica creata per {prof.nome} ({user.email}) — {titolo}'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'Processati {len(expired)} abbonamenti scaduti, {len(notificati)} notifiche generate.'
        ))
