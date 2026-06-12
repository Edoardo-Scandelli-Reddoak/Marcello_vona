from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('banners', '0008_alter_herosettings_immagine_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='banner',
            name='posizione',
            field=models.CharField(
                choices=[
                    ('homepage_middle', 'Homepage — tra "Le più apprezzate" e "Vicino a te"'),
                    ('homepage_after_cta', 'Homepage — sotto al banner "Sei un\'escort?"'),
                    ('homepage_before_reviews', 'Homepage — sopra alla sezione "Cosa dicono di noi"'),
                ],
                db_index=True,
                help_text='Dove viene mostrato il banner.',
                max_length=50,
                verbose_name='Posizione',
            ),
        ),
    ]
