from rest_framework import serializers
from .models import Coupon, BitcoinPayment, Subscription

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__' 


class BitcoinPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BitcoinPayment
        fields = (
            'id',
            'user',
            'charge_id',
            'hosted_url',
            'status',
            'amount',
            'currency',
            'plan_title',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('charge_id', 'hosted_url', 'status', 'created_at', 'updated_at')


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for user subscription data."""
    is_active = serializers.SerializerMethodField()
    days_until_renewal = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = (
            'id',
            'status',
            'current_period_end',
            'is_active',
            'days_until_renewal',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields
    
    def get_is_active(self, obj):
        """Check if subscription is in an active state."""
        return obj.status in ['active', 'trialing']
    
    def get_days_until_renewal(self, obj):
        """Calculate days until next renewal."""
        if not obj.current_period_end:
            return None
        from django.utils import timezone
        delta = obj.current_period_end - timezone.now()
        return max(0, delta.days)