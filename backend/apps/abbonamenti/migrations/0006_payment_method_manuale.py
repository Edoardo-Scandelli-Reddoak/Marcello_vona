from django.db import migrations, models


class Migration(migrations.Migration):
    """Aggiorna le scelte di `payment_method` dopo la rimozione di Stripe.

    'manuale' e' il nuovo default (pagamento concordato su WhatsApp e attivato
    a mano dall'admin). 'stripe' resta nell'elenco per mostrare correttamente
    gli abbonamenti incassati quando Stripe era collegato. Solo metadati: non
    tocca lo schema del database.
    """

    dependencies = [
        ('abbonamenti', '0005_alter_codicepromo_options_alter_codicepromo_codice_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='abbonamento',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[
                    ('manuale', 'Pagamento gestito manualmente'),
                    ('stripe', 'Stripe (storico)'),
                    ('mock', 'Omaggio / sviluppo'),
                ],
                max_length=20,
            ),
        ),
    ]
