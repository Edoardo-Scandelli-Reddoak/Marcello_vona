from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.abbonamenti.models import PianoAbbonamento, Promozione


# Listino di partenza (tipo, durata_giorni) → (nome, prezzo_centesimi, sconto_%, ordine).
# Serve solo a popolare un database nuovo: in produzione i prezzi si gestiscono
# dall'admin e questo comando, che gira a ogni deploy, non deve toccarli.
PIANI = [
    # Standard
    ('standard', 1,   ('1 giorno',    1990,  50, 0)),
    ('standard', 7,   ('7 giorni',   10500,  70, 1)),
    ('standard', 15,  ('15 giorni',  18000,  70, 2)),
    ('standard', 30,  ('30 giorni',  23000,  70, 3)),
    ('standard', 60,  ('60 giorni',  45000,  70, 4)),
    ('standard', 90,  ('90 giorni',  69000,  70, 5)),
    ('standard', 180, ('180 giorni', 130000, 50, 6)),
    ('standard', 365, ('365 giorni', 260000, 50, 7)),
    # Evidenza
    ('evidenza', 1,   ('1 giorno',    1990,  50, 0)),
    ('evidenza', 7,   ('7 giorni',   11500,  50, 1)),
    ('evidenza', 30,  ('30 giorni',  34000,  50, 2)),
]


class Command(BaseCommand):
    help = (
        'Crea i piani di abbonamento del listino di partenza che mancano del tutto, '
        'e una Promozione di default se mancante. Non modifica né cancella i piani esistenti.'
    )

    def handle(self, *args, **options):
        # Solo creazione. Prima faceva update_or_create su (tipo, durata):
        # riscriveva i prezzi messi dall'admin, e andava in errore quando
        # l'admin aveva creato un piano nuovo con la stessa durata di uno
        # vecchio disattivato. Per lo stesso motivo non cancella piu' i piani
        # fuori listino: possono essere piani creati dall'admin.
        created_count = 0
        for tipo, durata, (nome, prezzo, sconto, ordine) in PIANI:
            if PianoAbbonamento.objects.filter(tipo=tipo, durata_giorni=durata).exists():
                continue
            piano = PianoAbbonamento.objects.create(
                tipo=tipo,
                durata_giorni=durata,
                nome=nome,
                prezzo_centesimi=prezzo,
                sconto_percentuale=sconto,
                ordine=ordine,
            )
            created_count += 1
            self.stdout.write(self.style.SUCCESS(f'Creato: {piano}'))

        # Promozione di default: disattivata, scadenza 30 giorni da ora. L'admin la
        # attiva e regola la scadenza dal pannello quando vuole lanciare la promo.
        if not Promozione.objects.exists():
            Promozione.objects.create(
                nome='Early Bird',
                attiva=False,
                scadenza=timezone.now() + timedelta(days=30),
            )
            self.stdout.write(self.style.SUCCESS('Promozione "Early Bird" creata (disattivata, scadenza +30g).'))

        self.stdout.write(self.style.SUCCESS(
            f'Sync piani completato. Creati: {created_count}; i piani esistenti non sono stati toccati.'
        ))
