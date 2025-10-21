from rest_framework import serializers
from django.contrib.auth import get_user_model # Import get_user_model
from django.conf import settings # Alternative for AUTH_USER_MODEL
from django.utils import timezone
from .models import (
    Property,
    Tour,
    Image,
    PropertyDocument,
    PropertyVisit,
    ComparisonSession,
    SavedSearch,
    Favorite,
    RecordingOrder,
    ListingPlan,
    PropertyStatusHistory,
    PilotProfile,
    PilotDocument,
    Job,
    JobOffer,
    JobTimelineEvent,
    WORKFLOW_NODE_LABELS,
    WORKFLOW_SUBSTATE_DEFINITIONS,
)
import json
from payments.models import Subscription

User = get_user_model()

class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


def _serialize_actor(actor):
    if not actor:
        return None
    try:
        return BasicUserSerializer(actor).data
    except Exception:
        return None


def _serialize_timeline_payload(timeline):
    serialized = []
    for entry in timeline or []:
        entry_copy = {
            'key': entry.get('key'),
            'label': entry.get('label'),
            'state': entry.get('state'),
            'started_at': entry.get('started_at'),
            'completed_at': entry.get('completed_at'),
            'duration_hours': entry.get('duration_hours'),
            'duration_days': entry.get('duration_days'),
            'expected_hours': entry.get('expected_hours'),
            'expected_days': entry.get('expected_days'),
        }

        events = []
        for event in entry.get('events', []):
            event_copy = event.copy()
            event_copy['actor'] = _serialize_actor(event.get('actor'))
            events.append(event_copy)
        entry_copy['events'] = events

        current_event = entry.get('current_event')
        if current_event:
            current_copy = current_event.copy()
            current_copy['actor'] = _serialize_actor(current_event.get('actor'))
            entry_copy['current_event'] = current_copy
        else:
            entry_copy['current_event'] = None

        serialized.append(entry_copy)
    return serialized

class ImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Image
        fields = ['id', 'url', 'type', 'order', 'created_at']

class PropertyDocumentSerializer(serializers.ModelSerializer):
    reviewed_by_details = BasicUserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = PropertyDocument
        fields = ['id', 'file', 'doc_type', 'description', 'uploaded_at', 'status', 'reviewed_by', 'reviewed_by_details', 'reviewed_at']
        extra_kwargs = {
            'status': {'read_only': True},
            'reviewed_by': {'read_only': True},
            'reviewed_at': {'read_only': True},
        }


class ListingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingPlan
        fields = ['id', 'key', 'name', 'description', 'price', 'entitlements', 'sla_hours']


class PropertyStatusHistorySerializer(serializers.ModelSerializer):
    actor = BasicUserSerializer(read_only=True)
    node_label = serializers.SerializerMethodField()
    substate_label = serializers.SerializerMethodField()

    class Meta:
        model = PropertyStatusHistory
        fields = [
            'id',
            'node',
            'node_label',
            'substate',
            'substate_label',
            'percent',
            'message',
            'metadata',
            'actor',
            'created_at',
        ]
        read_only_fields = fields

    def get_node_label(self, obj):
        return WORKFLOW_NODE_LABELS.get(obj.node, obj.node.title())

    def get_substate_label(self, obj):
        return WORKFLOW_SUBSTATE_DEFINITIONS.get(obj.substate, {}).get('label', obj.substate)


class PropertyStatusBarSerializer(serializers.Serializer):
    property_id = serializers.IntegerField()
    node = serializers.CharField()
    node_label = serializers.CharField()
    substate = serializers.CharField()
    substate_label = serializers.CharField(required=False, allow_blank=True)
    percent = serializers.IntegerField()
    cta = serializers.JSONField(required=False)
    eta = serializers.JSONField(required=False)
    alerts = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    nodes = serializers.ListField(child=serializers.DictField(), allow_empty=True)

