from django.core.management.base import BaseCommand
from properties.models import ListingPlan
from decimal import Decimal

class Command(BaseCommand):
    help = 'Creates default ListingPlan objects that match the frontend plans'

    def handle(self, *args, **options):
        self.stdout.write('Creating default ListingPlan objects...')

        plans_data = [
            # Planes Particulares
            {
                'key': 'basic',
                'name': 'Básico',
                'description': 'Plan básico para dueños particulares',
                'price': Decimal('1.5'),
                'entitlements': {
                    'max_listings': 1,
                    'features': ['Tour 360 + 2 vistas aéreas', 'Publicación destacada', 'Seguimiento de leads']
                },
                'sla_hours': {'review': 48, 'post': 72}
            },
            {
                'key': 'advanced',
                'name': 'Avanzado',
                'description': 'Plan avanzado para dueños particulares',
                'price': Decimal('3.0'),
                'entitlements': {
                    'max_listings': 1,
                    'features': ['Tour virtual con 5 vistas aéreas', 'Video aéreo 4K editado', 'Destacado premium']
                },
                'sla_hours': {'review': 24, 'post': 48}
            },
            {
                'key': 'pro',
                'name': 'Pro',
                'description': 'Plan profesional para dueños particulares',
                'price': Decimal('9.0'),
                'entitlements': {
                    'max_listings': 1,
                    'features': ['7 vistas aéreas + 10 terrestres', 'Pack de contenido para marketing', 'Remarketing y newsletter']
                },
                'sla_hours': {'review': 12, 'post': 24}
            },
            # Planes Profesionales
            {
                'key': 'start',
                'name': 'Start',
                'description': 'Plan Start para vendedores profesionales',
                'price': Decimal('0.5'),
                'entitlements': {
                    'max_listings': 3,
                    'features': ['Hasta 3 terrenos activos', 'Ficha y métricas centralizadas', 'Seguimiento simple']
                },
                'sla_hours': {'review': 48, 'post': 72}
            },
            {
                'key': 'growth',
                'name': 'Growth',
                'description': 'Plan Growth para vendedores profesionales',
                'price': Decimal('1.0'),
                'entitlements': {
                    'max_listings': 10,
                    'features': ['Hasta 10 terrenos activos', 'Pricing comparativo', 'Integración con CRM']
                },
                'sla_hours': {'review': 24, 'post': 48}
            },
            {
                'key': 'enterprise',
                'name': 'Enterprise',
                'description': 'Plan Enterprise para vendedores profesionales',
                'price': Decimal('5.0'),
                'entitlements': {
                    'max_listings': 30,
                    'features': ['Hasta 30 terrenos activos', 'Forecast y reportes', 'Soporte prioritario']
                },
                'sla_hours': {'review': 12, 'post': 24}
            }
        ]

        created_count = 0
        for plan_data in plans_data:
            plan, created = ListingPlan.objects.get_or_create(
                key=plan_data['key'],
                defaults=plan_data
            )
            if created:
                self.stdout.write(f"Created plan: {plan.name} (key: {plan.key})")
                created_count += 1
            else:
                # Update existing plan
                for field, value in plan_data.items():
                    setattr(plan, field, value)
                plan.save()
                self.stdout.write(f"Updated plan: {plan.name} (key: {plan.key})")

        self.stdout.write(self.style.SUCCESS(f'Successfully created/updated {created_count} ListingPlan objects.'))
