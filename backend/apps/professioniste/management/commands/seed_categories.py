from django.core.management.base import BaseCommand
from apps.professioniste.models import Categoria


class Command(BaseCommand):
    help = 'Seed delle categorie iniziali'

    def handle(self, *args, **options):
        categories = ['massaggi', 'yoga', 'relax']
        for cat in categories:
            Categoria.objects.get_or_create(nome=cat)
            self.stdout.write(self.style.SUCCESS(f'Categoria "{cat}" creata/esistente'))