class TourSerializer(serializers.ModelSerializer):
    # Renaming created_at to uploaded_at for clarity in the API response,
    # as it represents the upload time for packages or creation time for other tour types.
    uploaded_at = serializers.DateTimeField(source='created_at', read_only=True)
    # Build an absolute URL so the frontend/mobile app can load the tour regardless of host,
    # e.g. when consuming it from skyterra.cl while media lives on a separate origin.
    url = serializers.SerializerMethodField()
    # Maintain backward-compatibility: expose the property as an id, and also
    # provide lightweight details under property_details.
    property = serializers.IntegerField(source='property.id', read_only=True)
    property_id = serializers.IntegerField(source='property.id', read_only=True)
    property_details = serializers.SerializerMethodField()

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
            try:
                return request.build_absolute_uri(obj.url)
            except Exception:
                pass

        # As a fallback (should not normally happen), just return the stored value
        return obj.url

    def get_property_details(self, obj):
        """Return minimal property details including the first image.

        Kept intentionally lightweight to avoid heavy nested serialization.
        """
        try:
            prop = getattr(obj, 'property', None)
            if not prop:
                return None
            payload = {
                'id': prop.id,
                'name': getattr(prop, 'name', None),
                'type': getattr(prop, 'type', None),
            }
            first_image = getattr(prop, 'images', None).first() if getattr(prop, 'images', None) else None
            payload['images'] = [{'url': first_image.url}] if first_image else []
            return payload
        except Exception:
            return None

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
            'status',
            'property',
            'property_id',
            'property_details',
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


class PilotDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PilotDocument
        fields = ['id', 'pilot', 'doc_type', 'file', 'status', 'notes', 'expires_at', 'uploaded_at', 'reviewed_by', 'reviewed_at']
        read_only_fields = ['status', 'uploaded_at', 'reviewed_by', 'reviewed_at', 'pilot']


class PilotProfileSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    documents = PilotDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = PilotProfile
        fields = [
            'id',
            'user',
            'display_name',
            'rating',
            'score',
            'completed_jobs',
            'status',
            'is_available',
            'location_latitude',
            'location_longitude',
            'last_heartbeat_at',
            'notes',
            'documents',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['rating', 'score', 'completed_jobs', 'last_heartbeat_at', 'created_at', 'updated_at']


class JobTimelineEventSerializer(serializers.ModelSerializer):
    actor = BasicUserSerializer(read_only=True)

    class Meta:
        model = JobTimelineEvent
        fields = ['id', 'kind', 'message', 'metadata', 'actor', 'created_at']
        read_only_fields = fields


class JobOfferSerializer(serializers.ModelSerializer):
    pilot_id = serializers.IntegerField(source='pilot.id', read_only=True)
    pilot_profile = PilotProfileSerializer(source='pilot', read_only=True)
    remaining_seconds = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = JobOffer
        fields = [
            'id',
            'job',
            'pilot_id',
            'pilot_profile',
            'status',
            'wave',
            'score',
            'radius_km',
            'ttl_seconds',
            'sent_at',
            'expires_at',
            'responded_at',
            'metadata',
            'remaining_seconds',
            'status_label',
        ]
        read_only_fields = [
            'status',
            'sent_at',
            'expires_at',
            'responded_at',
            'metadata',
            'pilot_id',
            'pilot_profile',
            'remaining_seconds',
            'status_label',
        ]

    def get_remaining_seconds(self, obj):
        if not obj.expires_at or obj.status != 'pending':
            return 0
        delta = (obj.expires_at - timezone.now()).total_seconds()
        return max(int(delta), 0)

    def get_status_label(self, obj):
        return dict(JobOffer.STATUS_CHOICES).get(obj.status, obj.status)


class JobSerializer(serializers.ModelSerializer):
    property_id = serializers.IntegerField(source='property.id', read_only=True)
    property_details = serializers.SerializerMethodField()
    plan_id = serializers.IntegerField(source='plan.id', read_only=True)
    plan_details = ListingPlanSerializer(source='plan', read_only=True)
    assigned_pilot = PilotProfileSerializer(read_only=True)
    timeline = JobTimelineEventSerializer(many=True, read_only=True)
    offers = JobOfferSerializer(many=True, read_only=True)
    status_label = serializers.SerializerMethodField()
    status_bar = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id',
            'status',
            'status_label',
            'property_id',
            'property_details',
            'plan_id',
            'plan_details',
            'price_amount',
            'pilot_payout_amount',
            'assigned_pilot',
            'scheduled_start',
            'scheduled_end',
            'invite_wave',
            'last_status_change_at',
            'notes',
            'vendor_instructions',
            'timeline',
            'offers',
            'status_bar',
            'contact',
            'location',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'status_label',
            'plan_id',
            'plan_details',
            'timeline',
            'offers',
            'status_bar',
            'contact',
            'location',
            'created_at',
            'updated_at',
            'property_id',
            'property_details',
        ]

    def get_status_label(self, obj):
        return obj.get_status_display()

    def get_status_bar(self, obj):
        if not obj.property_id:
            return None
        return obj.property.build_status_bar_payload()

    def get_property_details(self, obj):
        if not obj.property_id:
            return None
        return PropertyPreviewSerializer(obj.property, context=self.context).data

    def get_contact(self, obj):
        prop = getattr(obj, 'property', None)
        if not prop:
            return None
        owner = getattr(prop, 'owner', None)
        fallback_name = prop.contact_name or (owner.get_full_name() if owner and owner.get_full_name() else None)
        if not fallback_name and owner:
            fallback_name = owner.username or owner.email
        email = prop.contact_email or (owner.email if owner else None)
        phone = prop.contact_phone or None
        return {
            'name': fallback_name,
            'email': email,
            'phone': phone,
        }

    def get_location(self, obj):
        prop = getattr(obj, 'property', None)
        if not prop:
            return None
        return {
            'address_line1': prop.address_line1 or None,
            'address_line2': prop.address_line2 or None,
            'city': prop.address_city or None,
            'region': prop.address_region or None,
            'country': prop.address_country or None,
            'postal_code': prop.address_postal_code or None,
            'latitude': prop.latitude,
            'longitude': prop.longitude,
            'reference': prop.access_notes or None,
        }

