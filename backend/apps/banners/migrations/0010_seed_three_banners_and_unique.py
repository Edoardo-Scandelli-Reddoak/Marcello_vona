from django.db import migrations, models


POSITIONS = (
    'homepage_middle',
    'homepage_after_cta',
    'homepage_before_reviews',
)

DEFAULT_CONTENT = {
    'titolo': 'Vuoi pubblicizzarti in questo banner?',
    'descrizione': (
        'Raggiungi migliaia di utenti che ogni giorno cercano escort sulla '
        'nostra piattaforma. Contattaci per scoprire le opportunità '
        'pubblicitarie disponibili.'
    ),
    'button_testo': 'Contattaci',
    'button_link': 'mailto:info.escortbella@gmail.com',
    'attivo': True,
    'ordine': 0,
}


def seed_and_dedup(apps, schema_editor):
    """Garantisce ESATTAMENTE 3 banner (uno per posizione).

    - Se per una posizione c'è già un banner, lo mantengo intatto (rispetto
      le eventuali modifiche fatte dall'admin in produzione).
    - Se ci sono duplicati per la stessa posizione (eredità dello schema
      vecchio), tengo il più recente attivo (preferito) e cancello gli altri.
    - Se manca, lo creo col contenuto di default.
    - Cancello eventuali banner con posizione fuori dalle 3 valide.
    """
    Banner = apps.get_model('banners', 'Banner')

    # Cleanup posizioni sconosciute (legacy / typo).
    Banner.objects.exclude(posizione__in=POSITIONS).delete()

    for pos in POSITIONS:
        rows = list(
            Banner.objects.filter(posizione=pos)
            .order_by('-attivo', 'ordine', '-updated_at')
        )
        if not rows:
            Banner.objects.create(posizione=pos, **DEFAULT_CONTENT)
            continue
        keeper = rows[0]
        for extra in rows[1:]:
            extra.delete()


def noop_reverse(apps, schema_editor):
    # Reversibile parziale: non ricreiamo duplicati, ma rimuoviamo i seed
    # dei 2 nuovi slot così la migration può essere unmigrate-ata senza
    # rompere il vincolo unique (che viene tolto sotto).
    Banner = apps.get_model('banners', 'Banner')
    Banner.objects.filter(
        posizione__in=('homepage_after_cta', 'homepage_before_reviews'),
        titolo=DEFAULT_CONTENT['titolo'],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('banners', '0009_alter_banner_posizione'),
    ]

    operations = [
        # Prima dedup+seed, POI aggiungo unique (altrimenti i duplicati
        # esistenti farebbero esplodere l'IntegrityError).
        migrations.RunPython(seed_and_dedup, noop_reverse),
        migrations.AlterField(
            model_name='banner',
            name='posizione',
            field=models.CharField(
                choices=[
                    ('homepage_middle', 'Homepage — tra "Le più apprezzate" e "Vicino a te"'),
                    ('homepage_after_cta', 'Homepage — sotto al banner "Sei un\'escort?"'),
                    ('homepage_before_reviews', 'Homepage — sopra alla sezione "Cosa dicono di noi"'),
                ],
                help_text='Dove viene mostrato il banner.',
                max_length=50,
                unique=True,
                verbose_name='Posizione',
            ),
        ),
    ]
