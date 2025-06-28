from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ValidateCouponView, CreateCheckoutSessionView, CouponViewSet, StripeWebhookView

app_name = 'payments'

router = DefaultRouter()
router.register(r'coupons', CouponViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('validate-coupon/', ValidateCouponView.as_view(), name='validate-coupon'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
] 