from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ValidateCouponView,
    CreateCheckoutSessionView,
    ZeroAmountCheckoutView,
    ActivatePlanView,
    CouponViewSet,
    StripeWebhookView,
    CreateBitcoinChargeView,
    CoinbaseWebhookView,
)

app_name = 'payments'

router = DefaultRouter()
router.register(r'coupons', CouponViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('validate-coupon/', ValidateCouponView.as_view(), name='validate-coupon'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('zero-checkout/', ZeroAmountCheckoutView.as_view(), name='zero-checkout'),
    path('activate-plan/', ActivatePlanView.as_view(), name='activate-plan'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    # Bitcoin (Coinbase Commerce)
    path('bitcoin/create-charge/', CreateBitcoinChargeView.as_view(), name='bitcoin-create-charge'),
    path('bitcoin/webhook/', CoinbaseWebhookView.as_view(), name='coinbase-webhook'),
] 
