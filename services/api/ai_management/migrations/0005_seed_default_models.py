from django.db import migrations


def create_default_models(apps, schema_editor):
    AIModel = apps.get_model('ai_management', 'AIModel')
    SamConfiguration = apps.get_model('ai_management', 'SamConfiguration')

    defaults = [
        {
            'name': 'Gemini 2.5 Flash-Lite',
            'api_name': 'gemini-2.5-flash-lite',
            'price_per_1k_tokens_input': 0.00010,
            'price_per_1k_tokens_output': 0.00040,
            'max_tokens': 1048576,
            'supports_thinking': True,
            'is_active': True,
        },
        {
            'name': 'Gemini 2.5 Flash',
            'api_name': 'gemini-2.5-flash',
            'price_per_1k_tokens_input': 0.00035,
            'price_per_1k_tokens_output': 0.00050,
            'max_tokens': 1048576,
            'supports_thinking': True,
            'is_active': True,
        },
        {
            'name': 'Gemini 2.5 Pro',
            'api_name': 'gemini-2.5-pro',
            'price_per_1k_tokens_input': 0.00350,
            'price_per_1k_tokens_output': 0.00700,
            'max_tokens': 1048576,
            'supports_thinking': True,
            'is_active': True,
        },
    ]

    for data in defaults:
        AIModel.objects.update_or_create(api_name=data['api_name'], defaults=data)

    config, _ = SamConfiguration.objects.get_or_create(pk=1)
    if config.current_model_id is None:
        first_model = AIModel.objects.filter(is_active=True).order_by('id').first()
        if first_model:
            config.current_model = first_model
            config.save(update_fields=['current_model'])


def noop_reverse(apps, schema_editor):
    # Do not delete models on reverse migration to avoid removing seeded data intentionally
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('ai_management', '0004_alter_aimodel_api_name'),
    ]

    operations = [
        migrations.RunPython(create_default_models, noop_reverse),
    ]
