from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professioniste', '0015_provincia_maiuscolo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='professionista',
            name='cap',
            field=models.CharField(blank=True, default='', max_length=10, verbose_name='CAP (pubblico)'),
        ),
    ]
