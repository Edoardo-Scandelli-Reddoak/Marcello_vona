from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='PageView',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('path', models.CharField(db_index=True, max_length=500)),
                ('ip_hash', models.CharField(db_index=True, max_length=64)),
                ('user_agent', models.CharField(blank=True, default='', max_length=500)),
                ('referer', models.CharField(blank=True, default='', max_length=1000)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'verbose_name': 'Visita',
                'verbose_name_plural': 'Visite',
                'ordering': ['-created_at'],
            },
        ),
    ]
