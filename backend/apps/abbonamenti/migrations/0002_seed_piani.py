from django.db import migrations


PIANI = [
    # tipo,       nome,                    durata_giorni, prezzo_centesimi, ordine
    ('standard', 'Extra Day (1 giorno)',   1,             1990,             0),
    ('standard', '7 giorni',               7,             10500,            1),
    ('standard', '15 giorni',              15,            18000,            2),
    ('standard', '30 giorni',              30,            23000,            3),
    ('standard', '60 giorni',              60,            48000,            4),
    ('standard', '90 giorni',              90,            69000,            5),
    ('standard', '180 giorni',             180,           130000,           6),
    ('evidenza', '1 giorno',               1,             3000,             0),
    ('evidenza', '7 giorni',               7,             18000,            1),
    ('evidenza', '30 giorni',              30,            65000,            2),
]


def seed(apps, schema_editor):
    Piano = apps.get_model('abbonamenti', 'PianoAbbonamento')
    for tipo, nome, durata, prezzo, ordine in PIANI:
        Piano.objects.update_or_create(
            tipo=tipo,
            durata_giorni=durata,
            defaults={
                'nome': nome,
                'prezzo_centesimi': prezzo,
                'ordine': ordine,
                'attivo': True,
            },
        )


def unseed(apps, schema_editor):
    Piano = apps.get_model('abbonamenti', 'PianoAbbonamento')
    for tipo, _, durata, *_rest in PIANI:
        Piano.objects.filter(tipo=tipo, durata_giorni=durata).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('abbonamenti', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
