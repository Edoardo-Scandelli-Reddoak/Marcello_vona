from django.db import migrations, models


def rename_categorie_forward(apps, schema_editor):
    Categoria = apps.get_model('professioniste', 'Categoria')
    table = schema_editor.quote_name(Categoria._meta.db_table)
    cursor = schema_editor.connection.cursor()
    for old, new in (
        ('massaggi', 'donna'),
        ('yoga', 'trans'),
        ('relax', 'coppia'),
    ):
        cursor.execute(
            f'UPDATE {table} SET nome = %s WHERE nome = %s',
            [new, old],
        )


def rename_categorie_backward(apps, schema_editor):
    Categoria = apps.get_model('professioniste', 'Categoria')
    table = schema_editor.quote_name(Categoria._meta.db_table)
    cursor = schema_editor.connection.cursor()
    for old, new in (
        ('massaggi', 'donna'),
        ('yoga', 'trans'),
        ('relax', 'coppia'),
    ):
        cursor.execute(
            f'UPDATE {table} SET nome = %s WHERE nome = %s',
            [old, new],
        )


class Migration(migrations.Migration):
    dependencies = [
        ('professioniste', '0013_professionista_pausa'),
    ]

    operations = [
        migrations.RunPython(rename_categorie_forward, rename_categorie_backward),
        migrations.AlterField(
            model_name='categoria',
            name='nome',
            field=models.CharField(
                choices=[
                    ('donna', 'Donna'),
                    ('trans', 'Trans'),
                    ('coppia', 'Coppia'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
    ]
