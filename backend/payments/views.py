from django.shortcuts import render
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import Coupon
from .serializers import CouponSerializer

import stripe
from django.conf import settings
from django.http import JsonResponse

# Create your views here.

class ValidateCouponView(APIView):
    """
    Validates a coupon code and returns its details if it is valid.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        code = request.data.get('code', None)
        if not code:
            return Response({'error': 'Coupon code not provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(
                code__iexact=code,
                is_active=True,
                valid_from__lte=timezone.now(),
                valid_to__gte=timezone.now()
            )
            serializer = CouponSerializer(coupon)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid or expired coupon code.'}, status=status.HTTP_404_NOT_FOUND)


class CouponViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows coupons to be viewed or edited.
    """
    queryset = Coupon.objects.all().order_by('-created_at')
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]


class CreateCheckoutSessionView(APIView):
    """
    Creates a Stripe Checkout Session for the selected plan.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        plan = request.data.get('plan')
        coupon_code = request.data.get('coupon_code')

        if not plan:
            return Response({'error': 'Plan not provided.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Basic price parsing from string like "1,5 UF" or "Desde 5 UF"
            price_str = plan.get('price', '0').replace(',', '.').split(' ')[-2]
            unit_amount = int(float(price_str) * 100) # Convert to cents
            
            line_items = [{
                'price_data': {
                    'currency': 'clp', # Assuming CLP, Stripe does not support UF
                    'product_data': {
                        'name': plan.get('title', 'Sin Título'),
                        'description': f"Plan {plan.get('title')} en SkyTerra",
                    },
                    'unit_amount': unit_amount, # This should be adjusted based on real UF to CLP conversion
                },
                'quantity': 1,
            }]
            
            discounts = []
            if coupon_code:
                try:
                    # We can reuse the coupon validation logic or just fetch it
                    coupon = Coupon.objects.get(code__iexact=coupon_code, is_active=True)
                    # This is a simplification. Stripe needs a coupon ID created via the Stripe API.
                    # For a real implementation, you'd sync your coupons with Stripe.
                    # For now, we are creating a Stripe coupon on the fly.
                    stripe_coupon = stripe.Coupon.create(
                        percent_off=float(coupon.value) if coupon.discount_type == 'percentage' else None,
                        amount_off=int(coupon.value * 100) if coupon.discount_type == 'fixed' else None,
                        currency='clp',
                        duration='once'
                    )
                    discounts.append({'coupon': stripe_coupon.id})

                except Coupon.DoesNotExist:
                    return Response({'error': 'Coupon not found.'}, status=status.HTTP_400_BAD_REQUEST)


            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=settings.CLIENT_URL + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.CLIENT_URL + '/payment-cancelled',
                customer_email=request.user.email,
                discounts=discounts
            )
            
            return JsonResponse({'id': checkout_session.id})

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
