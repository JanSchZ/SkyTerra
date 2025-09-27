from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_alter_bitcoinpayment_amount'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BTCPayInvoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invoice_id', models.CharField(max_length=128, unique=True)),
                ('status', models.CharField(choices=[('new', 'New'), ('processing', 'Processing'), ('paid', 'Paid'), ('confirmed', 'Confirmed'), ('complete', 'Complete'), ('invalid', 'Invalid'), ('expired', 'Expired')], default='new', max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0)])),
                ('currency', models.CharField(default='USD', max_length=10)),
                ('checkout_link', models.URLField(blank=True, null=True)),
                ('plan_title', models.CharField(blank=True, max_length=100, null=True)),
                ('metadata', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='btcpay_invoices', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='BTCPayEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('idempotency_key', models.CharField(max_length=255, unique=True)),
                ('type', models.CharField(max_length=100)),
                ('payload', models.JSONField()),
                ('received_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['-received_at']},
        ),
    ]


