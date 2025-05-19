from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Create your models here.

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
    boundary_polygon = models.JSONField(null=True, blank=True, help_text="GeoJSON polygon data for property boundaries")
    description = models.TextField(blank=True)
    has_water = models.BooleanField(default=False)
    has_views = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
