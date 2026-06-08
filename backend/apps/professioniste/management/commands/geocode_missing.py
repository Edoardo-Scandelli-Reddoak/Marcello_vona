"""Geocodifica tutte le escort esistenti che hanno lat/lng vuoti.

Una tantum: si esegue manualmente quando serve.
Esempio: `python manage.py geocode_missing` (rate-limit 1 req/s, Nominatim).
"""

import time

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.professioniste.geocoding import geocode_address
from apps.professioniste.models import Professionista


NOMINATIM_RATE_LIMIT_SEC = 1.1  # un po' sopra a 1s per stare nei termini d'uso


class Command(BaseCommand):
    help = 'Geocodifica le escort senza latitudine/longitudine (best-effort, rate-limited).'

    def handle(self, *args, **options):
        missing = Professionista.objects.filter(
            Q(latitudine__isnull=True) | Q(longitudine__isnull=True)
        ).exclude(via='')
        total = missing.count()
        self.stdout.write(f'Trovate {total} escort senza coordinate.')

        ok, fail = 0, 0
        for i, prof in enumerate(missing, start=1):
            parts = [prof.via, prof.cap, prof.citta, prof.provincia, prof.nazione]
            address = ', '.join(p for p in parts if p)
            self.stdout.write(f'[{i}/{total}] {prof.nome} → {address}')
            geo = geocode_address(address)
            if geo and geo.get('lat') is not None and geo.get('lng') is not None:
                prof.latitudine = geo['lat']
                prof.longitudine = geo['lng']
                prof.indirizzo_pubblico_aggiornato_at = timezone.now()
                prof.save(update_fields=[
                    'latitudine', 'longitudine', 'indirizzo_pubblico_aggiornato_at',
                ])
                ok += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  ✓ lat={geo["lat"]:.5f} lng={geo["lng"]:.5f}'
                ))
            else:
                fail += 1
                self.stdout.write(self.style.WARNING(
                    '  ✗ indirizzo non geolocalizzabile (Nominatim non ha trovato match)'
                ))
            # Rate limit: Nominatim consente max 1 req/s, sleep di sicurezza.
            time.sleep(NOMINATIM_RATE_LIMIT_SEC)

        self.stdout.write(self.style.SUCCESS(
            f'\nGeocodifica completata. Successi: {ok}, fallimenti: {fail}.'
        ))
