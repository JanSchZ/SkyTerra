# Generated by Django 5.2.1 on 2025-05-18 05:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='type',
            field=models.CharField(choices=[('farm', 'Farm'), ('ranch', 'Ranch'), ('forest', 'Forest'), ('lake', 'Lake')], default='farm', max_length=50),
        ),
    ]
