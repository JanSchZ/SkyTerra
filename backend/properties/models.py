import uuid
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
    PUBLICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    PROPERTY_LISTING_TYPES = [
        ('sale', 'Sale'),
        ('rent', 'Rent'),
        ('both', 'Both'),
    ]
    TERRAIN_CHOICES = [
        ('flat', 'Plano'),
        ('hills', 'Colinas'),
        ('mountains', 'Montañoso'),
        ('mixed', 'Mixto'),
    ]
    ACCESS_CHOICES = [
        ('paved', 'Pavimentado'),
        ('unpaved', 'No pavimentado'),
    ]
    LEGAL_STATUS_CHOICES = [
        ('clear', 'Saneado'),
        ('mortgaged', 'Con hipoteca'),
    ]
    # Utilities can be a JSONField storing a list of strings
    
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
    publication_status = models.CharField(
        max_length=10,
        choices=PUBLICATION_STATUS_CHOICES,
        default='pending',
        help_text='Estado de publicación de la propiedad'
    )
    listing_type = models.CharField(max_length=10, choices=PROPERTY_LISTING_TYPES, default='sale')
    rent_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rental_terms = models.TextField(blank=True)
    plusvalia_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Métrica que refleja el potencial de plusvalía (0-100). Visible para suscriptores Pro.")
    terrain = models.CharField(max_length=50, choices=TERRAIN_CHOICES, default='flat', blank=True)
    access = models.CharField(max_length=50, choices=ACCESS_CHOICES, default='paved', blank=True)
    legal_status = models.CharField(max_length=50, choices=LEGAL_STATUS_CHOICES, default='clear', blank=True)
    utilities = models.JSONField(default=list, blank=True, help_text="Lista de servicios disponibles (ej. ['water', 'electricity'])")
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

        # Validate rent_price if listing_type involves rent
        if self.listing_type in ['rent', 'both']:
            if self.rent_price is None or self.rent_price <= 0:
                raise ValidationError({'rent_price': 'El precio de arriendo debe ser mayor que 0 para propiedades en arriendo.'})

    def calculate_plusvalia_score(self):
        """Calcula el puntaje de plusvalía de la propiedad combinando 7 métricas y una evaluación IA.
        El resultado se normaliza en un rango 0-100.
        """
        from .plusvalia_service import PlusvaliaService  # Import aquí para evitar ciclos
        return PlusvaliaService.calculate(self)

    def save(self, *args, **kwargs):
        """Override save para calcular automáticamente el plusvalia_score antes de guardar."""
        # Ejecuta validaciones estándar
        self.full_clean()
        # Calcular puntaje de plusvalía (si no se pasa explícitamente o si se fuerza recálculo)
        # El parámetro de palabra clave 'recalculate_plusvalia' permite recalcular desde callers
        recalc = kwargs.pop('recalculate_plusvalia', False)
        if self.plusvalia_score is None or recalc:
            try:
                self.plusvalia_score = self.calculate_plusvalia_score()
            except Exception as e:
                # No impedir el guardado si algo falla; dejar puntaje en None
                import logging
                logging.getLogger(__name__).error(f"Error calculando plusvalia_score para propiedad {self.id}: {e}")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Tour(models.Model):
    property = models.ForeignKey(Property, related_name='tours', on_delete=models.CASCADE)
    tour_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255, blank=True, null=True) # Added name as it's in serializer
    description = models.TextField(blank=True, null=True) # Added description as it's in serializer
    url = models.URLField(max_length=1024, blank=True, null=True) # Allow blank/null if package_path is used
    package_path = models.CharField(max_length=512, blank=True, null=True)
    type = models.CharField(max_length=50, choices=[('360', '360°'), ('video', 'Video'), ('package', 'Package'), ('other', 'Other')])
    created_at = models.DateTimeField(auto_now_add=True) # Serves as uploaded_at for now
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tour {self.name or self.type} for {self.property.name} ({self.tour_id})"

class Image(models.Model):
    property = models.ForeignKey(Property, related_name='images', on_delete=models.CASCADE)
    url = models.URLField()
    type = models.CharField(max_length=50, choices=[('aerial', 'Aerial'), ('front', 'Front'), ('side', 'Side'), ('other', 'Other')])
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image {self.type} for {self.property.name}"

# -----------------------------
# Documentos asociados a Propiedades
# -----------------------------

class PropertyDocument(models.Model):
    DOCUMENT_TYPES = [
        ('deed', 'Escritura'),
        ('plan', 'Plano'),
        ('proof', 'Dominio'),
        ('other', 'Otro'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
    ]

    property = models.ForeignKey(Property, related_name='documents', on_delete=models.CASCADE)
    file = models.FileField(upload_to='property_documents/')
    doc_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='other')
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_documents')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Document {self.doc_type} for {self.property.name}"

# -----------------------------
# Analytics - Visitas a Propiedades
# -----------------------------

class PropertyVisit(models.Model):
    property = models.ForeignKey(Property, related_name='visits', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    visited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['visited_at']),
        ]
        ordering = ['-visited_at']

    def __str__(self):
        return f"Visit to {self.property.name} at {self.visited_at}"

# -----------------------------
# Comparación de Propiedades
# -----------------------------

class ComparisonSession(models.Model):
    """Agrupa hasta 4 propiedades para que un usuario registrado las compare.
    Si el usuario no está autenticado, se almacena en base a `session_key` y expira automáticamente.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='comparison_sessions')
    session_key = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    properties = models.ManyToManyField(Property, related_name='comparison_sessions', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.CheckConstraint(check=models.Q(user__isnull=False) | models.Q(session_key__isnull=False), name='comparison_owner_present'),
        ]

    def clean(self):
        super().clean()
        if self.properties.count() > 4:
            raise ValidationError({'properties': 'No se pueden comparar más de 4 propiedades a la vez.'})

    def __str__(self):
        owner = self.user.username if self.user else f'Session {self.session_key}'
        return f'Comparación de {self.properties.count()} propiedades para {owner}'

# -----------------------------
# Búsquedas guardadas y alertas
# -----------------------------
class SavedSearch(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_searches')
    name = models.CharField(max_length=100)
    filters = models.JSONField(help_text='Objeto JSON con filtros serializados aplicables a PropertyViewSet')
    email_alert = models.BooleanField(default=True, help_text='Si está activo se enviará email cuando haya nuevas coincidencias')
    last_alert_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'name')
        ordering = ['-updated_at']

    def __str__(self):
        return f"SavedSearch {self.name} para {self.user.username}"

# -----------------------------
# Favoritos (propiedades guardadas)
# -----------------------------

class Favorite(models.Model):
    """Permite al usuario marcar propiedades como favoritas/guardadas."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'property')
        ordering = ['-created_at']

    def __str__(self):
        return f'Favorite property {self.property_id} by {self.user.username}'
