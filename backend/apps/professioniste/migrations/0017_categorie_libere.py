from django.db import migrations, models


# Etichetta + ordine per le categorie storiche. Le voci "legacy" ci sono solo
# come rete di sicurezza se la 0014 non fosse mai girata su un certo DB.
DEFAULT_CATEGORIE = {
    'donna': ('Donna', 0),
    'trans': ('Trans', 1),
    'coppia': ('Coppia', 2),
    'massaggi': ('Donna', 0),
    'yoga': ('Trans', 1),
    'relax': ('Coppia', 2),
}


def popola_label_e_ordine(apps, schema_editor):
    Categoria = apps.get_model('professioniste', 'Categoria')
    for cat in Categoria.objects.all():
        label, ordine = DEFAULT_CATEGORIE.get(
            cat.nome,
            (cat.nome.replace('-', ' ').replace('_', ' ').title(), 100),
        )
        cat.label = cat.label or label
        cat.ordine = ordine
        cat.save(update_fields=['label', 'ordine'])


def svuota_label_e_ordine(apps, schema_editor):
    # I campi vengono rimossi dal rollback: niente da ripristinare.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('professioniste', '0016_cap_opzionale'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='categoria',
            options={
                'ordering': ('ordine', 'label', 'nome'),
                'verbose_name': 'Categoria',
                'verbose_name_plural': 'Categorie',
            },
        ),
        migrations.AddField(
            model_name='categoria',
            name='label',
            field=models.CharField(
                blank=True,
                help_text='Nome mostrato sul sito (es. "Donna").',
                max_length=50,
                verbose_name='Etichetta',
            ),
        ),
        migrations.AddField(
            model_name='categoria',
            name='ordine',
            field=models.PositiveIntegerField(
                default=100,
                help_text="Numero piu' basso = mostrata prima nei filtri e nei menu a tendina.",
                verbose_name='Ordine',
            ),
        ),
        migrations.AlterField(
            model_name='categoria',
            name='nome',
            field=models.SlugField(
                blank=True,
                help_text='Identificativo tecnico usato negli URL e nei filtri (es. "donna"). '
                          "Se lo lasci vuoto viene generato dall'etichetta.",
                max_length=50,
                unique=True,
                verbose_name='Slug',
            ),
        ),
        migrations.RunPython(popola_label_e_ordine, svuota_label_e_ordine),
    ]
