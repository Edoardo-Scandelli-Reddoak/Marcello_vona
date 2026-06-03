from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.abbonamenti.models import PianoAbbonamento, Promozione


# Listino ufficiale (tipo, durata_giorni) → (nome, prezzo_centesimi, sconto_%, ordine).
# Upsert idempotente: ri-eseguibile a ogni deploy senza creare duplicati.
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
    help = 'Aggiorna o crea i piani di abbonamento secondo il listino ufficiale, e crea una Promozione di default se mancante.'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        for tipo, durata, (nome, prezzo, sconto, ordine) in PIANI:
            piano, created = PianoAbbonamento.objects.update_or_create(
                tipo=tipo,
                durata_giorni=durata,
                defaults={
                    'nome': nome,
                    'prezzo_centesimi': prezzo,
                    'sconto_percentuale': sconto,
                    'ordine': ordine,
                    'attivo': True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Creato: {piano}'))
            else:
                updated_count += 1
                self.stdout.write(f'Aggiornato: {piano}')

        # Pulizia "piani fantasma": ciò che non è nel listino ufficiale viene
        # rimosso. Se però ha abbonamenti collegati (FK PROTECT) non possiamo
        # cancellarlo senza rompere lo storico → in quel caso lo disattiviamo
        # soltanto, così sparisce dalla pagina prezzi ma il record resta.
        listino_keys = {(tipo, durata) for tipo, durata, _ in PIANI}
        deleted_count = 0
        deactivated_count = 0
        for piano in PianoAbbonamento.objects.all():
            if (piano.tipo, piano.durata_giorni) in listino_keys:
                continue
            if piano.abbonamenti.exists():
                if piano.attivo:
                    piano.attivo = False
                    piano.save(update_fields=['attivo'])
                    deactivated_count += 1
                    self.stdout.write(self.style.WARNING(
                        f'Disattivato (ha abbonamenti storici, non cancellabile): {piano}'
                    ))
            else:
                self.stdout.write(self.style.WARNING(f'Eliminato (fuori listino): {piano}'))
                piano.delete()
                deleted_count += 1

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
            f'Sync piani completato. Creati: {created_count}, aggiornati: {updated_count}, '
            f'eliminati: {deleted_count}, disattivati: {deactivated_count}.'
        ))
