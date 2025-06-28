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
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import logging

from .models import Coupon, Subscription
from .serializers import CouponSerializer

logger = logging.getLogger(__name__)

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
            # Check if user already has a Stripe customer ID
            customer_id = None
            if request.user.is_authenticated:
                try:
                    subscription = Subscription.objects.get(user=request.user)
                    customer_id = subscription.stripe_customer_id
                except Subscription.DoesNotExist:
                    pass # No existing subscription, will create a new customer if needed

            # If no customer_id, Stripe will create one automatically
            # If customer_id exists, Stripe will use it
            
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
                'customer_email': request.user.email, # Pre-fill email
                'allow_promotion_codes': True, # Permitimos que los usuarios ingresen códigos de descuento en la página de Stripe
            }

            if customer_id:
                session_params['customer'] = customer_id
            else:
                # If no customer_id, Stripe will create one and link it to the email
                session_params['customer_email'] = request.user.email

            # Si se proporciona un ID de cupón, lo aplicamos
            if coupon_id:
                session_params['discounts'] = [{'coupon': coupon_id}]

            checkout_session = stripe.checkout.Session.create(**session_params)
            
            return JsonResponse({'id': checkout_session.id})

        except stripe.error.StripeError as e:
            # Errores específicos de Stripe
            logger.error(f"Stripe error creating checkout session: {e}", exc_info=True)
            return Response({'error': f"Stripe error: {e.user_message}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Otros errores
            logger.error(f"Unexpected error creating checkout session: {e}", exc_info=True)
            return Response({'error': f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handles Stripe webhook events.
    """
    permission_classes = [] # No authentication required for webhooks

    def post(self, request, format=None):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            logger.error(f"Stripe Webhook Error: Invalid payload - {e}")
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            logger.error(f"Stripe Webhook Error: Invalid signature - {e}")
            return HttpResponse(status=400)
        except Exception as e:
            logger.error(f"Stripe Webhook Error: Unexpected error during event construction - {e}", exc_info=True)
            return HttpResponse(status=400)

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            logger.info(f"Checkout session completed: {session['id']}")
            
            customer_id = session.get('customer')
            subscription_id = session.get('subscription')
            customer_email = session.get('customer_details', {}).get('email')

            if not customer_email:
                logger.error(f"Checkout session {session['id']} completed but no customer email found.")
                return HttpResponse(status=400)

            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(email=customer_email)

                # Create or update subscription
                subscription, created = Subscription.objects.get_or_create(user=user)
                subscription.stripe_customer_id = customer_id
                subscription.stripe_subscription_id = subscription_id
                subscription.status = 'active'
                # Set current_period_end if available (for recurring subscriptions)
                if subscription_id:
                    try:
                        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
                        subscription.current_period_end = timezone.datetime.fromtimestamp(
                            stripe_subscription.current_period_end, tz=timezone.utc
                        )
                    except stripe.error.StripeError as e:
                        logger.warning(f"Could not retrieve Stripe subscription {subscription_id}: {e}")
                subscription.save()
                logger.info(f"Subscription for user {user.username} updated/created. Status: {subscription.status}")

            except User.DoesNotExist:
                logger.error(f"User with email {customer_email} not found for checkout session {session['id']}.")
                # Consider creating a placeholder user or flagging for manual review
            except Exception as e:
                logger.error(f"Error processing checkout.session.completed for session {session['id']}: {e}", exc_info=True)

        elif event['type'] == 'invoice.payment_succeeded':
            invoice = event['data']['object']
            logger.info(f"Invoice payment succeeded: {invoice['id']}")
            # Update subscription status, etc.
            # You might want to fetch the subscription from your DB using invoice.subscription
            # and update its status and current_period_end

        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            logger.warning(f"Invoice payment failed: {invoice['id']}")
            # Update subscription status to past_due or canceled

        elif event['type'] == 'customer.subscription.updated':
            stripe_subscription = event['data']['object']
            logger.info(f"Customer subscription updated: {stripe_subscription['id']}")
            try:
                subscription = Subscription.objects.get(stripe_subscription_id=stripe_subscription['id'])
                subscription.status = stripe_subscription['status']
                subscription.current_period_end = timezone.datetime.fromtimestamp(
                    stripe_subscription.current_period_end, tz=timezone.utc
                )
                subscription.save()
                logger.info(f"Subscription {subscription.id} updated to status {subscription.status}")
            except Subscription.DoesNotExist:
                logger.warning(f"Subscription with Stripe ID {stripe_subscription['id']} not found in DB.")
            except Exception as e:
                logger.error(f"Error processing customer.subscription.updated for {stripe_subscription['id']}: {e}", exc_info=True)

        elif event['type'] == 'customer.subscription.deleted':
            stripe_subscription = event['data']['object']
            logger.info(f"Customer subscription deleted: {stripe_subscription['id']}")
            try:
                subscription = Subscription.objects.get(stripe_subscription_id=stripe_subscription['id'])
                subscription.status = 'canceled'
                subscription.save()
                logger.info(f"Subscription {subscription.id} marked as canceled.")
            except Subscription.DoesNotExist:
                logger.warning(f"Subscription with Stripe ID {stripe_subscription['id']} not found in DB for deletion.")
            except Exception as e:
                logger.error(f"Error processing customer.subscription.deleted for {stripe_subscription['id']}: {e}", exc_info=True)

        else:
            # Unhandled event type
            logger.info(f"Unhandled Stripe event type: {event['type']}")

        return HttpResponse(status=200)
