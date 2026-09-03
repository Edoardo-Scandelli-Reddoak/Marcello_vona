"""Manutenzione giornaliera degli abbonamenti.

Fa due cose, in quest'ordine:

1. **Avvisa chi sta per scadere**, 7 e 2 giorni prima. Serve perché il
   pagamento avviene con bonifico fuori dal sito: l'accredito richiede uno o
   due giorni lavorativi più la conferma manuale dell'admin. Senza preavviso
   ogni rinnovo produrrebbe un buco di giorni in cui la scheda è invisibile —
   e proprio a chi paga.
2. **Marca come 'scaduto'** gli abbonamenti con scadenza passata e avvisa che
   la scheda non è più online.

Un solo comando invece di due perché chi lo pianifica deve ricordarsi UNA voce
di cron: dimenticare i promemoria sarebbe il danno peggiore.

Uso:
    python manage.py expire_subscriptions

In produzione va schedulato **una volta al giorno** (su Railway: cron job).
Gira anche a ogni deploy da `start.sh`, ma un deploy non è una pianificazione:
senza cron i promemoria partono solo quando si pubblica qualcosa.

È idempotente: rieseguirlo più volte lo stesso giorno non manda avvisi
doppi, e se salta un giorno recupera al giro successivo.
"""

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.abbonamenti.models import Abbonamento
from apps.notifiche.models import Notifica


# Giorni di preavviso. Il primo dà il tempo di fare il bonifico con calma, il
# secondo è il richiamo per chi si è dimenticata.
SOGLIE_PREAVVISO = (
    (7, 'promemoria_7_inviato_at'),
    (2, 'promemoria_2_inviato_at'),
)


def _frontend_url() -> str:
    return getattr(settings, 'FRONTEND_URL', 'http://localhost:3001').rstrip('/')


def _invia_email(destinatario: str, oggetto: str, corpo: str) -> None:
    """Email best-effort: se l'SMTP non è configurato non deve rompere nulla."""
    try:
        send_mail(
            subject=oggetto,
            message=corpo,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[destinatario],
            fail_silently=True,
        )
    except Exception:
        pass


