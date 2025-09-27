from django.core.management.base import BaseCommand
from properties.models import Property
from django.contrib.auth.models import User
import random

class Command(BaseCommand):
    help = 'Crea propiedades de ejemplo en varios países (Chile, Argentina, México, USA, Australia)'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=80, help='Número total de propiedades a crear (distribuidas por país)')
        parser.add_argument('--chile-ratio', type=float, default=0.5, help='Proporción para Chile (0-1). Ej: 0.5 = 50% en Chile')

    def handle(self, *args, **options):
        total = options['count']
        chile_ratio = max(0.0, min(1.0, options['chile_ratio']))

        # Usuario por defecto
        user, _ = User.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@skyterra.com', 'is_staff': True, 'is_superuser': True}
        )

        def pick(locations):
            loc = random.choice(locations)
            return {
                'latitude': loc['lat'] + random.uniform(-0.05, 0.05),
                'longitude': loc['lon'] + random.uniform(-0.05, 0.05),
                'name_hint': loc['name']
            }

        # Coordenadas por país (ciudades representativas)
        chile_locations = [
            {'name': 'Santiago', 'lat': -33.4489, 'lon': -70.6693},
            {'name': 'Pucón', 'lat': -39.2831, 'lon': -71.9589},
            {'name': 'Puerto Varas', 'lat': -41.3317, 'lon': -72.9898},
            {'name': 'Valdivia', 'lat': -39.8142, 'lon': -73.2459},
            {'name': 'Coyhaique', 'lat': -45.5752, 'lon': -72.0662},
            {'name': 'Punta Arenas', 'lat': -53.1638, 'lon': -70.9171},
        ]
        argentina_locations = [
            {'name': 'Bariloche', 'lat': -41.1335, 'lon': -71.3103},
            {'name': 'Mendoza', 'lat': -32.8895, 'lon': -68.8458},
            {'name': 'Córdoba', 'lat': -31.4201, 'lon': -64.1888},
        ]
        mexico_locations = [
            {'name': 'Guadalajara', 'lat': 20.6597, 'lon': -103.3496},
            {'name': 'Monterrey', 'lat': 25.6866, 'lon': -100.3161},
            {'name': 'Toluca', 'lat': 19.2826, 'lon': -99.6557},
        ]
        usa_locations = [
            {'name': 'Colorado', 'lat': 39.7392, 'lon': -104.9903},
            {'name': 'Oregon', 'lat': 44.0582, 'lon': -121.3153},
            {'name': 'Texas Hill Country', 'lat': 30.2672, 'lon': -97.7431},
        ]
        australia_locations = [
            {'name': 'Tasmania', 'lat': -42.8821, 'lon': 147.3272},
            {'name': 'Victoria Rural', 'lat': -36.9850, 'lon': 144.9850},
            {'name': 'Queensland Rural', 'lat': -22.5750, 'lon': 144.0848},
        ]

        property_types = ['farm', 'ranch', 'forest', 'lake']
        names = [
            'Campo', 'Rancho', 'Estancia', 'Hacienda', 'Fundo', 'Reserva', 'Refugio', 'Lago', 'Bosque'
        ]

        chile_count = int(total * chile_ratio)
        remaining = total - chile_count
        per_other = max(1, remaining // 4)

        plan = [
            ('Chile', chile_locations, chile_count),
            ('Argentina', argentina_locations, per_other),
            ('México', mexico_locations, per_other),
            ('USA', usa_locations, per_other),
            ('Australia', australia_locations, remaining - 3*per_other)
        ]

        created = 0
        for country, locs, cnt in plan:
            for _ in range(max(0, cnt)):
                pick_loc = pick(locs)
                data = {
                    'owner': user,
                    'name': f"{random.choice(names)} {country} — {pick_loc['name_hint']}",
                    'description': f"Propiedad rural en {country}, sector {pick_loc['name_hint']}.",
                    'price': random.randint(50000, 2000000),
                    'size': random.randint(5, 5000),
                    'type': random.choice(property_types),
                    'latitude': pick_loc['latitude'],
                    'longitude': pick_loc['longitude'],
                    'has_water': random.choice([True, False]),
                    'has_views': random.choice([True, True, False]),
                    'publication_status': 'approved'
                }
                try:
                    Property.objects.create(**data)
                    created += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error creando propiedad ({country}): {e}"))
        self.stdout.write(self.style.SUCCESS(f"Creadas {created} propiedades internacionales (Chile por defecto)."))
