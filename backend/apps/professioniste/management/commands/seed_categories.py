from django.core.management.base import BaseCommand
from apps.professioniste.models import Categoria


# Categorie di partenza. E' un seed *additivo*: le categorie aggiunte a mano
# dall'admin non vengono ne' toccate ne' rimosse ad ogni deploy.
CATEGORIE_BASE = (
    # (slug, etichetta, ordine)
    ('donna', 'Donna', 0),
    ('trans', 'Trans', 1),
    ('coppia', 'Coppia', 2),
)


class Command(BaseCommand):
    help = 'Seed delle categorie iniziali (additivo e idempotente)'

    def handle(self, *args, **options):
        for slug, label, ordine in CATEGORIE_BASE:
            _, creata = Categoria.objects.get_or_create(
                nome=slug,
                defaults={'label': label, 'ordine': ordine},
            )
            stato = 'creata' if creata else 'gia\' presente'
            self.stdout.write(self.style.SUCCESS(f'Categoria "{slug}" {stato}'))
