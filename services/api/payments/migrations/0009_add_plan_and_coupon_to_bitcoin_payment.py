from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0008_extend_subscription_statuses'),
    ]

    operations = [
        migrations.AddField(
            model_name='bitcoinpayment',
            name='plan_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='bitcoinpayment',
            name='coupon_code',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
