from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.core.exceptions import ValidationError
import json

# Create your models here.

def validate_boundary_polygon(value):
    """Validador personalizado para boundary_polygon"""
    if value is None:
        return
        
    try:
        # Si viene como string, parsearlo
        if isinstance(value, str):
            value = json.loads(value)
            
        # Validar estructura GeoJSON básica
        if not isinstance(value, dict):
            raise ValidationError("boundary_polygon debe ser un objeto JSON válido")
            
        if value.get('type') != 'Feature':
            raise ValidationError("boundary_polygon debe ser un GeoJSON Feature")
            
        geometry = value.get('geometry')
        if not geometry or geometry.get('type') != 'Polygon':
            raise ValidationError("boundary_polygon debe contener una geometría de tipo Polygon")
            
        coordinates = geometry.get('coordinates')
        if not coordinates or not isinstance(coordinates, list):
            raise ValidationError("boundary_polygon debe contener coordenadas válidas")
            
    except json.JSONDecodeError:
        raise ValidationError("boundary_polygon contiene JSON inválido")
    except Exception as e:
        raise ValidationError(f"Error validando boundary_polygon: {str(e)}")

class Property(models.Model):
    PROPERTY_TYPES = [
        ('farm', 'Farm'),
        ('ranch', 'Ranch'),
        ('forest', 'Forest'),
        ('lake', 'Lake'),
    ]
    
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties', null=True, blank=True)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=PROPERTY_TYPES, default='farm')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    size = models.FloatField(help_text="Tamaño en hectáreas")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    boundary_polygon = models.JSONField(
        null=True, 
        blank=True, 
        help_text="GeoJSON polygon data for property boundaries",
        validators=[validate_boundary_polygon]
    )
    description = models.TextField(blank=True)
    has_water = models.BooleanField(default=False)
    has_views = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validaciones adicionales del modelo"""
        super().clean()
        
        # Validar precio
        if self.price <= 0:
            raise ValidationError({'price': 'El precio debe ser mayor que 0'})
            
        # Validar tamaño
        if self.size <= 0:
            raise ValidationError({'size': 'El tamaño debe ser mayor que 0'})
            
        # Validar coordenadas
        if self.latitude is not None:
            if self.latitude < -90 or self.latitude > 90:
                raise ValidationError({'latitude': 'La latitud debe estar entre -90 y 90'})
                
        if self.longitude is not None:
            if self.longitude < -180 or self.longitude > 180:
                raise ValidationError({'longitude': 'La longitud debe estar entre -180 y 180'})

    def save(self, *args, **kwargs):
        """Override save para ejecutar validaciones"""
        self.full_clean()  # Ejecuta clean() y las validaciones de campo
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Tour(models.Model):
    property = models.ForeignKey(Property, related_name='tours', on_delete=models.CASCADE)
    url = models.URLField()
    type = models.CharField(max_length=50, choices=[('360', '360°'), ('video', 'Video'), ('other', 'Other')])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tour {self.type} for {self.property.name}"

class Image(models.Model):
    property = models.ForeignKey(Property, related_name='images', on_delete=models.CASCADE)
    url = models.URLField()
    type = models.CharField(max_length=50, choices=[('aerial', 'Aerial'), ('front', 'Front'), ('side', 'Side'), ('other', 'Other')])
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image {self.type} for {self.property.name}"
