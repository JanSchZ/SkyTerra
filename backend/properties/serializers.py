from rest_framework import serializers
from django.contrib.auth import get_user_model # Import get_user_model
from django.conf import settings # Alternative for AUTH_USER_MODEL
from .models import Property, Tour, Image
import json

User = get_user_model()

class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'url', 'type', 'order', 'created_at']

class TourSerializer(serializers.ModelSerializer):
    # Renaming created_at to uploaded_at for clarity in the API response,
    # as it represents the upload time for packages or creation time for other tour types.
    uploaded_at = serializers.DateTimeField(source='created_at', read_only=True)

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
            'property', # Property is useful to have here
            'uploaded_at', # Renamed from created_at
            'updated_at'
        ]
        read_only_fields = ['package_path', 'updated_at', 'uploaded_at']


class AdminTourPackageCreateSerializer(serializers.ModelSerializer):
    tour_zip = serializers.FileField(write_only=True)
    # property_id = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all(), source='property', write_only=True)
    # tour_id is auto-generated in the view if not provided or can be optional here
    # url is auto-generated in the view
    # type is set to 'package' in the view

    class Meta:
        model = Tour
        fields = [
            'property', # Changed from property_id to allow DRF to handle relation
            'tour_zip',
            'tour_id', # Keep for admin specification
            'name',
            'description',
            # 'url' and 'type' will be set in the view, not taken from direct input here.
            # 'package_path' is also set in view.
        ]
        extra_kwargs = {
            'tour_id': {'required': False, 'allow_null': True}, # Admin can optionally specify
            'name': {'required': False, 'allow_blank': True},
            'description': {'required': False, 'allow_blank': True},
        }

class PropertySerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    tours = TourSerializer(many=True, read_only=True)
    boundary_polygon = serializers.JSONField(required=False, allow_null=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'description', 'has_water', 'has_views', 
                 'created_at', 'updated_at', 'images', 'tours', 'publication_status',
                 'owner_details', 'listing_type', 'rent_price', 'rental_terms']
        
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
        
class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer para listar propiedades con menos detalles"""
    image_count = serializers.IntegerField(source='image_count_annotation', read_only=True)
    has_tour = serializers.BooleanField(source='has_tour_annotation', read_only=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)
    
    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'has_water', 'has_views', 'image_count', 'has_tour',
                 'publication_status', 'owner_details', 'created_at', 'listing_type', 'rent_price', 'rental_terms'] 