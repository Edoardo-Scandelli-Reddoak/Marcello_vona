from django.db import migrations


def create_hero_singleton(apps, schema_editor):
    """Crea la singola riga di HeroSettings se non esiste.

    I campi restano vuoti: significa "usa i default codificati lato
    frontend". L'admin vede subito la riga da modificare e capisce dove
    cliccare per personalizzare hero homepage.
    """
    HeroSettings = apps.get_model('banners', 'HeroSettings')
    HeroSettings.objects.get_or_create(pk=1)


class Migration(migrations.Migration):

    dependencies = [
        ('banners', '0006_herosettings'),
    ]

    operations = [
        migrations.RunPython(create_hero_singleton, migrations.RunPython.noop),
    ]
