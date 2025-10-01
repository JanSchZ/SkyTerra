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
from typing import Any, Optional

from .models import (
    Coupon,
    Subscription,
    StripeEvent,
    BitcoinPayment,
    CoinbaseEvent,
)
from .serializers import CouponSerializer, BitcoinPaymentSerializer

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
        # El frontend puede enviar el ID del precio de Stripe (ej. price_xxxxxxxx).
        # Si no lo envía, intentaremos seleccionar automáticamente un precio recurrente activo.
        price_id = request.data.get('priceId')
        coupon_id = request.data.get('couponId') # El frontend debe enviar un ID de cupón de Stripe

        # Selección automática de un precio recurrente activo si no se proporciona price_id
        if not price_id:
            try:
                prices = stripe.Price.list(active=True, limit=25)
                auto_selected = None
                for p in prices.data:
                    if p.get('type') == 'recurring':
                        interval = (p.get('recurring') or {}).get('interval')
                        if interval in ('month', 'year'):
                            auto_selected = p['id']
                            break
                if auto_selected:
                    price_id = auto_selected
                    logger.info(f"[Stripe] Auto-selected recurring price: {price_id}")
                else:
                    logger.error("[Stripe] No active recurring prices found to auto-select")
                    return Response({'error': 'No active recurring prices found in Stripe. Please configure a recurring Price.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"[Stripe] Error listing prices for auto-select: {e}", exc_info=True)
                return Response({'error': 'Unable to auto-select a Stripe price. Provide priceId.'}, status=status.HTTP_400_BAD_REQUEST)

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
            # Nota: no especifiques payment_method_types para precios de suscripción; Stripe selecciona automáticamente
            session_params = {
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'success_url': settings.CLIENT_URL + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url': settings.CLIENT_URL + '/payment-cancelled',
                'customer_email': request.user.email,
                'allow_promotion_codes': True,
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

    @staticmethod
    def _retrieve_stripe_subscription(subscription_id: Optional[str]) -> Optional[dict[str, Any]]:
        if not subscription_id:
            return None
        try:
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            logger.warning(f"Could not retrieve Stripe subscription {subscription_id}: {exc}")
        return None

    def _find_local_subscription(
        self,
        *,
        stripe_subscription_id: Optional[str] = None,
        stripe_customer_id: Optional[str] = None,
    ) -> Optional[Subscription]:
        subscription = None
        if stripe_subscription_id:
            subscription = Subscription.objects.filter(stripe_subscription_id=stripe_subscription_id).first()
        if not subscription and stripe_customer_id:
            subscription = Subscription.objects.filter(stripe_customer_id=stripe_customer_id).first()
        return subscription

    def _sync_subscription(
        self,
        *,
        stripe_subscription: Optional[dict[str, Any]] = None,
        subscription_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        default_status: Optional[str] = None,
        fetch_from_stripe: bool = False,
    ) -> None:
        payload = stripe_subscription
        if payload is None and fetch_from_stripe:
            payload = self._retrieve_stripe_subscription(subscription_id)

        stripe_sub_id = (payload or {}).get('id') or subscription_id
        stripe_cust_id = (payload or {}).get('customer') or customer_id

        subscription = self._find_local_subscription(
            stripe_subscription_id=stripe_sub_id,
            stripe_customer_id=stripe_cust_id,
        )

        if not subscription:
            logger.warning(
                "Stripe webhook: local subscription not found (stripe_subscription_id=%s, stripe_customer_id=%s)",
                stripe_sub_id,
                stripe_cust_id,
            )
            return

        subscription.apply_stripe_payload(payload, default_status=default_status)

    def post(self, request, format=None):
        # Ensure Stripe API key is set for any API calls inside the handler
        stripe.api_key = settings.STRIPE_SECRET_KEY
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

        # Idempotency: skip already processed events
        try:
            StripeEvent.objects.get(idempotency_key=event['id'])
            logger.info(f"Stripe event {event['id']} already processed, skipping.")
            return HttpResponse(status=200)
        except StripeEvent.DoesNotExist:
            pass

        # Persist event for idempotency and audit
        try:
            StripeEvent.objects.create(
                idempotency_key=event['id'],
                type=event['type'],
                payload=event
            )
        except Exception as e:
            logger.warning(f"Could not store Stripe event {event['id']}: {e}")

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
                    except stripe.error.StripeError as e:
                        logger.warning(f"Could not retrieve Stripe subscription {subscription_id}: {e}")
                        stripe_subscription = None
                else:
                    stripe_subscription = None

                subscription.apply_stripe_payload(stripe_subscription, default_status='active')
                logger.info(f"Subscription for user {user.username} updated/created. Status: {subscription.status}")

            except User.DoesNotExist:
                logger.error(f"User with email {customer_email} not found for checkout session {session['id']}.")
                # Consider creating a placeholder user or flagging for manual review
            except Exception as e:
                logger.error(f"Error processing checkout.session.completed for session {session['id']}: {e}", exc_info=True)

        elif event['type'] in {'invoice.payment_succeeded', 'invoice.paid'}:
            invoice = event['data']['object']
            logger.info(f"Invoice payment succeeded: {invoice['id']}")
            self._sync_subscription(
                subscription_id=invoice.get('subscription'),
                customer_id=invoice.get('customer'),
                default_status='active',
                fetch_from_stripe=True,
            )

        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            logger.warning(f"Invoice payment failed: {invoice['id']}")
            self._sync_subscription(
                subscription_id=invoice.get('subscription'),
                customer_id=invoice.get('customer'),
                default_status='past_due',
                fetch_from_stripe=False,
            )

        elif event['type'] == 'customer.subscription.created':
            stripe_subscription = event['data']['object']
            logger.info(f"Customer subscription created: {stripe_subscription['id']}")
            self._sync_subscription(
                stripe_subscription=stripe_subscription,
                subscription_id=stripe_subscription.get('id'),
                customer_id=stripe_subscription.get('customer'),
                default_status=stripe_subscription.get('status'),
            )

        elif event['type'] == 'customer.subscription.updated':
            stripe_subscription = event['data']['object']
            logger.info(f"Customer subscription updated: {stripe_subscription['id']}")
            self._sync_subscription(
                stripe_subscription=stripe_subscription,
                subscription_id=stripe_subscription.get('id'),
                customer_id=stripe_subscription.get('customer'),
                default_status=stripe_subscription.get('status'),
            )

        elif event['type'] == 'customer.subscription.deleted':
            stripe_subscription = event['data']['object']
            logger.info(f"Customer subscription deleted: {stripe_subscription['id']}")
            self._sync_subscription(
                stripe_subscription=stripe_subscription,
                subscription_id=stripe_subscription.get('id'),
                customer_id=stripe_subscription.get('customer'),
                default_status='canceled',
            )

        else:
            # Unhandled event type
            logger.info(f"Unhandled Stripe event type: {event['type']}")

        return HttpResponse(status=200)


class CreateBitcoinChargeView(APIView):
    """Creates a Coinbase Commerce charge for Bitcoin payment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        api_key = getattr(settings, 'COINBASE_COMMERCE_API_KEY', '')
        if not api_key:
            return Response({'error': 'Bitcoin payments are not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import requests
            amount = request.data.get('amount')
            currency = request.data.get('currency') or getattr(settings, 'COINBASE_COMMERCE_DEFAULT_CURRENCY', 'USD')
            plan_title = request.data.get('planTitle', 'SkyTerra Subscription')

            if not amount:
                return Response({'error': 'Missing amount'}, status=status.HTTP_400_BAD_REQUEST)

            headers = {
                'X-CC-Api-Key': api_key,
                'X-CC-Version': '2018-03-22',
                'Content-Type': 'application/json',
            }
            payload = {
                'name': plan_title,
                'description': 'Pago con Bitcoin/crypto via Coinbase Commerce',
                'pricing_type': 'fixed_price',
                'local_price': {'amount': str(amount), 'currency': currency},
                'metadata': {'user_id': request.user.id, 'email': request.user.email},
                'redirect_url': settings.CLIENT_URL + '/payment-success',
                'cancel_url': settings.CLIENT_URL + '/payment-cancelled',
            }

            resp = requests.post('https://api.commerce.coinbase.com/charges', headers=headers, data=json.dumps(payload))
            if resp.status_code not in (200, 201):
                logger.error(f"Coinbase Commerce create charge error: {resp.status_code} {resp.text}")
                return Response({'error': 'No se pudo crear el cobro en Coinbase Commerce.'}, status=status.HTTP_400_BAD_REQUEST)

            data = resp.json().get('data', {})
            charge_id = data.get('id')
            hosted_url = data.get('hosted_url')

            bp = BitcoinPayment.objects.create(
                user=request.user,
                charge_id=charge_id,
                hosted_url=hosted_url,
                amount=amount,
                currency=currency,
                plan_title=plan_title,
            )

            return Response({'chargeId': bp.charge_id, 'hostedUrl': bp.hosted_url}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"CreateBitcoinChargeView error: {e}", exc_info=True)
            return Response({'error': 'Unexpected error creating Bitcoin charge.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CoinbaseWebhookView(APIView):
    permission_classes = []

    def post(self, request, *args, **kwargs):
        # Verify signature
        import hmac
        import hashlib
        signature = request.META.get('HTTP_X_CC_WEBHOOK_SIGNATURE', '')
        secret = getattr(settings, 'COINBASE_COMMERCE_WEBHOOK_SECRET', '')
        body = request.body

        if not secret:
            logger.warning('Coinbase webhook secret not configured')
            return HttpResponse(status=400)

        computed = hmac.new(key=secret.encode('utf-8'), msg=body, digestmod=hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, signature or ''):
            logger.error('Invalid Coinbase webhook signature')
            return HttpResponse(status=400)

        try:
            event = json.loads(body)
        except Exception:
            return HttpResponse(status=400)

        # Idempotency
        try:
            CoinbaseEvent.objects.get(idempotency_key=event.get('id'))
            return HttpResponse(status=200)
        except CoinbaseEvent.DoesNotExist:
            pass

        try:
            CoinbaseEvent.objects.create(
                idempotency_key=event.get('id'),
                type=event.get('type'),
                payload=event,
            )
        except Exception:
            pass

        # Update BitcoinPayment status based on event type
        try:
            data = event.get('data', {})
            charge_id = data.get('id') or data.get('code')
            timeline = data.get('timeline', [])
            status = (timeline[-1]['status'] if timeline else '').lower()
            if charge_id:
                try:
                    bp = BitcoinPayment.objects.get(charge_id=charge_id)
                    if status in ('completed', 'resolved', 'confirmed'):  # map to confirmed
                        bp.status = 'confirmed'
                    elif status in ('pending', 'new'):  # still pending
                        bp.status = 'pending'
                    elif status in ('failed', 'expired', 'unresolved'):  # failed
                        bp.status = 'failed'
                    elif status in ('canceled', 'voided'):
                        bp.status = 'canceled'
                    elif status in ('delayed'):  # rare
                        bp.status = 'delayed'
                    bp.save()
                except BitcoinPayment.DoesNotExist:
                    logger.warning(f"BitcoinPayment with charge {charge_id} not found")
        except Exception as e:
            logger.error(f"Error handling Coinbase webhook: {e}", exc_info=True)

        return HttpResponse(status=200)


# BTCPay Server removido - enfoque solo en Coinbase Commerce para Bitcoin
