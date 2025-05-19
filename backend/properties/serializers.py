from rest_framework import serializers
from .models import Property, Tour, Image

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

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 'boundary_polygon', 'description', 
                 'has_water', 'has_views', 'created_at', 'updated_at',
                 'images', 'tours']
        
class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer para listar propiedades con menos detalles"""
    image_count = serializers.IntegerField(source='image_count_annotation', read_only=True)
    has_tour = serializers.BooleanField(source='has_tour_annotation', read_only=True)
    
    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 'boundary_polygon', 'has_water', 
                 'has_views', 'image_count', 'has_tour'] 