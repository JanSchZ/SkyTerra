from rest_framework import serializers
from .models import Property, Tour, Image
import json

class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'url', 'type', 'order', 'created_at']

class TourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tour
        fields = ['id', 'url', 'type', 'created_at']

class PropertySerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    tours = TourSerializer(many=True, read_only=True)
    boundary_polygon = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'description', 'has_water', 'has_views', 
                 'created_at', 'updated_at', 'images', 'tours']
        
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
    
    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'has_water', 'has_views', 'image_count', 'has_tour'] 