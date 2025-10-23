from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0022_job_pilot_rating'),
    ]

    operations = [
        migrations.CreateModel(
            name='PilotDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_token', models.CharField(help_text='Token de dispositivo para notificaciones push', max_length=255, unique=True)),
                ('device_type', models.CharField(choices=[('ios', 'iOS'), ('android', 'Android')], help_text='Tipo de dispositivo', max_length=32)),
                ('is_active', models.BooleanField(default=True, help_text='Si el dispositivo está activo para recibir notificaciones')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('pilot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='devices', to='properties.pilotprofile')),
            ],
            options={
                'verbose_name': 'Dispositivo de Piloto',
                'verbose_name_plural': 'Dispositivos de Pilotos',
            },
        ),
    ]
