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
    Creates a Stripe Checkout Session for the selected subscription plan.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # El frontend debe enviar el ID del precio de Stripe (ej. price_xxxxxxxx)
        price_id = request.data.get('priceId')
        coupon_id = request.data.get('couponId') # El frontend debe enviar un ID de cupón de Stripe

        if not price_id:
            return Response({'error': 'Price ID not provided.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Configuración para la sesión de checkout
            session_params = {
                'payment_method_types': ['card', 'webpay'], # Habilitamos tarjeta y Webpay
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription', # Cambiamos a modo de suscripción
                'success_url': settings.CLIENT_URL + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url': settings.CLIENT_URL + '/payment-cancelled',
                'customer_email': request.user.email,
                'allow_promotion_codes': True, # Permitimos que los usuarios ingresen códigos de descuento en la página de Stripe
            }

            # Si se proporciona un ID de cupón, lo aplicamos
            if coupon_id:
                session_params['discounts'] = [{'coupon': coupon_id}]

            checkout_session = stripe.checkout.Session.create(**session_params)
            
            return JsonResponse({'id': checkout_session.id})

        except stripe.error.StripeError as e:
            # Errores específicos de Stripe
            return Response({'error': f"Stripe error: {e.user_message}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Otros errores
            return Response({'error': f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
