# Generated manually on 2026-05-18

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('professioniste', '0011_professionista_onlyfans_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='professionista',
            name='zona',
            field=models.CharField(
                blank=True, default='', max_length=200,
                help_text='Quartiere o zona della città mostrata accanto al nome (opzionale).',
                verbose_name='Zona (es. centro, navigli, …)',
            ),
        ),
        migrations.AddField(
            model_name='professionista',
            name='disponibilita',
            field=models.CharField(
                blank=True, default='', max_length=20,
                choices=[
                    ('', 'Non specificato'),
                    ('ricevo', 'Ricevo (incall)'),
                    ('altrui', 'Altrui (outcall)'),
                    ('entrambe', 'Ricevo / Altrui'),
                ],
                help_text='Indica se ricevi (incall), vai dal cliente (outcall) o entrambe.',
                verbose_name='Disponibilità',
            ),
        ),
        migrations.AddField(
            model_name='professionista',
            name='orari_tipo',
            field=models.CharField(
                blank=True, default='', max_length=10,
                choices=[
                    ('', 'Non specificato'),
                    ('24_7', '24/7'),
                    ('h24', 'H24'),
                    ('altro', 'Altro'),
                ],
                verbose_name='Orari (tipo)',
            ),
        ),
        migrations.AddField(
            model_name='professionista',
            name='orari_altro',
            field=models.CharField(
                blank=True, default='', max_length=200,
                help_text='Es. "Lun-Ven 10-22, Sab su appuntamento".',
                verbose_name='Orari (testo libero)',
            ),
        ),
        migrations.AddField(
            model_name='professionista',
            name='tariffa_30min',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                verbose_name='Tariffa 30 minuti (€)',
            ),
        ),
        migrations.AddField(
            model_name='professionista',
            name='tariffa_1ora',
            field=models.PositiveIntegerField(
                blank=True, null=True,
                verbose_name='Tariffa 1 ora (€)',
            ),
        ),
        migrations.CreateModel(
            name='VideoProfessionista',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('video', models.FileField(upload_to='escort/video/')),
                ('ordine', models.PositiveIntegerField(default=0)),
                ('professionista', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='video',
                    to='professioniste.professionista',
                )),
            ],
            options={
                'verbose_name_plural': 'Video escort',
                'ordering': ['ordine'],
            },
        ),
    ]
