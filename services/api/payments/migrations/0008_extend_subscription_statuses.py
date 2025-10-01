from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0007_delete_btcpayevent_delete_btcpayinvoice"),
    ]

    operations = [
        migrations.AlterField(
            model_name="subscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("trialing", "Trialing"),
                    ("active", "Active"),
                    ("past_due", "Past Due"),
                    ("canceled", "Canceled"),
                    ("unpaid", "Unpaid"),
                    ("paused", "Paused"),
                    ("incomplete", "Incomplete"),
                    ("incomplete_expired", "Incomplete Expired"),
                ],
                default="incomplete",
                max_length=20,
            ),
        ),
    ]
