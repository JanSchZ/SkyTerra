from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User
from django.db import models

class Command(BaseCommand):
    help = "Convierte propiedades de prueba existentes en 'pendientes' y las asigna a un usuario regular (demo_user)."

    def handle(self, *args, **options):
        demo_user, _ = User.objects.get_or_create(username='demo_user', defaults={
            'email': 'demo@example.com',
            'is_staff': False
        })

        qs = Property.objects.filter(
            models.Q(name__startswith='Propiedad de Prueba') |
            models.Q(owner__isnull=True) |
            models.Q(owner__is_staff=True)
        )

        total = qs.count()
        updated = qs.update(publication_status='pending', owner=demo_user)

        self.stdout.write(self.style.SUCCESS(
            f'Se encontraron {total} propiedades coincidentes; se actualizaron {updated} a estado "pending" y owner demo_user.'
        )) 