import random
from django.core.management.base import BaseCommand
from properties.models import Property, Tour, Image

class Command(BaseCommand):
    help = 'Crea datos de prueba para la aplicación SkyTerra'

    def handle(self, *args, **options):
        # Limpiar datos existentes
        self.stdout.write('Limpiando datos existentes...')
        Property.objects.all().delete()
        
        # Crear propiedades
        self.stdout.write('Creando propiedades de prueba...')
        
        property_data = [
            {
                'name': 'Granja Riverside',
                'type': 'farm',
                'price': 120000,
                'size': 43.5,
                'latitude': 35.6895,
                'longitude': -78.8867,
                'description': 'Hermosa granja con río que atraviesa la propiedad. Perfecta para cultivos y ganado.',
                'has_water': True,
                'has_views': True
            },
            {
                'name': 'Rancho Valle Verde',
                'type': 'ranch',
                'price': 230000,
                'size': 125.8,
                'latitude': 35.7895,
                'longitude': -78.7867,
                'description': 'Amplio rancho con excelentes instalaciones para ganado y caballos. Casa principal de 4 habitaciones.',
                'has_water': True,
                'has_views': True
            },
            {
                'name': 'Bosque Encantado',
                'type': 'forest',
                'price': 89000,
                'size': 67.2,
                'latitude': 35.5895,
                'longitude': -78.9867,
                'description': 'Hermoso bosque con árboles maduros, perfecto para recreación o inversión en madera.',
                'has_water': False,
                'has_views': True
            },
            {
                'name': 'Lago Cristalino',
                'type': 'lake',
                'price': 175000,
                'size': 32.1,
                'latitude': 35.5995,
                'longitude': -78.7767,
                'description': 'Propiedad con acceso exclusivo a lago. Ideal para pesca y deportes acuáticos.',
                'has_water': True,
                'has_views': True
            },
            {
                'name': 'Granja Productiva',
                'type': 'farm',
                'price': 95000,
                'size': 28.4,
                'latitude': 35.7195,
                'longitude': -78.8967,
                'description': 'Granja productiva con sistema de riego instalado y pequeña casa.',
                'has_water': True,
                'has_views': False
            },
            {
                'name': 'Rancho Panorama',
                'type': 'ranch',
                'price': 315000,
                'size': 183.6,
                'latitude': 35.8895,
                'longitude': -78.5867,
                'description': 'Rancho con vistas panorámicas y excelentes instalaciones para ganadería.',
                'has_water': False,
                'has_views': True
            },
            {
                'name': 'Bosque del Silencio',
                'type': 'forest',
                'price': 78500,
                'size': 45.7,
                'latitude': 35.6195,
                'longitude': -79.0867,
                'description': 'Bosque privado ideal para refugio natural y observación de fauna silvestre.',
                'has_water': False,
                'has_views': False
            },
            {
                'name': 'Propiedad Lago Azul',
                'type': 'lake',
                'price': 225000,
                'size': 51.3,
                'latitude': 35.9895,
                'longitude': -78.4867,
                'description': 'Impresionante propiedad con acceso a lago. Casa de vacaciones incluida.',
                'has_water': True,
                'has_views': True
            }
        ]
        
        # Crear propiedades
        properties = []
        for data in property_data:
            prop = Property.objects.create(**data)
            properties.append(prop)
            self.stdout.write(f'  - Creada propiedad: {prop.name} ({prop.type})')
            
        # Crear tours para algunas propiedades
        self.stdout.write('Creando tours virtuales...')
        tours_data = [
            {
                'property': properties[0],
                'url': 'https://example.com/tour/farm1',
                'type': '360'
            },
            {
                'property': properties[1],
                'url': 'https://example.com/tour/ranch1',
                'type': '360'
            },
            {
                'property': properties[3],
                'url': 'https://example.com/tour/lake1',
                'type': '360'
            },
            {
                'property': properties[7],
                'url': 'https://example.com/tour/lake2',
                'type': 'video'
            }
        ]
        
        for data in tours_data:
            tour = Tour.objects.create(**data)
            self.stdout.write(f'  - Creado tour {tour.type} para {tour.property.name}')
            
        # Crear imágenes para todas las propiedades
        self.stdout.write('Creando imágenes para propiedades...')
        image_types = ['aerial', 'front', 'side', 'other']
        
        for prop in properties:
            for i, img_type in enumerate(image_types):
                Image.objects.create(
                    property=prop,
                    url=f'https://via.placeholder.com/800x600.png?text={prop.name.replace(" ", "+")}_{img_type}',
                    type=img_type,
                    order=i
                )
            self.stdout.write(f'  - Creadas {len(image_types)} imágenes para {prop.name}')
        
        self.stdout.write(self.style.SUCCESS('¡Datos de demostración creados con éxito!')) 