class PropertySerializer(serializers.ModelSerializer):
    images = ImageSerializer(many=True, read_only=True)
    tours = TourSerializer(many=True, read_only=True)
    boundary_polygon = serializers.JSONField(required=False, allow_null=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)
    documents = PropertyDocumentSerializer(many=True, read_only=True)
    plusvalia_score = serializers.SerializerMethodField()
    plusvalia_breakdown = serializers.SerializerMethodField()
    plan = serializers.PrimaryKeyRelatedField(queryset=ListingPlan.objects.all(), allow_null=True, required=False)
    plan_details = ListingPlanSerializer(source='plan', read_only=True)
    status_history = PropertyStatusHistorySerializer(many=True, read_only=True)
    status_bar = serializers.SerializerMethodField()
    submission_requirements = serializers.SerializerMethodField()
    workflow_timeline = serializers.SerializerMethodField()
    # TODO: add documents serializer when backend model ready

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude',
                 'boundary_polygon', 'description', 'has_water', 'has_views',
                 'contact_name', 'contact_email', 'contact_phone',
                 'address_line1', 'address_line2', 'address_city', 'address_region', 'address_country', 'address_postal_code',
                 'created_at', 'updated_at', 'images', 'tours', 'publication_status',
                  'owner_details', 'listing_type', 'rent_price', 'rental_terms', 'documents', 'plusvalia_score', 'plusvalia_breakdown',
                 'terrain', 'access', 'legal_status', 'utilities',
                 'workflow_node', 'workflow_substate', 'workflow_progress', 'workflow_alerts',
                 'plan', 'plan_details', 'preferred_time_windows', 'access_notes', 'seller_notes',
                 'status_history', 'status_bar', 'workflow_timeline', 'submission_requirements',
                 'ai_category', 'ai_summary']
        extra_kwargs = {
            'workflow_node': {'read_only': True},
            'workflow_substate': {'read_only': True},
            'workflow_progress': {'read_only': True},
            'workflow_alerts': {'read_only': True},
            'plan_details': {'read_only': True},
            'status_history': {'read_only': True},
            'status_bar': {'read_only': True},
            'workflow_timeline': {'read_only': True},
        }
        
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

    def get_status_bar(self, obj):
        return obj.build_status_bar_payload()

    def get_submission_requirements(self, obj):
        return obj.compute_submission_requirements()

    def get_workflow_timeline(self, obj):
        return _serialize_timeline_payload(obj.build_workflow_timeline())

    def _clean_publication_status(self, validated_data, *, creating=False):
        """Ensure publication_status can only be controlled by staff users."""
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not user or not user.is_authenticated or not user.is_staff:
            # Non-staff users should never override the status manually.
            validated_data.pop('publication_status', None)
            if creating:
                # Preserve the model default when creating new records.
                validated_data.setdefault('publication_status', Property.PUBLICATION_STATUS_CHOICES[0][0])

        return validated_data

    def create(self, validated_data):
        validated_data = self._clean_publication_status(validated_data, creating=True)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._clean_publication_status(validated_data, creating=False)
        return super().update(instance, validated_data)

