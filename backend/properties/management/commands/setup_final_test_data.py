from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from properties.models import Property, Tour, Image, PropertyDocument, PropertyVisit, ComparisonSession, SavedSearch, Favorite
import decimal
from django.db import transaction

class Command(BaseCommand):
    help = 'Deletes all existing data and sets up the database with new, realistic test data based on the final business model.'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('DELETING existing data...'))

        # Deletion
        Favorite.objects.all().delete()
        SavedSearch.objects.all().delete()
        ComparisonSession.objects.all().delete()
        PropertyVisit.objects.all().delete()
        PropertyDocument.objects.all().delete()
        Image.objects.all().delete()
        Tour.objects.all().delete()
        Property.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('--> Properties and related data deleted.'))

        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS('--> Non-superuser users deleted.'))
        
        Group.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('--> All groups deleted.'))

        self.stdout.write(self.style.SUCCESS('Data deletion complete.'))
        self.stdout.write(self.style.NOTICE('---------------------------------'))
        
        self.stdout.write(self.style.WARNING('CREATING new test data...'))

        # 1. Create Groups for plans
        plans = {
            "Dueño Particular": ["Básico", "Avanzado", "Pro"],
            "Vendedor Profesional": ["Start", "Growth", "Enterprise"]
        }

        for user_type, plan_names in plans.items():
            for plan_name in plan_names:
                group_name = f"{user_type} - {plan_name}"
                group, created = Group.objects.get_or_create(name=group_name)
                if created:
                    self.stdout.write(f"Group created: {group_name}")

        # 2. Create Users and assign to groups
        users_to_create = [
            # Dueños Particulares
            {'username': 'dp_basico_1', 'email': 'dp_basico_1@test.com', 'password': 'password', 'group': 'Dueño Particular - Básico', 'first_name': 'Juan', 'last_name': 'Pérez'},
            {'username': 'dp_basico_2', 'email': 'dp_basico_2@test.com', 'password': 'password', 'group': 'Dueño Particular - Básico', 'first_name': 'Ana', 'last_name': 'Gómez'},
            {'username': 'dp_avanzado_1', 'email': 'dp_avanzado_1@test.com', 'password': 'password', 'group': 'Dueño Particular - Avanzado', 'first_name': 'Carlos', 'last_name': 'Soto'},
            {'username': 'dp_pro_1', 'email': 'dp_pro_1@test.com', 'password': 'password', 'group': 'Dueño Particular - Pro', 'first_name': 'Laura', 'last_name': 'Méndez'},
            # Vendedores Profesionales
            {'username': 'vp_start_1', 'email': 'vp_start_1@test.com', 'password': 'password', 'group': 'Vendedor Profesional - Start', 'first_name': 'Andrés', 'last_name': 'Rojas'},
            {'username': 'vp_growth_1', 'email': 'vp_growth_1@test.com', 'password': 'password', 'group': 'Vendedor Profesional - Growth', 'first_name': 'Sofía', 'last_name': 'Castro'},
            {'username': 'vp_enterprise_1', 'email': 'vp_enterprise_1@test.com', 'password': 'password', 'group': 'Vendedor Profesional - Enterprise', 'first_name': 'Martín', 'last_name': 'Díaz'},
        ]

        for user_data in users_to_create:
            user = User.objects.create_user(
                username=user_data['username'], 
                email=user_data['email'], 
                password=user_data['password'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name']
            )
            group = Group.objects.get(name=user_data['group'])
            user.groups.add(group)
            self.stdout.write(f"User created and added to group '{user_data['group']}': {user.username}")

        # 3. Create Properties and assign to users
        properties_to_create = [
            {
                'owner_username': 'dp_basico_1', 'name': 'Campo Agrícola en Teno', 'type': 'farm', 
                'price': decimal.Decimal('125000000'), 'size': 5.2, 'latitude': -34.9703, 'longitude': -71.2655,
                'description': 'Hermoso campo en la fructífera zona de Teno, Región del Maule. Terreno plano, ideal para agricultura o para construir la casa de tus sueños. Cuenta con acceso a agua de riego y vistas despejadas al valle.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_avanzado_1', 'name': 'Parcela con Bosque Nativo, Villarrica', 'type': 'forest', 
                'price': decimal.Decimal('85000000'), 'size': 2.5, 'latitude': -39.2833, 'longitude': -72.2292,
                'description': 'Conserva la magia del sur en esta parcela con 2.5 hectáreas de bosque nativo y un estero que la cruza. Ubicada a minutos de Villarrica, ofrece paz, privacidad y contacto directo con la naturaleza.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_growth_1', 'name': 'Fundo Productivo en Osorno', 'type': 'ranch', 
                'price': decimal.Decimal('450000000'), 'size': 50, 'latitude': -40.5745, 'longitude': -73.1500,
                'description': 'Fundo de 50 hectáreas totalmente operativo en la Región de Los Lagos. Con instalaciones para ganado, praderas mejoradas y derechos de agua. Gran potencial comercial y productivo.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'vp_enterprise_1', 'name': 'Terreno con Orilla de Lago Llanquihue', 'type': 'lake', 
                'price': decimal.Decimal('780000000'), 'size': 3.1, 'latitude': -41.1325, 'longitude': -72.7833,
                'description': 'Exclusivo terreno de 3.1 hectáreas con 100 metros de orilla privada del Lago Llanquihue. Vistas panorámicas e inmejorables al volcán Osorno. Oportunidad única de inversión en una de las zonas más cotizadas de Chile.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_pro_1', 'name': 'Viñedo Boutique, Valle de Colchagua', 'type': 'farm', 
                'price': decimal.Decimal('350000000'), 'size': 7.0, 'latitude': -34.6642, 'longitude': -71.3997,
                'description': 'Pequeño viñedo en producción en el corazón del Valle de Colchagua. Incluye cepas de Carmenere y Cabernet Sauvignon, con una pequeña bodega equipada. Ideal para un proyecto enoturístico.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_start_1', 'name': 'Loteo Campestre en Paine', 'type': 'ranch',
                'price': decimal.Decimal('55000000'), 'size': 0.5, 'latitude': -33.8083, 'longitude': -70.7417,
                'description': 'Parcela de agrado de 5000 m² en un consolidado loteo en la comuna de Paine. A solo 45 minutos de Santiago, ideal para construir tu residencia principal o de fin de semana.',
                'publication_status': 'approved', 'has_water': False, 'has_views': False
            },
            {
                'owner_username': 'dp_basico_1', 'name': 'Terreno Urbano en Las Condes', 'type': 'urban', 
                'price': decimal.Decimal('280000000'), 'size': 0.05, 'latitude': -33.4075, 'longitude': -70.5794,
                'description': 'Pequeño terreno en exclusiva zona residencial de Las Condes, Santiago. Ideal para construir una casa moderna o un proyecto de departamentos de baja altura. Acceso a todos los servicios y cercano a parques y colegios.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'dp_avanzado_1', 'name': 'Casa con Vista al Mar, Valparaíso', 'type': 'coastal', 
                'price': decimal.Decimal('180000000'), 'size': 0.02, 'latitude': -33.0458, 'longitude': -71.6190,
                'description': 'Encantadora casa en cerro Alegre, Valparaíso, con inmejorable vista al océano Pacífico. Conserva la arquitectura tradicional porteña y ofrece un ambiente bohemio. Ideal para inversión turística o residencia.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_growth_1', 'name': 'Sitio Industrial, San Bernardo', 'type': 'industrial', 
                'price': decimal.Decimal('500000000'), 'size': 1.5, 'latitude': -33.5936, 'longitude': -70.7042,
                'description': 'Amplio sitio de uso industrial en consolidado sector de San Bernardo, con excelente conectividad a autopistas. Apto para bodegas, centros de distribución o fábricas. Cuenta con empalme eléctrico trifásico.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'vp_enterprise_1', 'name': 'Isla Privada en la Patagonia', 'type': 'island', 
                'price': decimal.Decimal('1200000000'), 'size': 10.0, 'latitude': -45.0000, 'longitude': -73.0000,
                'description': 'Oportunidad única: isla virgen de 10 hectáreas en el corazón de la Patagonia chilena. Ideal para desarrollo turístico exclusivo, proyecto de conservación o refugio privado. Acceso por vía marítima o aérea.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_pro_1', 'name': 'Cabaña Rústica en Pucón', 'type': 'forest', 
                'price': decimal.Decimal('95000000'), 'size': 0.3, 'latitude': -39.2700, 'longitude': -71.9500,
                'description': 'Acogedora cabaña de madera en parcela con bosque nativo, a pocos kilómetros de Pucón. Entorno tranquilo y natural, ideal para disfrutar de la tranquilidad del sur de Chile. Cercana a termas y centros de esquí.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_basico_2', 'name': 'Parcela en Valle del Elqui', 'type': 'farm', 
                'price': decimal.Decimal('70000000'), 'size': 1.0, 'latitude': -30.0000, 'longitude': -70.5000,
                'description': 'Parcela de agrado en el místico Valle del Elqui, ideal para descanso o proyecto turístico. Cielos despejados para observación astronómica y clima cálido. Cuenta con noria de agua.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_basico_1', 'name': 'Sitio Céntrico en Temuco', 'type': 'urban', 
                'price': decimal.Decimal('150000000'), 'size': 0.03, 'latitude': -38.7359, 'longitude': -72.5904,
                'description': 'Terreno en pleno centro de Temuco, ideal para desarrollo comercial o habitacional. Alta plusvalía y conectividad. Cercano a servicios, comercio y transporte público.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'dp_avanzado_1', 'name': 'Terreno frente al Mar, La Serena', 'type': 'coastal', 
                'price': decimal.Decimal('300000000'), 'size': 0.1, 'latitude': -29.9140, 'longitude': -71.2619,
                'description': 'Parcela con acceso directo a la playa en exclusiva zona de La Serena. Ideal para construir una residencia de lujo con vistas ininterrumpidas al Pacífico. Excelente inversión.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_start_1', 'name': 'Campo Ganadero, Coyhaique', 'type': 'ranch', 
                'price': decimal.Decimal('600000000'), 'size': 100.0, 'latitude': -45.5700, 'longitude': -72.0700,
                'description': 'Extenso campo de 100 hectáreas apto para ganadería en la Región de Aysén. Con praderas naturales y abundante agua. Oportunidad para proyecto agropecuario o turístico rural.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'vp_growth_1', 'name': 'Parcela con Estero, Puerto Varas', 'type': 'forest', 
                'price': decimal.Decimal('110000000'), 'size': 0.8, 'latitude': -41.3200, 'longitude': -72.9800,
                'description': 'Hermosa parcela con orilla de estero en un entorno boscoso cerca de Puerto Varas. Ideal para construir una cabaña de ensueño en el sur de Chile. Acceso controlado y urbanización básica.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_enterprise_1', 'name': 'Predio Agrícola, San Fernando', 'type': 'farm', 
                'price': decimal.Decimal('220000000'), 'size': 8.0, 'latitude': -34.3800, 'longitude': -71.0000,
                'description': 'Campo agrícola de 8 hectáreas con derechos de agua en San Fernando, Región de O'Higgins. Tierra fértil apta para frutales o cultivos tradicionales. Excelente ubicación y conectividad.',
                'publication_status': 'approved', 'has_water': True, 'has_views': False
            },
            {
                'owner_username': 'dp_pro_1', 'name': 'Terreno con Laguna Propia, Curacautín', 'type': 'lake', 
                'price': decimal.Decimal('400000000'), 'size': 4.0, 'latitude': -38.4500, 'longitude': -71.8800,
                'description': 'Espectacular terreno de 4 hectáreas con una laguna privada, rodeado de bosque nativo en Curacautín. Ideal para proyecto turístico o residencia exclusiva. Vistas impresionantes a volcanes.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'dp_basico_2', 'name': 'Parcela Ecológica, Pichilemu', 'type': 'coastal', 
                'price': decimal.Decimal('90000000'), 'size': 0.7, 'latitude': -34.4000, 'longitude': -72.0000,
                'description': 'Parcela ideal para proyecto ecológico o de surf en Pichilemu. Cerca de las mejores playas y olas de la zona central. Con factibilidad de agua y luz.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
            {
                'owner_username': 'vp_start_1', 'name': 'Fundo con Vistas al Volcán, Lican Ray', 'type': 'ranch', 
                'price': decimal.Decimal('380000000'), 'size': 30.0, 'latitude': -39.6000, 'longitude': -72.1000,
                'description': 'Gran fundo con 30 hectáreas de praderas y bosque, con vistas privilegiadas al volcán Villarrica. Ideal para desarrollo turístico, ganadería o proyecto de vida autosustentable.',
                'publication_status': 'approved', 'has_water': True, 'has_views': True
            },
        ]

        for prop_data in properties_to_create:
            owner = User.objects.get(username=prop_data['owner_username'])
            Property.objects.create(
                owner=owner,
                name=prop_data['name'],
                type=prop_data['type'],
                price=prop_data['price'],
                size=prop_data['size'],
                latitude=prop_data['latitude'],
                longitude=prop_data['longitude'],
                description=prop_data['description'],
                publication_status=prop_data['publication_status'],
                has_water=prop_data['has_water'],
                has_views=prop_data['has_views'],
            )
            self.stdout.write(f"Property created: {prop_data['name']}")

        self.stdout.write(self.style.SUCCESS('---------------------------------'))
        self.stdout.write(self.style.SUCCESS('Successfully set up the test data.')) 