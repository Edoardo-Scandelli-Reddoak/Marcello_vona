from django.db import migrations


def escort_copy_in_banners(apps, schema_editor):
    Banner = apps.get_model('banners', 'Banner')
    for b in Banner.objects.all():
        updates = {}
        for attr in ('titolo', 'descrizione', 'button_testo', 'button_link'):
            val = getattr(b, attr) or ''
            if not val:
                continue
            new = (
                val.replace('Professioniste', 'Escort')
                .replace('professioniste', 'escort')
                .replace('Professionisti', 'Escort')
                .replace('professionisti', 'escort')
                .replace('Professionista', 'Escort')
                .replace('professionista', 'escort')
                .replace('directoryprofessioniste.it', 'directoryescort.it')
            )
            if new != val:
                updates[attr] = new
        if updates:
            for k, v in updates.items():
                setattr(b, k, v)
            b.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):

    dependencies = [
        ('banners', '0004_alter_banner_button_link'),
    ]

    operations = [
        migrations.RunPython(escort_copy_in_banners, migrations.RunPython.noop),
    ]
