from django.db import migrations


def uppercase_provincia(apps, schema_editor):
    Professionista = apps.get_model('professioniste', 'Professionista')
    for prof in Professionista.objects.exclude(provincia=''):
        normalizzata = (prof.provincia or '').strip().upper()
        if normalizzata != prof.provincia:
            prof.provincia = normalizzata
            prof.save(update_fields=['provincia'])


class Migration(migrations.Migration):

    dependencies = [
        ('professioniste', '0014_rename_categorie_donna_trans_coppia'),
    ]

    operations = [
        migrations.RunPython(uppercase_provincia, migrations.RunPython.noop),
    ]