class Command(BaseCommand):
    help = (
        'Avvisa le escort con abbonamento in scadenza (7 e 2 giorni prima) e '
        'marca come scaduti quelli con scadenza passata. Da schedulare una volta al giorno.'
    )

    def handle(self, *args, **options):
        now = timezone.now()
        self._avvisa_in_scadenza(now)
        self._marca_scaduti(now)

    # ------------------------------------------------------------------ #
    # 1. Preavvisi
    # ------------------------------------------------------------------ #
    def _avvisa_in_scadenza(self, now):
        """Manda UN solo preavviso per esecuzione, quello più urgente.

        Iteriamo per abbonamento e non per soglia: se una scheda entra nel
        raggio d'azione quando mancano già meno di 2 giorni (o se il comando
        non ha girato per una settimana), le soglie applicabili sono più di
        una. In quel caso mandiamo solo il messaggio più urgente e timbriamo
        anche le soglie più larghe, che non hanno più senso: altrimenti la
        escort riceverebbe due avvisi identici nello stesso istante.
        """
        massimo = max(giorni for giorni, _ in SOGLIE_PREAVVISO)
        oggi = timezone.localdate()
        inviati = 0

        qs = (
            Abbonamento.objects
            .filter(
                stato='attivo',
                scadenza__gt=now,
                scadenza__lte=now + timedelta(days=massimo),
            )
            .select_related('professionista', 'professionista__user', 'piano')
        )

        for abb in qs:
            # Giorni contati sul calendario, non sulle ore: se scade il 08/09 e
            # oggi è il 03/09 la escort si aspetta di leggere "tra 5 giorni",
            # non "tra 4" come darebbe la differenza in ore arrotondata per
            # difetto.
            residui = (timezone.localtime(abb.scadenza).date() - oggi).days

            candidate = [
                (giorni, campo) for giorni, campo in SOGLIE_PREAVVISO
                if residui <= giorni and getattr(abb, campo) is None
            ]
            if not candidate:
                continue

            soglia = min(giorni for giorni, _ in candidate)
            campi_da_timbrare = [campo for _, campo in candidate]

            def timbra():
                for campo in campi_da_timbrare:
                    setattr(abb, campo, now)
                abb.save(update_fields=campi_da_timbrare)

            # Un piano più corto della soglia scadrebbe "in preavviso" già nel
            # momento in cui viene pagato: avvisarla non ha senso.
            if abb.piano.durata_giorni <= soglia:
                timbra()
                continue

            if residui <= 0:
                quando = 'oggi'
            elif residui == 1:
                quando = 'domani'
            else:
                quando = f'tra {residui} giorni'

            prof = abb.professionista
            tipo_label = abb.piano.get_tipo_display()
            scadenza_str = timezone.localtime(abb.scadenza).strftime('%d/%m/%Y')

            titolo = f'Abbonamento in scadenza {quando}'
            messaggio = (
                f'Il tuo abbonamento {tipo_label} ({abb.piano.nome}) scade {quando}, '
                f'il {scadenza_str}. Dopo quella data la tua scheda non sarà più '
                f'visibile sul sito.\n\n'
                'Per rinnovare scegli il piano e paga con bonifico: tieni presente che '
                "l'accredito può richiedere uno o due giorni lavorativi, quindi conviene "
                'muoversi qualche giorno prima per non restare offline. Ricordati di '
                'inserire la causale indicata e di mandarci la ricevuta su WhatsApp.'
            )

            Notifica.objects.create(
                user=prof.user,
                tipo='abbonamento_in_scadenza',
                titolo=titolo,
                messaggio=messaggio,
                link='/abbonamento',
            )

            _invia_email(
                prof.user.email,
                titolo,
                (
                    f'Ciao {prof.nome},\n\n'
                    f'{messaggio}\n\n'
                    f'Rinnova qui: {_frontend_url()}/abbonamento\n\n'
                    '— Escort Bella'
                ),
            )

            timbra()
            inviati += 1
            self.stdout.write(self.style.SUCCESS(
                f'Preavviso {soglia}g → {prof.nome} ({prof.user.email}) — '
                f'scade {scadenza_str} ({quando})'
            ))

        if inviati:
            self.stdout.write(self.style.SUCCESS(f'{inviati} preavviso/i inviato/i.'))
        else:
            self.stdout.write('Nessun preavviso da inviare.')

    # ------------------------------------------------------------------ #
    # 2. Scaduti
    # ------------------------------------------------------------------ #
    def _marca_scaduti(self, now):
        expired = list(
            Abbonamento.objects
            .filter(stato='attivo', scadenza__lt=now)
            .select_related('professionista', 'professionista__user', 'piano')
        )

        if not expired:
            self.stdout.write('Nessun abbonamento scaduto da processare.')
            return

        notificati = set()  # una sola notifica per escort per giro

        for abb in expired:
            abb.stato = 'scaduto'
            abb.save(update_fields=['stato'])

            prof = abb.professionista
            user = prof.user
            if user.id in notificati:
                continue

            # La scheda resta online se ha ancora un altro abbonamento valido.
            still_active = Abbonamento.objects.filter(
                professionista=prof, stato='attivo', scadenza__gt=now,
            ).exists()

            tipo_label = abb.piano.get_tipo_display()
            scadenza_str = abb.scadenza.strftime('%d/%m/%Y') if abb.scadenza else '—'

            if still_active:
                titolo = f'Abbonamento {tipo_label} scaduto'
                messaggio = (
                    f'Il tuo abbonamento {tipo_label} ({abb.piano.nome}) è scaduto il '
                    f'{scadenza_str}. Hai ancora altri abbonamenti attivi: il tuo profilo '
                    'resta visibile, ma considera di rinnovare per continuare ad usare '
                    'tutti i benefici.'
                )
            else:
                titolo = 'Abbonamento scaduto — profilo non più visibile'
                messaggio = (
                    f'Il tuo abbonamento {tipo_label} ({abb.piano.nome}) è scaduto il '
                    f'{scadenza_str}. Il tuo profilo non è più visibile sul sito. '
                    'Rinnova per tornare online: scegli il piano, paga con bonifico e '
                    'mandaci la ricevuta su WhatsApp.'
                )

            Notifica.objects.create(
                user=user,
                tipo='abbonamento_scaduto',
                titolo=titolo,
                messaggio=messaggio,
                link='/abbonamento',
            )

            _invia_email(
                user.email,
                titolo,
                (
                    f'Ciao {prof.nome},\n\n'
                    f'{messaggio}\n\n'
                    f'Rinnova ora: {_frontend_url()}/abbonamento\n\n'
                    '— Escort Bella'
                ),
            )

            notificati.add(user.id)
            self.stdout.write(self.style.SUCCESS(
                f'Notifica scadenza → {prof.nome} ({user.email}) — {titolo}'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'Processati {len(expired)} abbonamenti scaduti, {len(notificati)} notifiche generate.'
        ))
