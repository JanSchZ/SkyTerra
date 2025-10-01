from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings

# Create your models here.

class Subscription(models.Model):
    """
    Represents a user's subscription status.
    """
    STATUS_CHOICES = [
        ('trialing', 'Trialing'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('unpaid', 'Unpaid'),
        ('paused', 'Paused'),
        ('incomplete', 'Incomplete'),
        ('incomplete_expired', 'Incomplete Expired'),
    ]

    STATUS_MAP = {
        'trialing': 'trialing',
        'active': 'active',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'unpaid': 'unpaid',
        'paused': 'paused',
        'incomplete': 'incomplete',
        'incomplete_expired': 'incomplete_expired',
    }

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='incomplete')
    current_period_end = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} - {self.status}'

    class Meta:
        verbose_name = _("Subscription")
        verbose_name_plural = _("Subscriptions")

    @classmethod
    def normalize_status(cls, raw_status: str | None) -> str:
        """Map Stripe status values to our internal choices."""
        if not raw_status:
            return 'incomplete'
        return cls.STATUS_MAP.get(raw_status.lower(), 'incomplete')

    def apply_stripe_payload(self, stripe_subscription: dict | None = None, default_status: str | None = None) -> None:
        """Update the local subscription instance using Stripe subscription data."""
        data = stripe_subscription or {}
        updated_fields: list[str] = []

        stripe_id = data.get('id')
        if stripe_id and stripe_id != self.stripe_subscription_id:
            self.stripe_subscription_id = stripe_id
            updated_fields.append('stripe_subscription_id')

        customer_id = data.get('customer') or data.get('customer_id')
        if customer_id and customer_id != self.stripe_customer_id:
            self.stripe_customer_id = customer_id
            updated_fields.append('stripe_customer_id')

        status = data.get('status') or default_status
        if status:
            normalized = self.normalize_status(status)
            if normalized != self.status:
                self.status = normalized
                updated_fields.append('status')

        period_end = data.get('current_period_end')
        if period_end:
            dt_value = timezone.datetime.fromtimestamp(period_end, tz=timezone.utc)
            if self.current_period_end != dt_value:
                self.current_period_end = dt_value
                updated_fields.append('current_period_end')

        if updated_fields:
            # auto_now fields must be included when update_fields is provided
            updated_fields.append('updated_at')
            self.save(update_fields=updated_fields)
        else:
            self.save()

class Coupon(models.Model):
    """
    Represents a discount coupon in the system.
    """
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    code = models.CharField(_("Coupon Code"), max_length=50, unique=True)
    discount_type = models.CharField(_("Discount Type"), max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    value = models.DecimalField(_("Discount Value"), max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    # For percentage discounts, a validator to ensure value is between 0 and 100
    # Note: This logic is better handled in form/serializer validation, but can be added here for model-level checks.
    
    is_active = models.BooleanField(_("Is Active"), default=True)
    valid_from = models.DateTimeField(_("Valid From"))
    valid_to = models.DateTimeField(_("Valid To"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.code

    class Meta:
        verbose_name = _("Coupon")
        verbose_name_plural = _("Coupons")
        ordering = ['-created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.discount_type == 'percentage' and (self.value < 0 or self.value > 100):
            raise ValidationError({'value': _('Percentage value must be between 0 and 100.')})
        super().clean()


class StripeEvent(models.Model):
    """Stores processed Stripe webhook events for idempotency and auditing."""
    idempotency_key = models.CharField(max_length=255, unique=True)  # event.id from Stripe
    type = models.CharField(max_length=100)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.type} ({self.idempotency_key})"


class BitcoinPayment(models.Model):
    """
    Records a Coinbase Commerce Bitcoin (or crypto) payment attempt and status.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
        ('delayed', 'Delayed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bitcoin_payments')
    charge_id = models.CharField(max_length=255, unique=True)
    hosted_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=10, default='USD')
    plan_title = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.user_id} {self.status} {self.amount} {self.currency}"


class CoinbaseEvent(models.Model):
    """Stores processed Coinbase Commerce webhook events for idempotency/audit."""
    idempotency_key = models.CharField(max_length=255, unique=True)  # event.id
    type = models.CharField(max_length=100)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.type} ({self.idempotency_key})"


# BTCPay Server models removidos - enfoque solo en Coinbase Commerce
