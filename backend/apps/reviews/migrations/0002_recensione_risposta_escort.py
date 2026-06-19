from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='recensione',
            name='risposta_escort',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='recensione',
            name='risposta_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