class PropertyListSerializer(serializers.ModelSerializer):
    """Serializer para listar propiedades con menos detalles"""
    image_count = serializers.IntegerField(source='image_count_annotation', read_only=True)
    has_tour = serializers.BooleanField(source='has_tour_annotation', read_only=True)
    owner_details = BasicUserSerializer(source='owner', read_only=True)
    plusvalia_score = serializers.SerializerMethodField()
    workflow_timeline = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = ['id', 'name', 'type', 'price', 'size', 'latitude', 'longitude',
                 'has_water', 'has_views', 'image_count', 'has_tour',
                 'publication_status', 'workflow_node', 'workflow_substate', 'workflow_progress', 'workflow_timeline',
                 'owner_details', 'created_at', 'listing_type', 'rent_price', 'rental_terms', 'plusvalia_score']

    def get_plusvalia_score(self, obj):
        # Beta/prelanzamiento: visible para todos
        return obj.plusvalia_score

    def get_workflow_timeline(self, obj):
        return _serialize_timeline_payload(obj.build_workflow_timeline())

class PropertyPreviewSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información mínima de una propiedad a usuarios anónimos"""
    main_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    previewTourUrl = serializers.SerializerMethodField()

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
            'previewTourUrl',
        ]

    def get_main_image(self, obj):
        first_image = obj.images.order_by('order', 'created_at').first()
        return first_image.url if first_image else None

    def get_images(self, obj):
        qs = obj.images.order_by('order', 'created_at')[:5]
        return [{'id': img.id, 'url': img.url} for img in qs]

    def get_previewTourUrl(self, obj):
        """Obtener la URL del tour virtual para preview"""
        try:
            # Buscar el primer tour activo de la propiedad
            first_tour = obj.tours.filter(status='active').exclude(url__isnull=True).exclude(url='').first()
            if first_tour:
                # Usar el método get_url del TourSerializer para construir la URL absoluta
                tour_serializer = TourSerializer(first_tour, context=self.context)
                return tour_serializer.get_url(first_tour)
        except Exception:
            pass
        return None

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

# -----------------------------
# Recording Orders
# -----------------------------

class RecordingOrderSerializer(serializers.ModelSerializer):
    property_details = PropertyPreviewSerializer(source='property', read_only=True)
    requested_by_details = BasicUserSerializer(source='requested_by', read_only=True)
    assigned_to_details = BasicUserSerializer(source='assigned_to', read_only=True)

    class Meta:
        model = RecordingOrder
        fields = [
            'id', 'property', 'property_details',
            'requested_by', 'requested_by_details',
            'assigned_to', 'assigned_to_details',
            'status', 'scheduled_date', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'requested_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['requested_by'] = request.user
        return super().create(validated_data)
