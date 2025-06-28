from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings

# Create your models here.

class Subscription(models.Model):
    """
    Represents a user's subscription status.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('canceled', 'Canceled'),
        ('past_due', 'Past Due'),
        ('incomplete', 'Incomplete'),
    ]

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
