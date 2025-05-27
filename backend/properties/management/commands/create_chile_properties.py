from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User
import random

class Command(BaseCommand):
    help = 'Crea propiedades de ejemplo en Chile'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=25, help='Número de propiedades a crear')

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
        
        # Ubicaciones específicas desde región central hasta Punta Arenas
        locations = [
            # Región Metropolitana
            {'name': 'Pirque', 'lat': -33.6642, 'lon': -70.5918, 'region': 'Metropolitana'},
            {'name': 'Melipilla', 'lat': -33.6869, 'lon': -71.2158, 'region': 'Metropolitana'},
            {'name': 'San José de Maipo', 'lat': -33.6444, 'lon': -70.3522, 'region': 'Metropolitana'},
            {'name': 'Talagante', 'lat': -33.6650, 'lon': -70.9286, 'region': 'Metropolitana'},
            
            # Región de O'Higgins
            {'name': 'Rancagua', 'lat': -34.1708, 'lon': -70.7394, 'region': "O'Higgins"},
            {'name': 'San Fernando', 'lat': -34.5883, 'lon': -70.9889, 'region': "O'Higgins"},
            {'name': 'Pichilemu', 'lat': -34.3928, 'lon': -72.0089, 'region': "O'Higgins"},
            {'name': 'Santa Cruz', 'lat': -34.6394, 'lon': -71.3656, 'region': "O'Higgins"},
            
            # Región del Maule
            {'name': 'Talca', 'lat': -35.4232, 'lon': -71.6483, 'region': 'Maule'},
            {'name': 'Curicó', 'lat': -34.9769, 'lon': -71.2394, 'region': 'Maule'},
            {'name': 'Linares', 'lat': -35.8475, 'lon': -71.5958, 'region': 'Maule'},
            {'name': 'Constitución', 'lat': -35.3328, 'lon': -72.4103, 'region': 'Maule'},
            
            # Región de Ñuble
            {'name': 'Chillán', 'lat': -36.6061, 'lon': -72.1036, 'region': 'Ñuble'},
            {'name': 'San Carlos', 'lat': -36.4239, 'lon': -71.9581, 'region': 'Ñuble'},
            
            # Región del Biobío
            {'name': 'Concepción', 'lat': -36.8270, 'lon': -73.0444, 'region': 'Biobío'},
            {'name': 'Los Ángeles', 'lat': -37.4689, 'lon': -72.3536, 'region': 'Biobío'},
            {'name': 'Arauco', 'lat': -37.2464, 'lon': -73.3169, 'region': 'Biobío'},
            {'name': 'Cañete', 'lat': -37.8000, 'lon': -73.4000, 'region': 'Biobío'},
            
            # Región de la Araucanía
            {'name': 'Temuco', 'lat': -38.7359, 'lon': -72.5904, 'region': 'Araucanía'},
            {'name': 'Pucón', 'lat': -39.2831, 'lon': -71.9589, 'region': 'Araucanía'},
            {'name': 'Villarrica', 'lat': -39.2839, 'lon': -72.2272, 'region': 'Araucanía'},
            {'name': 'Nueva Imperial', 'lat': -38.7433, 'lon': -72.9500, 'region': 'Araucanía'},
            
            # Región de Los Ríos
            {'name': 'Valdivia', 'lat': -39.8142, 'lon': -73.2459, 'region': 'Los Ríos'},
            {'name': 'La Unión', 'lat': -40.2925, 'lon': -73.0825, 'region': 'Los Ríos'},
            {'name': 'Panguipulli', 'lat': -39.6425, 'lon': -72.3356, 'region': 'Los Ríos'},
            {'name': 'Futrono', 'lat': -40.1331, 'lon': -72.3967, 'region': 'Los Ríos'},
            
            # Región de Los Lagos
            {'name': 'Puerto Montt', 'lat': -41.4693, 'lon': -72.9344, 'region': 'Los Lagos'},
            {'name': 'Puerto Varas', 'lat': -41.3317, 'lon': -72.9898, 'region': 'Los Lagos'},
            {'name': 'Osorno', 'lat': -40.5731, 'lon': -73.1322, 'region': 'Los Lagos'},
            {'name': 'Frutillar', 'lat': -41.1264, 'lon': -73.0344, 'region': 'Los Lagos'},
            {'name': 'Castro', 'lat': -42.4828, 'lon': -73.7647, 'region': 'Los Lagos'},
            {'name': 'Ancud', 'lat': -41.8697, 'lon': -73.8300, 'region': 'Los Lagos'},
            
            # Región de Aysén
            {'name': 'Coyhaique', 'lat': -45.5752, 'lon': -72.0662, 'region': 'Aysén'},
            {'name': 'Puerto Aysén', 'lat': -45.4023, 'lon': -72.6927, 'region': 'Aysén'},
            {'name': 'Chile Chico', 'lat': -46.5408, 'lon': -71.7225, 'region': 'Aysén'},
            {'name': 'Villa O\'Higgins', 'lat': -48.4658, 'lon': -72.5717, 'region': 'Aysén'},
            
            # Región de Magallanes
            {'name': 'Punta Arenas', 'lat': -53.1638, 'lon': -70.9171, 'region': 'Magallanes'},
            {'name': 'Puerto Natales', 'lat': -51.7236, 'lon': -72.5064, 'region': 'Magallanes'},
            {'name': 'Porvenir', 'lat': -53.2919, 'lon': -70.3703, 'region': 'Magallanes'},
            {'name': 'Puerto Williams', 'lat': -54.9333, 'lon': -67.6167, 'region': 'Magallanes'},
        ]

        property_types = ['farm', 'ranch', 'forest', 'lake']
        property_names = [
            'Fundo El Mirador', 'Estancia Los Andes', 'Campo Verde', 'Rancho Andino', 
            'Hacienda del Lago', 'Campo Los Arrayanes', 'Estancia del Valle', 
            'Fundo San Francisco', 'Campo Las Lengas', 'Rancho El Volcán',
            'Estancia del Bosque', 'Campo Los Copihues', 'Rancho Nevado',
            'Fundo Los Quillayes', 'Campo La Esperanza', 'Estancia Patagónica',
            'Hacienda Vista Mar', 'Campo Los Robles', 'Fundo El Refugio',
            'Rancho Los Coigües', 'Estancia del Sur', 'Campo Los Cipreses'
        ]

        created_count = 0
        for i in range(count):
            location = random.choice(locations)
            
            # Añadir variación a las coordenadas para evitar propiedades exactamente en el mismo lugar
            lat_variation = random.uniform(-0.05, 0.05)
            lon_variation = random.uniform(-0.05, 0.05)
            
            property_data = {
                'name': f"{random.choice(property_names)} - {location['name']}",
                'description': f"Hermosa propiedad ubicada en {location['name']}, región de {location['region']}. Perfecta para inversión o desarrollo rural.",
                'price': random.randint(50000, 2000000),
                'size': random.randint(10, 5000),
                'type': random.choice(property_types),
                'latitude': location['lat'] + lat_variation,
                'longitude': location['lon'] + lon_variation,
                'has_water': random.choice([True, False]),
                'has_views': random.choice([True, True, False]),  # Bias towards True
                'owner': user,
            }

            try:
                property_obj = Property.objects.create(**property_data)
                self.stdout.write(f"Created: {property_obj.name}")
                created_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating property: {e}"))

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} properties in Chile!')
        ) 