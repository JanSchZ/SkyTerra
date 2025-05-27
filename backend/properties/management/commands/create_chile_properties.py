import random
from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Create sample properties in Chile'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=20, help='Number of properties to create')

    def handle(self, *args, **options):
        count = options['count']
        
        # Get or create a default user
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@skyterra.com',
                'first_name': 'Admin',
                'last_name': 'SkyTerra'
            }
        )
        if created:
            user.set_password('admin123')
            user.is_superuser = True
            user.is_staff = True
            user.save()

        # Chilean regions and coordinates
        chile_locations = [
            # Sur de Chile - Región de Los Lagos
            {'name': 'Puerto Varas', 'lat': -41.3139, 'lon': -72.9895},
            {'name': 'Frutillar', 'lat': -41.1289, 'lon': -73.0372},
            {'name': 'Puerto Montt', 'lat': -41.4693, 'lon': -72.9424},
            {'name': 'Osorno', 'lat': -40.5736, 'lon': -73.1339},
            
            # Región de Los Ríos
            {'name': 'Valdivia', 'lat': -39.8142, 'lon': -73.2459},
            {'name': 'La Unión', 'lat': -40.2928, 'lon': -73.0831},
            {'name': 'Panguipulli', 'lat': -39.6431, 'lon': -72.3472},
            
            # Región de la Araucanía
            {'name': 'Temuco', 'lat': -38.7359, 'lon': -72.5904},
            {'name': 'Pucón', 'lat': -39.2708, 'lon': -71.9525},
            {'name': 'Villarrica', 'lat': -39.2839, 'lon': -72.2272},
            
            # Región del Biobío
            {'name': 'Concepción', 'lat': -36.8201, 'lon': -73.0444},
            {'name': 'Los Ángeles', 'lat': -37.4691, 'lon': -72.3540},
            {'name': 'Chillán', 'lat': -36.6061, 'lon': -72.1039},
            
            # Región de Aysén
            {'name': 'Coyhaique', 'lat': -45.5752, 'lon': -72.0662},
            {'name': 'Puerto Aysén', 'lat': -45.4023, 'lon': -72.6927},
            
            # Región de Magallanes
            {'name': 'Punta Arenas', 'lat': -53.1638, 'lon': -70.9171},
            {'name': 'Puerto Natales', 'lat': -51.7236, 'lon': -72.5081},
        ]

        property_types = ['farm', 'ranch', 'forest', 'lake']
        property_names = [
            'Estancia Los Andes', 'Hacienda del Lago', 'Campo Verde', 'Rancho El Volcán',
            'Fundo Las Rosas', 'Estancia Patagónica', 'Campo Los Arrayanes', 'Rancho Aurora',
            'Fundo El Mirador', 'Estancia del Bosque', 'Campo Los Copihues', 'Rancho Nevado',
            'Fundo La Esperanza', 'Estancia del Río', 'Campo Los Boldos', 'Rancho Andino',
            'Fundo San Francisco', 'Estancia del Valle', 'Campo Las Lengas', 'Rancho Austral'
        ]

        descriptions = [
            'Hermosa propiedad con vistas panorámicas a los volcanes y lagos de la región.',
            'Extenso campo agrícola con río propio y bosque nativo preservado.',
            'Rancho ganadero con infraestructura completa y acceso directo al lago.',
            'Propiedad forestal sustentable con especies nativas y exóticas.',
            'Campo con potencial turístico, cerca de centros de ski y pesca deportiva.',
            'Estancia patagónica ideal para turismo rural y actividades outdoor.',
            'Fundo mixto con agricultura, ganadería y sector forestal.',
            'Propiedad con gran potencial para desarrollo eco-turístico.',
            'Campo con vistas únicas a la cordillera y valle central.',
            'Rancho familiar con tradición ganadera y facilidades modernas.'
        ]

        created_count = 0
        
        for i in range(count):
            location = random.choice(chile_locations)
            
            # Add some random variation to coordinates
            lat = location['lat'] + random.uniform(-0.1, 0.1)
            lon = location['lon'] + random.uniform(-0.1, 0.1)
            
            property_data = {
                'name': f"{random.choice(property_names)} - {location['name']}",
                'description': random.choice(descriptions),
                'price': random.randint(50000, 2000000),  # USD
                'size': random.randint(10, 5000),  # hectares
                'latitude': lat,
                'longitude': lon,
                'type': random.choice(property_types),
                'has_water': random.choice([True, False]),
                'has_views': random.choice([True, True, False]),  # Bias towards True
                'owner': user,
            }
            
            try:
                property_obj = Property.objects.create(**property_data)
                created_count += 1
                self.stdout.write(f"Created: {property_obj.name}")
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error creating property {i+1}: {str(e)}")
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} properties in Chile!')
        ) 