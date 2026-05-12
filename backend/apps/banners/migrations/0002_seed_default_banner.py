from django.db import migrations


def seed_default(apps, schema_editor):
    Banner = apps.get_model('banners', 'Banner')
    Banner.objects.get_or_create(
        posizione='homepage_middle',
        defaults={
            'titolo': 'Vuoi pubblicizzarti in questo banner?',
            'descrizione': (
                'Raggiungi migliaia di utenti che ogni giorno cercano professioniste '
                'sulla nostra piattaforma. Contattaci per scoprire le opportunità '
                'pubblicitarie disponibili.'
            ),
            'button_testo': 'Contattaci',
            'button_link': 'mailto:supporto@directoryprofessioniste.it',
            'attivo': True,
            'ordine': 0,
        },
    )


def remove_default(apps, schema_editor):
    Banner = apps.get_model('banners', 'Banner')
    Banner.objects.filter(
        posizione='homepage_middle',
        titolo='Vuoi pubblicizzarti in questo banner?',
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('banners', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_default, remove_default),
    ]
