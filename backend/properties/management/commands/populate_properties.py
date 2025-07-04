import random
from decimal import Decimal, ROUND_DOWN
from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Populates the database with a large number of properties in different countries.'

    def handle(self, *args, **options):
        self.stdout.write('Starting property population...')

        # Ensure a user exists to be the owner
        user, created = User.objects.get_or_create(username='default_user')
        if created:
            user.set_password('password')
            user.save()
            self.stdout.write(self.style.SUCCESS('Created default user.'))

        # --- Data for properties ---
        locations = {
            'USA': {
                'coords': [
                    (34.0522, -118.2437), (40.7128, -74.0060), (41.8781, -87.6298), 
                    (29.7604, -95.3698), (33.4484, -112.0740), (39.9526, -75.1652),
                    (25.7617, -80.1918), (47.6062, -122.3321), (36.1699, -115.1398),
                    (30.2672, -97.7431) 
                ],
                'count': 100
            },
            'Chile': {
                'coords': [
                    (-33.4489, -70.6693), (-33.0472, -71.6127), (-36.8201, -73.0443),
                    (-41.4728, -72.9396), (-23.6500, -70.4000), (-53.1638, -70.9171)
                ],
                'count': 60
            },
            'Mexico': {
                'coords': [
                    (19.4326, -99.1332), (20.6597, -103.3496), (25.6866, -100.3161),
                    (21.1619, -86.8515), (16.7500, -93.1167)
                ],
                'count': 60
            }
        }

        property_types = ['farm', 'ranch', 'forest', 'lake']
        listing_types = ['sale', 'rent', 'both']

        for country, data in locations.items():
            self.stdout.write(f'Populating properties for {country}...')
            
            existing_count = Property.objects.filter(
                latitude__gte=min(c[0] for c in data['coords']),
                latitude__lte=max(c[0] for c in data['coords']),
                longitude__gte=min(c[1] for c in data['coords']),
                longitude__lte=max(c[1] for c in data['coords']),
            ).count()

            needed = data['count'] - existing_count
            if needed <= 0:
                self.stdout.write(self.style.SUCCESS(f'{country} already has enough properties.'))
                continue

            for i in range(needed):
                base_lat, base_lon = random.choice(data['coords'])
                
                price_val = Decimal(str(random.uniform(50000, 2000000))).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                
                listing_type = random.choice(listing_types)
                rent_price_val = None
                if listing_type in ['rent', 'both']:
                    rent_price_val = Decimal(str(random.uniform(500, 10000))).quantize(Decimal('0.01'), rounding=ROUND_DOWN)

                prop = Property(
                    owner=user,
                    name=f"{random.choice(['Grand', 'Sunny', 'Quiet', 'Lakeside', 'Mountain'])} {random.choice(['View', 'Hills', 'Meadows', 'Ranch'])} #{i+1} ({country})",
                    type=random.choice(property_types),
                    price=price_val,
                    size=random.uniform(10, 5000),
                    latitude=base_lat + random.uniform(-2.5, 2.5),
                    longitude=base_lon + random.uniform(-2.5, 2.5),
                    description=f"A beautiful property in {country}. Ideal for {random.choice(property_types)}.",
                    has_water=random.choice([True, False]),
                    has_views=random.choice([True, False]),
                    publication_status='approved',
                    listing_type=listing_type,
                    rent_price=rent_price_val,
                )
                prop.save()

            self.stdout.write(self.style.SUCCESS(f'Successfully added {needed} properties to {country}.'))

        self.stdout.write(self.style.SUCCESS('Property population complete.'))
