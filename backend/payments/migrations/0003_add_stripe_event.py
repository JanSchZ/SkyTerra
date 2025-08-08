from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_subscription'),
    ]

    operations = [
        migrations.CreateModel(
            name='StripeEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idempotency_key', models.CharField(max_length=255, unique=True)),
                ('type', models.CharField(max_length=100)),
                ('payload', models.JSONField()),
                ('received_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-received_at'],
            },
        ),
    ]


