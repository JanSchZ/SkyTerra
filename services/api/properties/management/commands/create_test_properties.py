
import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from properties.models import Property
from decimal import Decimal

class Command(BaseCommand):
    help = 'Creates realistic test properties in Southern Chile'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting to create test properties...")

        # Get existing users to assign as owners
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR("No users found. Please create some users first."))
            return

        # Data for realistic properties in Southern Chile
        property_names = [
            "Fundo Los Coihues", "Parcela Orilla de Lago", "Campo Maderero Patagónico",
            "Terreno con Vista al Volcán", "Inversión Forestal en Aysén", "Rincón Secreto en Chiloé",
            "Estancia Río Abajo", "Loteo Brisas del Sur", "Hacienda Cordillerana", "Santuario Natural Privado"
        ]

        locations = {
            "Fundo Los Coihues": {"lat": -41.47, "lon": -72.94, "desc": "Hermoso fundo de 250 hectáreas con bosque nativo, ideal para conservación o proyecto turístico. Acceso a río y senderos. Un refugio de paz con potencial de plusvalía por su ubicación estratégica cerca de Puerto Varas."},
            "Parcela Orilla de Lago": {"lat": -45.57, "lon": -72.07, "desc": "Exclusiva parcela de 5 hectáreas a orillas del Lago General Carrera. Vistas panorámicas a las Capillas de Mármol. Perfecta para segunda vivienda o lodge de pesca. Oportunidad única en una de las zonas más cotizadas de la Patagonia."},
            "Campo Maderero Patagónico": {"lat": -53.16, "lon": -70.92, "desc": "Predio de 1,200 hectáreas con bosque de lenga y ñirre. Plan de manejo forestal sustentable aprobado. Excelente oportunidad de inversión a largo plazo en el corazón de la Patagonia chilena."},
            "Terreno con Vista al Volcán": {"lat": -39.42, "lon": -72.23, "desc": "Terreno de 15 hectáreas con impresionantes vistas al Volcán Villarrica. Tierra fértil para agricultura o para construir la casa de tus sueños. A minutos de Pucón, con excelente conectividad."},
            "Inversión Forestal en Aysén": {"lat": -44.55, "lon": -72.55, "desc": "Campo de 800 hectáreas con plantaciones de pino y eucalipto listas para cosecha. Retorno de inversión atractivo y asegurado. Incluye casa para cuidador y galpones."},
            "Rincón Secreto en Chiloé": {"lat": -42.60, "lon": -73.76, "desc": "Acogedora parcela de 3 hectáreas en la mágica Isla de Chiloé. Bosque nativo, estero y fauna local. Ideal para quienes buscan desconexión y un estilo de vida autosustentable."},
            "Estancia Río Abajo": {"lat": -47.25, "lon": -72.58, "desc": "Vasto campo de 3,000 hectáreas con 5 km de orilla de río. Perfecto para ganadería, pesca deportiva o desarrollo de un proyecto ecoturístico de alto nivel. Naturaleza en su estado más puro."},
            "Loteo Brisas del Sur": {"lat": -41.13, "lon": -73.05, "desc": "Últimos lotes disponibles en exclusivo proyecto inmobiliario. Parcelas de 1 a 3 hectáreas con reglamento de copropiedad que asegura la plusvalía. Urbanización subterránea y acceso controlado."},
            "Hacienda Cordillerana": {"lat": -36.88, "lon": -71.52, "desc": "Espectacular hacienda de 500 hectáreas en la precordillera de Ñuble. Ideal para engorda de ganado o para un proyecto de agroturismo. Vistas a la cordillera y acceso a termas naturales."},
            "Santuario Natural Privado": {"lat": -40.68, "lon": -73.60, "desc": "Propiedad de 75 hectáreas destinada a la conservación. Bosque valdiviano primario, cascadas y una biodiversidad única. Una joya para amantes de la naturaleza y la filantropía."}
        }

        for name in property_names:
            loc_data = locations[name]
            
            property_data = {
                "owner": random.choice(users),
                "name": name,
                "type": random.choice(['farm', 'forest', 'lake', 'ranch']),
                "price": Decimal(random.randrange(150000000, 1200000000, 10000000)), # Precios entre 150M y 1.2B CLP
                "size": random.uniform(5, 3000),
                "latitude": loc_data["lat"] + random.uniform(-0.05, 0.05),
                "longitude": loc_data["lon"] + random.uniform(-0.05, 0.05),
                "description": loc_data["desc"],
                "has_water": random.choice([True, False]),
                "has_views": random.choice([True, False]),
                "publication_status": 'approved',
                "listing_type": random.choice(['sale', 'both']),
                "terrain": random.choice(['flat', 'hills', 'mountains', 'mixed']),
                "access": random.choice(['paved', 'unpaved']),
                "legal_status": random.choice(['clear', 'mortgaged']),
                "utilities": random.sample([ "electricity", "septic_tank", "well_water"], k=random.randint(1,3))
            }

            # Add rental price if listing type is 'both'
            if property_data["listing_type"] == 'both':
                property_data["rent_price"] = Decimal(random.randrange(500000, 2500000, 50000))
                property_data["rental_terms"] = "Arriendo mensual, conversable según duración del contrato."

            try:
                prop = Property.objects.create(**property_data)
                self.stdout.write(self.style.SUCCESS(f'Successfully created property: "{prop.name}"'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating property "{name}": {e}'))

        self.stdout.write(self.style.SUCCESS("Finished creating test properties."))
