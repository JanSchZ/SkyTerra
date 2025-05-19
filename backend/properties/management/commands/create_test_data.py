from django.core.management.base import BaseCommand
from properties.models import Property, Tour, Image
import random

class Command(BaseCommand):
    help = 'Crea datos de prueba para el desarrollo de SkyTerra'

    def handle(self, *args, **options):
        # Crear propiedades
        self.stdout.write('Creando propiedades de prueba...')
        
        # Algunas ubicaciones en Chile (latitud, longitud)
        locations = [
            # Región de Los Lagos
            (-41.4718, -72.9430),  # Puerto Montt
            (-40.5759, -73.0746),  # Valdivia
            (-42.4721, -73.7641),  # Castro
            (-41.8719, -73.8219),  # Ancud
            # Región de Los Ríos
            (-39.8282, -73.2432),  # La Unión
            (-39.5388, -72.0785),  # Panguipulli
            # Región de La Araucanía
            (-38.7359, -72.5903),  # Temuco
            (-39.2805, -72.2254),  # Pucón
        ]
        
        # Borrar datos previos
        Property.objects.all().delete()
        
        properties = []
        for i in range(10):
            loc = random.choice(locations)
            prop = Property.objects.create(
                name=f"Terreno {i+1} en {loc[0]:.2f}, {loc[1]:.2f}",
                price=random.randint(10000, 500000),
                size=random.uniform(5.0, 200.0),
                latitude=loc[0],
                longitude=loc[1],
                description=f"Hermoso terreno con increíbles vistas. Ubicado a {random.randint(5, 50)} km de la ciudad más cercana. {random.randint(50, 200)} metros de camino de acceso.",
                has_water=random.choice([True, False]),
                has_views=random.choice([True, False])
            )
            properties.append(prop)
            self.stdout.write(f"Creada propiedad: {prop.name}")
        
        # Crear tours
        self.stdout.write('Creando tours virtuales...')
        tour_types = ['360', 'video', 'other']
        
        for prop in properties:
            # No todas las propiedades tienen tours
            if random.random() > 0.3:
                tour_type = random.choice(tour_types)
                tour = Tour.objects.create(
                    property=prop,
                    url=f"https://example.com/tours/{prop.id}/{tour_type}",
                    type=tour_type
                )
                self.stdout.write(f"Creado tour {tour.type} para {prop.name}")
        
        # Crear imágenes
        self.stdout.write('Creando imágenes...')
        image_types = ['aerial', 'front', 'side', 'other']
        
        for prop in properties:
            # Cada propiedad tiene entre 2 y 6 imágenes
            for i in range(random.randint(2, 6)):
                img_type = random.choice(image_types)
                order = i
                image = Image.objects.create(
                    property=prop,
                    url=f"https://example.com/images/{prop.id}/{img_type}/{i}.jpg",
                    type=img_type,
                    order=order
                )
                self.stdout.write(f"Creada imagen {img_type} para {prop.name}")
        
        self.stdout.write(self.style.SUCCESS('Datos de prueba creados correctamente')) 