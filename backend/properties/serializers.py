from rest_framework import serializers
from django.contrib.auth import get_user_model # Import get_user_model
from django.conf import settings # Alternative for AUTH_USER_MODEL
from .models import Property, Tour, Image, PropertyDocument, PropertyVisit, ComparisonSession, SavedSearch, Favorite
import json
from payments.models import Subscription

User = get_user_model()

class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'url', 'type', 'order', 'created_at']

class PropertyDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyDocument
        fields = ['id', 'file', 'doc_type', 'description', 'uploaded_at', 'status', 'reviewed_by', 'reviewed_at']
        extra_kwargs = {
            'status': {'read_only': True},
            'reviewed_by': {'read_only': True},
            'reviewed_at': {'read_only': True},
        }

class TourSerializer(serializers.ModelSerializer):
    # Renaming created_at to uploaded_at for clarity in the API response,
    # as it represents the upload time for packages or creation time for other tour types.
    uploaded_at = serializers.DateTimeField(source='created_at', read_only=True)
    # Build an absolute URL so that the frontend can always load the tour correctly, even when
    # it runs on a different sub-domain (e.g. app.skyterra.cl vs api.skyterra.cl).
    url = serializers.SerializerMethodField()
    property = serializers.SerializerMethodField()

    def get_url(self, obj):
        """Return an absolute URL for the tour.

        If the stored URL already looks absolute (starts with http/https), just return it.
        Otherwise, build it using the current request so that the domain is included.
        """
        if not obj.url:
            return None

        if obj.url.startswith('http://') or obj.url.startswith('https://'):
            return obj.url

        # Relative URL (e.g. "/media/tours/…") – prepend current host
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.url)

        # As a fallback (should not normally happen), just return the stored value
        return obj.url

    def get_property(self, obj):
        """Return property details including name and first image."""
        if not obj.property:
            return None
        
        property_data = {
            'id': obj.property.id,
            'name': obj.property.name,
            'type': obj.property.type,
        }
        
        # Get first image if available
        first_image = obj.property.images.first()
        if first_image:
            property_data['images'] = [{'image': first_image.image.url if first_image.image else None}]
        else:
            property_data['images'] = []
        
        return property_data

    class Meta:
        model = Tour
        fields = [
            'id',
            'tour_id',
            'name',
            'description',
            'url',
            'package_path',
            'type',
            'property',  # Property is useful to have here
            'uploaded_at',  # Renamed from created_at
            'updated_at'
        ]
        read_only_fields = ['package_path', 'updated_at', 'uploaded_at']


class TourPackageCreateSerializer(serializers.ModelSerializer):
    package_file = serializers.FileField(write_only=True)
    # property_id = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all(), source='property', write_only=True)
    # tour_id is auto-generated in the view if not provided or can be optional here
    # url is auto-generated in the view
    # type is set to 'package' in the view

    class Meta:
        model = Tour
        fields = [
            'property', # Changed from property_id to allow DRF to handle relation
            'package_file',
            'name',
            'description',
            # 'url' and 'type' will be set in the view, not taken from direct input here.
            # 'package_path' is also set in view.
        ]
        extra_kwargs = {
            'name': {'required': False, 'allow_blank': True},
            'description': {'required': False, 'allow_blank': True},
        }

class PropertySerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    tours = TourSerializer(many=True, read_only=True)
    boundary_polygon = serializers.JSONField(required=False, allow_null=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)
    documents = PropertyDocumentSerializer(many=True, read_only=True)
    plusvalia_score = serializers.SerializerMethodField()
    plusvalia_breakdown = serializers.SerializerMethodField()
    # TODO: add documents serializer when backend model ready

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'description', 'has_water', 'has_views', 
                 'created_at', 'updated_at', 'images', 'tours', 'publication_status',
                  'owner_details', 'listing_type', 'rent_price', 'rental_terms', 'documents', 'plusvalia_score', 'plusvalia_breakdown',
                 'terrain', 'access', 'legal_status', 'utilities', 'ai_category', 'ai_summary']
        
    def validate_boundary_polygon(self, value):
        """Validar que boundary_polygon sea un GeoJSON válido"""
        if value is None:
            return value
            
        # Si viene como string, intentar parsearlo
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("boundary_polygon debe ser un JSON válido")
        
        # Validar estructura básica de GeoJSON
        if isinstance(value, dict):
            if value.get('type') != 'Feature':
                raise serializers.ValidationError("boundary_polygon debe ser un GeoJSON Feature")
            
            geometry = value.get('geometry')
            if not geometry or geometry.get('type') != 'Polygon':
                raise serializers.ValidationError("boundary_polygon debe contener una geometría de tipo Polygon")
            
            coordinates = geometry.get('coordinates')
            if not coordinates or not isinstance(coordinates, list):
                raise serializers.ValidationError("boundary_polygon debe contener coordenadas válidas")
        
        return value
    
    def validate_price(self, value):
        """Validar que el precio sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor que 0")
        return value
    
    def validate_size(self, value):
        """Validar que el tamaño sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El tamaño debe ser mayor que 0")
        return value
        
    def get_plusvalia_score(self, obj):
        # Beta/prelanzamiento: visible para todos
        return obj.plusvalia_score

    def get_plusvalia_breakdown(self, obj):
        # Solo admins/staff ven el desglose detallado
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and user.is_staff:
            try:
                from .plusvalia_service import PlusvaliaService
                _score, breakdown = PlusvaliaService.calculate_with_breakdown(obj)
                return breakdown
            except Exception:
                return None
        return None

class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer para listar propiedades con menos detalles"""
    image_count = serializers.IntegerField(source='image_count_annotation', read_only=True)
    has_tour = serializers.BooleanField(source='has_tour_annotation', read_only=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)
    plusvalia_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'has_water', 'has_views', 'image_count', 'has_tour',
                 'publication_status', 'owner_details', 'created_at', 'listing_type', 'rent_price', 'rental_terms', 'plusvalia_score']

    def get_plusvalia_score(self, obj):
        # Beta/prelanzamiento: visible para todos
        return obj.plusvalia_score

class PropertyPreviewSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información mínima de una propiedad a usuarios anónimos"""
    main_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            'id',
            'name',
            'price',
            'size',
            'latitude',
            'longitude',
            'main_image',
            'images',
        ]

    def get_main_image(self, obj):
        first_image = obj.images.order_by('order', 'created_at').first()
        return first_image.url if first_image else None

    def get_images(self, obj):
        qs = obj.images.order_by('order', 'created_at')[:5]
        return [{'id': img.id, 'url': img.url} for img in qs]

class PropertyVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyVisit
        fields = ['id', 'property', 'user', 'visited_at']
        read_only_fields = ['id', 'visited_at', 'user']

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        return PropertyVisit.objects.create(user=user, **validated_data)

class ComparisonSessionSerializer(serializers.ModelSerializer):
    properties = PropertyPreviewSerializer(many=True, read_only=True)
    property_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        allow_empty=True,
        help_text='Lista de IDs de propiedades para establecer en la sesión (máx 4)'
    )

    class Meta:
        model = ComparisonSession
        fields = ['id', 'user', 'session_key', 'properties', 'property_ids', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'properties', 'user', 'session_key']

    def create(self, validated_data):
        prop_ids = validated_data.pop('property_ids', [])
        comparison = ComparisonSession.objects.create(**validated_data)
        if prop_ids:
            comparison.properties.set(Property.objects.filter(id__in=prop_ids)[:4])
        return comparison

    def update(self, instance, validated_data):
        prop_ids = validated_data.pop('property_ids', None)
        if prop_ids is not None:
            instance.properties.set(Property.objects.filter(id__in=prop_ids)[:4])
        instance.save()
        return instance

class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ['id', 'name', 'filters', 'email_alert', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

# -----------------------------
# Favorites
# -----------------------------

class FavoriteSerializer(serializers.ModelSerializer):
    property_details = PropertyPreviewSerializer(source='property', read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'user', 'property', 'property_details', 'created_at']
        read_only_fields = ['id', 'created_at', 'user'] 