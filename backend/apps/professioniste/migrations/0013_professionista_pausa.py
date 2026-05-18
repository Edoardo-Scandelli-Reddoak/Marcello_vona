# Generated manually on 2026-05-18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professioniste', '0012_video_orari_tariffe_zona_disponibilita'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionista',
            name='in_pausa',
            field=models.BooleanField(default=False, verbose_name='In pausa'),
        ),
        migrations.AddField(
            model_name='professionista',
            name='pausa_iniziata_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Ultima pausa iniziata il'),
        ),
    ]
