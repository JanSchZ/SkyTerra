from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0014_alter_property_plusvalia_score'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='ai_category',
            field=models.CharField(blank=True, help_text='Categoría inferida por IA (ej. Farm, Ranch, Forest, Lake) o etiquetas internas.', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='property',
            name='ai_summary',
            field=models.TextField(blank=True, help_text='Resumen corto generado por IA para mejorar búsquedas y recomendaciones.', null=True),
        ),
    ]


