from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0015_ai_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='property',
            name='type',
            field=models.CharField(max_length=50, null=True, blank=True),
        ),
    ]


