from django.db import migrations, models


def professionista_to_escort(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(user_type='professionista').update(user_type='escort')


def escort_to_professionista(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(user_type='escort').update(user_type='professionista')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(professionista_to_escort, escort_to_professionista),
        migrations.AlterField(
            model_name='user',
            name='user_type',
            field=models.CharField(
                choices=[('user', 'Utente'), ('escort', 'Escort')],
                default='user',
                max_length=20,
            ),
        ),
    ]
