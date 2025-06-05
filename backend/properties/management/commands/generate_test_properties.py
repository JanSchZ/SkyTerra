from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User
import random

class Command(BaseCommand):
    help = 'Generates 20 dummy properties for testing purposes.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Deleting existing test properties (if any)...'))
        Property.objects.filter(name__startswith='Propiedad de Prueba').delete()
        self.stdout.write(self.style.SUCCESS('Existing test properties deleted.'))

        # Get an owner, or use None if no users exist
        owner = User.objects.first()

        property_types = [choice[0] for choice in Property.PROPERTY_TYPES]
        
        self.stdout.write(self.style.SUCCESS('Generating 20 new test properties...'))

        for i in range(1, 21):
            name = f'Propiedad de Prueba {i}'
            prop_type = random.choice(property_types)
            price = random.randint(10000000, 500000000) # Precios entre 10M y 500M
            size = round(random.uniform(1, 500), 2) # Tamaño entre 1 y 500 hectáreas
            latitude = random.uniform(-35.0, -32.0) # Latitud en un rango de Chile (ej. Santiago a Chillán)
            longitude = random.uniform(-72.0, -69.0) # Longitud en un rango de Chile

            property = Property.objects.create(
                owner=owner,
                name=name,
                type=prop_type,
                price=price,
                size=size,
                latitude=latitude,
                longitude=longitude,
                description=f'Esta es la descripción de la {name}. Una propiedad ideal para {prop_type}.',
                has_water=random.choice([True, False]),
                has_views=random.choice([True, False]),
                publication_status='approved'
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created property: {property.name}'))

        self.stdout.write(self.style.SUCCESS('Successfully generated 20 test properties.')) 