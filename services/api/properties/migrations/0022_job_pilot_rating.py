from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0021_pilotprofile_base_city_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='pilot_rating',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=3, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='pilot_review_notes',
            field=models.TextField(blank=True),
        ),
    ]
