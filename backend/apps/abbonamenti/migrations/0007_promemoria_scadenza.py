from django.db import migrations, models


class Migration(migrations.Migration):
    """Traccia dei promemoria di scadenza già inviati (7 e 2 giorni prima).

    Due campi nullable: additivi, nessun dato esistente viene toccato.
    """

    dependencies = [
        ('abbonamenti', '0006_payment_method_manuale'),
    ]

    operations = [
        migrations.AddField(
            model_name='abbonamento',
            name='promemoria_7_inviato_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Promemoria 7 giorni inviato il'),
        ),
        migrations.AddField(
            model_name='abbonamento',
            name='promemoria_2_inviato_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Promemoria 2 giorni inviato il'),
        ),
    ]
