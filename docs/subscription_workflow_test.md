# Flujo de Suscripción con Cupón de Descuento 100%

Este documento describe el flujo completo de activación de planes con cupones de descuento que dejan el total en $0.

## Problema Original

Cuando un usuario aplicaba un cupón que dejaba el total en 0 pesos ("invita la casa"):
- El plan se activaba en el backend correctamente
- El usuario quedaba en el grupo del plan
- La suscripción se marcaba como `active` en la base de datos
- **PERO** el dashboard del usuario no mostraba que tenía un plan activo
- Al intentar ver planes, lo mandaba a seleccionar planes nuevamente en lugar de mostrar su plan actual

## Solución Implementada

### 1. Backend (Django)

#### Serializers (`services/api/payments/serializers.py`)
Se agregó un nuevo `SubscriptionSerializer` que incluye:
- `status`: Estado de la suscripción
- `current_period_end`: Fecha de renovación
- `is_active`: Campo calculado que indica si la suscripción está activa
- `days_until_renewal`: Días restantes hasta la renovación

#### Views (`services/api/payments/views.py`)
Se agregó un nuevo endpoint `MySubscriptionView`:
- **Ruta**: `GET /api/payments/my-subscription/`
- **Autenticación**: Requerida
- **Respuesta**:
```json
{
  "subscription": {
    "id": 1,
    "status": "active",
    "current_period_end": "2025-11-23T00:00:00Z",
    "is_active": true,
    "days_until_renewal": 30,
    "created_at": "2025-10-23T00:00:00Z",
    "updated_at": "2025-10-23T00:00:00Z"
  },
  "active_plan": {
    "id": 1,
    "key": "basic",
    "name": "Básico",
    "description": "Plan básico con cobertura esencial",
    "price": "1.50"
  },
  "has_active_subscription": true
}
```

#### UserSerializer (`services/api/skyterra_backend/serializers.py`)
Se actualizó para incluir:
- `subscription`: Datos completos de la suscripción
- `groups`: Lista de grupos del usuario
- `active_plan`: Detalles del plan activo basado en los grupos

### 2. Frontend (React)

#### Servicio de Pagos (`apps/web/src/services/paymentsService.js`)
Se agregó el método `getMySubscription()`:
```javascript
async getMySubscription() {
  const response = await api.get('/payments/my-subscription/');
  return response?.data ?? response;
}
```

#### Dashboard del Vendedor (`apps/web/src/components/user/SellerDashboardPage.jsx`)
Se actualizó para:
- Detectar si el usuario tiene un plan activo usando `user?.subscription?.is_active && user?.active_plan`
- Mostrar un chip "Activo" cuando tiene plan
- Mostrar días hasta la renovación
- Cambiar el botón entre "Ver planes" y "Gestionar plan" según el estado

#### Página de Gestión de Suscripción (`apps/web/src/components/subscription/SubscriptionManagementPage.jsx`)
Nueva página que muestra:
- Detalles del plan actual
- Estado de la suscripción
- Fecha de próxima renovación
- Opciones de upgrade a otros planes disponibles

#### Página de Precios (`apps/web/src/components/pricing/PricingPage.jsx`)
Se actualizó para:
- Recibir el usuario como prop
- Verificar si ya tiene un plan activo
- Redirigir automáticamente a `/subscription` si ya tiene plan (excepto cuando viene de esa página para hacer upgrade)

## Flujo de Prueba

### Requisitos Previos
1. Usuario registrado y autenticado
2. Cupón configurado con 100% de descuento (código: "invita_la_casa" o similar)

### Pasos de Prueba

#### 1. Activar Plan con Cupón 100% Descuento
1. Ir a `/pricing`
2. Seleccionar un plan (ej: Básico)
3. En la página de checkout, aplicar el cupón de 100% descuento
4. El sistema debe:
   - Mostrar total de 0 UF
   - Activar el flujo "zero-checkout"
   - Llamar a `/payments/zero-checkout/`
   - Luego llamar a `/payments/activate-plan/`
   - Mostrar mensaje de éxito
   - Redirigir a `/payment-success`

