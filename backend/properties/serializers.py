from rest_framework import serializers
from .models import Property, Tour, Image
import json
import os
import zipfile
import shutil
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.exceptions import PermissionDenied

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

    def create(self, validated_data):
        # Pop file-related data from context, not validated_data
        images_data = self.context['request'].FILES.getlist('new_images')
        tour_file_data = self.context['request'].FILES.get('new_tour_file')

        # Create property instance first
        property_instance = super().create(validated_data)

        # Handle Image Uploads
        for image_file in images_data:
            file_path = os.path.join('properties', str(property_instance.id), 'images', image_file.name)
            saved_path = default_storage.save(file_path, image_file)
            image_url = default_storage.url(saved_path)
            Image.objects.create(property=property_instance, url=image_url, type='other') # Assuming 'other' for now

        # Handle Tour Upload
        if tour_file_data:
            base_tour_path = os.path.join('properties', str(property_instance.id), 'tours')
            tour_id = str(uuid.uuid4())
            tour_dir = os.path.join(base_tour_path, tour_id)

            if tour_file_data.name.endswith('.zip'):
                # Ensure tour_dir exists for saving the zip file
                if not default_storage.exists(tour_dir):
                    # This is tricky with default_storage directly. Often, one might make the dir with os.makedirs
                    # For now, let's assume saving the zip to tour_dir implicitly creates it or works with storage backend.
                    # A more robust way for local storage: os.makedirs(default_storage.path(tour_dir), exist_ok=True)
                    # However, default_storage.save should handle path creation for files.
                    pass # Let save handle path creation if possible for the storage

                zip_temp_name = tour_file_data.name
                zip_temp_path_storage = os.path.join(tour_dir, zip_temp_name) 
                saved_zip_path = default_storage.save(zip_temp_path_storage, tour_file_data)
                
                # Extract the zip
                # default_storage.path() is needed to get the absolute filesystem path for zipfile
                extract_to_path = default_storage.path(tour_dir)
                # Ensure the extraction directory exists
                os.makedirs(extract_to_path, exist_ok=True)

                with zipfile.ZipFile(default_storage.path(saved_zip_path), 'r') as zip_ref:
                    zip_ref.extractall(extract_to_path)
                
                tour_url = default_storage.url(os.path.join(tour_dir, 'index.html')) # Assume index.html
                default_storage.delete(saved_zip_path) # Clean up the temporary zip
            else: # Assume single HTML file
                # Ensure tour_dir exists (needed if not created by zip logic)
                # os.makedirs(default_storage.path(tour_dir), exist_ok=True) for local storage
                
                saved_tour_file_path = default_storage.save(os.path.join(tour_dir, tour_file_data.name), tour_file_data)
                tour_url = default_storage.url(saved_tour_file_path)
            
            Tour.objects.create(property=property_instance, url=tour_url, type='360') # Assuming '360' for now

        return property_instance

    def update(self, instance, validated_data):
        request = self.context['request']
        
        # Update property instance with validated data first
        property_instance = super().update(instance, validated_data)

        # Handle Image Deletion
        image_ids_to_delete_str = request.data.get('images_to_delete_ids')
        if image_ids_to_delete_str:
            try:
                image_ids_to_delete = json.loads(image_ids_to_delete_str)
                for image_id in image_ids_to_delete:
                    try:
                        image = Image.objects.get(id=image_id, property=property_instance)
                        if image.url.startswith(settings.MEDIA_URL):
                            file_path_to_delete = image.url.replace(settings.MEDIA_URL, '', 1)
                            if default_storage.exists(file_path_to_delete):
                                default_storage.delete(file_path_to_delete)
                        image.delete()
                    except Image.DoesNotExist:
                        # Log or handle missing image if necessary
                        pass
            except json.JSONDecodeError:
                # Log or handle invalid JSON if necessary
                pass

        # Handle Tour Deletion
        tour_id_to_delete = request.data.get('tour_to_delete_id')
        if tour_id_to_delete:
            # Owner/Admin Check before tour deletion
            if not (request.user == property_instance.owner or request.user.is_staff):
                raise PermissionDenied("You are not allowed to delete this tour.")
            try:
                tour = Tour.objects.get(id=tour_id_to_delete, property=property_instance)
                if tour.url.startswith(settings.MEDIA_URL):
                    # Assuming tour.url points to the index.html or similar file within the tour directory
                    # Example: /media/properties/1/tours/tour_uuid/index.html
                    # We need to delete the 'tour_uuid' directory
                    tour_file_relative_path = tour.url.replace(settings.MEDIA_URL, '', 1)
                    tour_dir_relative_path = os.path.dirname(tour_file_relative_path) 
                    
                    # Ensure we are not deleting the base 'tours' folder or property folder
                    if default_storage.exists(tour_dir_relative_path) and \
                       tour_dir_relative_path != os.path.join('properties', str(property_instance.id), 'tours') and \
                       tour_dir_relative_path != os.path.join('properties', str(property_instance.id)):
                        shutil.rmtree(default_storage.path(tour_dir_relative_path))
                tour.delete()
            except Tour.DoesNotExist:
                # Log or handle missing tour if necessary
                pass
        
        # Handle New Image Uploads (same as create)
        new_images_data = request.FILES.getlist('new_images')
        for image_file in new_images_data:
            file_path = os.path.join('properties', str(property_instance.id), 'images', image_file.name)
            saved_path = default_storage.save(file_path, image_file)
            image_url = default_storage.url(saved_path)
            Image.objects.create(property=property_instance, url=image_url, type='other')

        # Handle New Tour Upload (similar to create, with owner check and old tour deletion)
        new_tour_file_data = request.FILES.get('new_tour_file')
        if new_tour_file_data:
            # Owner/Admin Check before new tour upload
            if not (request.user == property_instance.owner or request.user.is_staff):
                raise PermissionDenied("You are not allowed to upload a new tour for this property.")

            # Delete existing tour(s) for this property before uploading a new one
            existing_tours = Tour.objects.filter(property=property_instance)
            for existing_tour in existing_tours:
                if existing_tour.url.startswith(settings.MEDIA_URL):
                    existing_tour_file_path = existing_tour.url.replace(settings.MEDIA_URL, '', 1)
                    existing_tour_dir_path = os.path.dirname(existing_tour_file_path)
                    if default_storage.exists(existing_tour_dir_path) and \
                       existing_tour_dir_path != os.path.join('properties', str(property_instance.id), 'tours') and \
                       existing_tour_dir_path != os.path.join('properties', str(property_instance.id)):
                        shutil.rmtree(default_storage.path(existing_tour_dir_path))
                existing_tour.delete()

            # Now upload the new tour
            base_tour_path = os.path.join('properties', str(property_instance.id), 'tours')
            tour_id = str(uuid.uuid4())
            tour_dir = os.path.join(base_tour_path, tour_id)

            if new_tour_file_data.name.endswith('.zip'):
                zip_temp_name = new_tour_file_data.name
                zip_temp_path_storage = os.path.join(tour_dir, zip_temp_name)
                saved_zip_path = default_storage.save(zip_temp_path_storage, new_tour_file_data)
                
                extract_to_path = default_storage.path(tour_dir)
                os.makedirs(extract_to_path, exist_ok=True)
                with zipfile.ZipFile(default_storage.path(saved_zip_path), 'r') as zip_ref:
                    zip_ref.extractall(extract_to_path)
                
                tour_url = default_storage.url(os.path.join(tour_dir, 'index.html'))
                default_storage.delete(saved_zip_path) 
            else: 
                saved_tour_file_path = default_storage.save(os.path.join(tour_dir, new_tour_file_data.name), new_tour_file_data)
                tour_url = default_storage.url(saved_tour_file_path)
            
            Tour.objects.create(property=property_instance, url=tour_url, type='360')

        return property_instance
        
class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer para listar propiedades con menos detalles"""
    image_count = serializers.IntegerField(source='image_count_annotation', read_only=True)
    has_tour = serializers.BooleanField(source='has_tour_annotation', read_only=True)
    
    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude', 
                 'boundary_polygon', 'has_water', 'has_views', 'image_count', 'has_tour'] 