from rest_framework import serializers
from .models import Coupon, BitcoinPayment

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