#### 2. Verificar Dashboard
1. Ir a `/dashboard`
2. Debe mostrar:
   - Nombre del plan activo (ej: "Básico")
   - Chip verde "Activo"
   - Texto "Renovación en X días"
   - Botón "Gestionar plan" (no "Ver planes")

#### 3. Verificar Redirección desde Pricing
1. Intentar ir a `/pricing`
2. Debe redirigir automáticamente a `/subscription`

#### 4. Verificar Página de Gestión
1. En `/subscription` debe mostrar:
   - Título "Mi Suscripción"
   - Detalles del plan actual con chip de estado
   - Precio del plan
   - Fecha de próxima renovación
   - Sección "Otros planes disponibles" con opciones de upgrade

#### 5. Upgrade desde Gestión
1. Hacer clic en "Cambiar a este plan" en un plan diferente
2. Debe redirigir a `/pricing` con el estado correcto
3. No debe redirigir automáticamente de vuelta a `/subscription`

### Verificación en Base de Datos

#### Subscription
```sql
SELECT * FROM payments_subscription WHERE user_id = <user_id>;
```
Debe mostrar:
- `status = 'active'`
- `current_period_end` con una fecha futura
- `stripe_subscription_id` con formato `zero-<uuid>` (para cupones 100%)

#### User Groups
```sql
SELECT g.name 
FROM auth_group g 
JOIN auth_user_groups ug ON g.id = ug.group_id 
WHERE ug.user_id = <user_id>;
```
Debe mostrar el grupo correspondiente al plan (ej: 'basic', 'advanced', 'pro')

## Archivos Modificados

### Backend
- `services/api/payments/serializers.py` - Nuevo SubscriptionSerializer
- `services/api/payments/views.py` - Nuevo MySubscriptionView
- `services/api/payments/urls.py` - Nueva ruta /my-subscription/
- `services/api/skyterra_backend/serializers.py` - UserSerializer actualizado

### Frontend
- `apps/web/src/services/paymentsService.js` - Nuevo método getMySubscription()
- `apps/web/src/components/user/SellerDashboardPage.jsx` - Lógica de detección de plan activo
- `apps/web/src/components/subscription/SubscriptionManagementPage.jsx` - Nueva página
- `apps/web/src/components/pricing/PricingPage.jsx` - Lógica de redirección
- `apps/web/src/App.jsx` - Nueva ruta /subscription

## Notas Técnicas

### Detección de Plan Activo
La lógica de detección verifica DOS condiciones:
```javascript
const hasActivePlan = user?.subscription?.is_active && user?.active_plan;
```

Esto asegura que:
1. El usuario tiene una suscripción con estado activo/trialing
2. El usuario tiene un plan asignado en sus grupos

### Zero Checkout
El flujo "zero-checkout" asigna IDs ficticios:
- `stripe_subscription_id`: `zero-<uuid>`
- `stripe_customer_id`: `zero-<user_id>`

Esto permite distinguir suscripciones gratuitas de las pagadas en Stripe.

### Renovación Automática
El sistema establece `current_period_end` a 30 días desde la activación por defecto.
Esto puede ajustarse según las políticas del negocio.

## Troubleshooting

### El dashboard no muestra el plan activo
- Verificar que `user.subscription.is_active` sea `true`
- Verificar que `user.active_plan` no sea `null`
- Verificar que el usuario esté en el grupo correcto

### La página de pricing no redirige
- Verificar que el componente reciba el prop `user`
- Verificar que el ProtectedRoute esté pasando el usuario correctamente
- Verificar el valor de `origin` en el state de navegación

### El endpoint /my-subscription/ devuelve 401
- Verificar que el token JWT esté presente y válido
- Verificar que el middleware de autenticación esté funcionando

## Próximos Pasos Sugeridos

1. Implementar notificaciones de renovación cercana
2. Agregar métricas de uso del plan
3. Implementar cancelación de suscripción
4. Agregar historial de pagos y facturas
5. Implementar downgrade de plan

