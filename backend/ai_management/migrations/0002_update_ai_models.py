# Generated manually for Sam administration features

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('ai_management', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='aimodel',
            name='name',
            field=models.CharField(choices=[('gemini-2.0-flash', 'Gemini 2.0 Flash'), ('gemini-2.5-flash', 'Gemini 2.5 Flash'), ('gemini-2.5-pro', 'Gemini 2.5 Pro')], max_length=50, unique=True),
        ),
        migrations.AddField(
            model_name='aimodel',
            name='api_name',
            field=models.CharField(default='gemini-2.0-flash', help_text='API endpoint name for this model', max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='aimodel',
            name='max_tokens',
            field=models.IntegerField(default=65536, help_text='Maximum output tokens'),
        ),
        migrations.AddField(
            model_name='aimodel',
            name='supports_thinking',
            field=models.BooleanField(default=False, help_text='Model supports thinking capabilities'),
        ),
        migrations.AlterField(
            model_name='aimodel',
            name='system_prompt',
            field=models.TextField(blank=True, help_text='Default system prompt for Sam'),
        ),
        migrations.AddField(
            model_name='aiusagelog',
            name='request_type',
            field=models.CharField(default='chat', help_text='Type of request (chat, search, etc.)', max_length=50),
        ),
        migrations.AddField(
            model_name='aiusagelog',
            name='response_time_ms',
            field=models.PositiveIntegerField(blank=True, help_text='Response time in milliseconds', null=True),
        ),
        migrations.AddField(
            model_name='aiusagelog',
            name='success',
            field=models.BooleanField(default=True, help_text='Whether the request was successful'),
        ),
        migrations.AddField(
            model_name='aiusagelog',
            name='error_message',
            field=models.TextField(blank=True, help_text='Error message if request failed'),
        ),
        migrations.CreateModel(
            name='SamConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_enabled', models.BooleanField(default=True, help_text='Enable/disable Sam globally')),
                ('custom_instructions', models.TextField(blank=True, help_text='Custom instructions for Sam behavior')),
                ('max_conversation_history', models.IntegerField(default=10, help_text='Maximum conversation history to maintain')),
                ('response_temperature', models.FloatField(default=0.7, help_text='Response creativity (0.0-1.0)')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('current_model', models.ForeignKey(blank=True, help_text='Currently selected model for Sam', null=True, on_delete=django.db.models.deletion.SET_NULL, to='ai_management.aimodel')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth.user')),
            ],
            options={
                'verbose_name': 'Sam Configuration',
                'verbose_name_plural': 'Sam Configuration',
            },
        ),
        migrations.AddIndex(
            model_name='aiusagelog',
            index=models.Index(fields=['timestamp'], name='ai_manageme_timesta_d1a8c4_idx'),
        ),
        migrations.AddIndex(
            model_name='aiusagelog',
            index=models.Index(fields=['model_used'], name='ai_manageme_model_u_99c9b7_idx'),
        ),
        migrations.AddIndex(
            model_name='aiusagelog',
            index=models.Index(fields=['user'], name='ai_manageme_user_id_c1b5d3_idx'),
        ),
        migrations.AlterModelOptions(
            name='aiusagelog',
            options={'ordering': ['-timestamp']},
        ),
    ]