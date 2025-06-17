# SkyTerra Social Login and Stripe Configuration Guide

This guide outlines the configurations implemented for Google, X (formerly Twitter), Apple social logins, and Stripe recurring payments. Ensure you have the required environment variables set for sensitive keys.

## Prerequisites
- Backend: Django with `dj-rest-auth` and `django-allauth` installed.
- Frontend: React with necessary libraries installed (e.g., `@react-oauth/google`, `react-login-with-twitter`, `react-apple-login`, and Stripe JS).
- Environment: Set up `.env` files for secrets.

## Backend Configuration (in `skyterra_backend/settings.py`)

Add the following to your Django settings:

```python
// ... existing code ...
INSTALLED_APPS = [
    # ... existing apps ...
    'rest_framework',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.twitter',  # For X/Twitter
    'allauth.socialaccount.providers.apple',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'key': '',
        },
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    },
    'twitter': {
        'APP': {
            'client_id': os.environ.get('TWITTER_CLIENT_ID'),
            'secret': os.environ.get('TWITTER_CLIENT_SECRET'),
            'key': '',
        },
    },
    'apple': {
        'APP': {
            'client_id': os.environ.get('APPLE_CLIENT_ID'),
            'secret': os.environ.get('APPLE_CLIENT_SECRET'),
            'key': os.environ.get('APPLE_KEY_ID'),
            'certificate_key': os.environ.get('APPLE_TEAM_ID'),
        },
    },
}

SITE_ID = 1  # Ensure django.contrib.sites is configured

ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
// ... existing code ...
```

For Stripe, add:

```python
// ... existing code ...
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
// ... existing code ...
```

## Frontend Configuration

In `frontend/src/services/api.js`, ensure authentication endpoints are set up for social logins.

For Google in `src/components/ui/AuthForms.jsx`:
- Use `@react-oauth/google` for sign-in buttons.

For X/Twitter in `src/components/ui/AuthForms.jsx`:
- Use `react-login-with-twitter` for login buttons.

For Apple in `src/components/ui/AuthForms.jsx`:
- Use `react-apple-login` for login buttons.

For Stripe in `src/components/checkout/CheckoutPage.jsx` and `src/components/pricing/PricingPage.jsx`:
- Integrate Stripe Elements for payment forms.
- Example subscription setup:
  ```jsx
  // ... existing code ...
  import { loadStripe } from '@stripe/stripe-js';
  const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);
  // Use in components for recurring payments
  // ... existing code ...
  ```

## Stripe Payment Methods Configuration

Stripe soporta múltiples métodos de pago para suscripciones recurrentes:

### Métodos de Pago Soportados:
- **Tarjetas de Crédito/Débito**: Visa, Mastercard, American Express
- **Billeteras Digitales**: Apple Pay, Google Pay, Microsoft Pay
- **Transferencias Bancarias**: ACH Direct Debit (US), SEPA Direct Debit (Europa)
- **Métodos Locales**: 
  - Webpay (Chile) - para pagos únicos y recurrentes
  - OXXO (México) - principalmente para pagos únicos
  - Boleto Bancário (Brasil)

### Configuración en el Backend:

```python
# En payments/views.py - configurar métodos de pago permitidos
STRIPE_PAYMENT_METHODS = [
    'card',
    'apple_pay',
    'google_pay',
    'webpay',  # Para usuarios en Chile
]

# Para suscripciones, configurar en create_subscription:
def create_subscription():
    stripe.Subscription.create(
        customer=customer_id,
        items=[{'price': price_id}],
        payment_settings={
            'payment_method_types': ['card', 'apple_pay', 'google_pay'],
            'save_default_payment_method': 'on_subscription'
        }
    )
```

### Configuración en el Frontend:

```jsx
// En CheckoutPage.jsx - configurar elementos de Stripe
const options = {
  mode: 'subscription',
  amount: 1000, // en centavos
  currency: 'usd',
  automatic_payment_methods: {
    enabled: true,
  },
  payment_method_types: ['card', 'apple_pay', 'google_pay']
};
```

## Environment Variables
Add these to your `.env` file:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- TWITTER_CLIENT_ID
- TWITTER_CLIENT_SECRET
- APPLE_CLIENT_ID
- APPLE_CLIENT_SECRET
- APPLE_KEY_ID
- APPLE_TEAM_ID
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_PRICE_ID (for specific subscription plans)

## Configuración Adicional de Stripe

### URLs del Backend (`skyterra_backend/urls.py`):
```python
# Agregar endpoints para Stripe
urlpatterns = [
    # ... existing patterns ...
    path('api/payments/', include('payments.urls')),
    path('api/stripe/webhook/', stripe_webhook_view, name='stripe_webhook'),
]
```

### Webhooks de Stripe:
Configura webhooks en el Dashboard de Stripe para:
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`

### Librerías Necesarias:

**Backend:**
```bash
pip install stripe dj-rest-auth django-allauth
```

**Frontend:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install @react-oauth/google react-login-with-twitter react-apple-login
```

## Next Steps
- Configurar credenciales en los dashboards de Google, Twitter/X, Apple y Stripe
- Agregar webhooks de Stripe en el dashboard
- Run migrations and restart the server after updates
- Test logins and payments in a development environment
- Configurar métodos de pago locales según la región de usuarios 