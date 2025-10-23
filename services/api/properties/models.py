import uuid
import json
from decimal import Decimal
from types import SimpleNamespace

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

# ---------------------------------------------------------------------------
# Publicación & workflow configuration (orden general + metadatos básicos)
# ---------------------------------------------------------------------------

WORKFLOW_NODE_ORDER = ['review', 'approved', 'pilot', 'post', 'live']
WORKFLOW_NODE_LABELS = {
    'review': 'Publicación en revisión',
    'approved': 'Publicación aprobada',
    'pilot': 'Piloto de dron asignado',
    'post': 'Multimedia en postproducción',
    'live': 'Publicación activa',
}

WORKFLOW_NODE_DEFAULT_ETAS = {
    'review': {'label': 'Revisión inicial', 'hours': 24},
    'approved': {'label': 'Asignación de piloto', 'hours': 12},
    'pilot': {'label': 'Coordinación de vuelo', 'hours': 48},
    'post': {'label': 'Postproducción', 'hours': 72},
    'live': {'label': 'Publicación', 'hours': 0},
}

WORKFLOW_SUBSTATE_DEFINITIONS = {
    'draft': {'node': 'review', 'label': 'Borrador', 'percent': 0, 'cta': {'label': 'Completa tu ficha', 'action': 'open_wizard'}},
    'submitted': {'node': 'review', 'label': 'Enviada', 'percent': 20, 'cta': {'label': 'Ver detalles', 'action': 'view_listing'}},
    'under_review': {'node': 'review', 'label': 'En revisión', 'percent': 25, 'cta': {'label': 'Aguardar revisión', 'action': 'view_listing'}},
    'changes_requested': {'node': 'review', 'label': 'Requiere correcciones', 'percent': 15, 'cta': {'label': 'Revisar comentarios', 'action': 'open_feedback'}},
    'resubmitted': {'node': 'review', 'label': 'Correcciones enviadas', 'percent': 22, 'cta': {'label': 'Ver estado', 'action': 'view_listing'}},
    'approved_for_shoot': {'node': 'approved', 'label': 'Lista para grabación', 'percent': 45, 'cta': {'label': 'Detalles de producción', 'action': 'open_production'}} ,
    'inviting': {'node': 'pilot', 'label': 'Buscando piloto', 'percent': 48, 'cta': {'label': 'Seguir progreso', 'action': 'view_listing'}},
    'assigned': {'node': 'pilot', 'label': 'Piloto asignado', 'percent': 52, 'cta': {'label': 'Ver piloto asignado', 'action': 'view_pilot'}},
    'scheduling': {'node': 'pilot', 'label': 'Coordinando fecha', 'percent': 55, 'cta': {'label': 'Proponer horario', 'action': 'open_schedule'}},
    'scheduled': {'node': 'pilot', 'label': 'Agenda confirmada', 'percent': 60, 'cta': {'label': 'Ver agenda', 'action': 'open_schedule'}},
    'shooting': {'node': 'pilot', 'label': 'En grabación', 'percent': 70, 'cta': {'label': 'Ver estado de vuelo', 'action': 'view_job'}},
    'finished': {'node': 'pilot', 'label': 'Grabación finalizada', 'percent': 75, 'cta': {'label': 'Esperar material', 'action': 'view_listing'}},
    'uploading': {'node': 'post', 'label': 'Subiendo material', 'percent': 80, 'cta': {'label': 'Ver entregables', 'action': 'view_assets'}},
    'received': {'node': 'post', 'label': 'Material recibido', 'percent': 82, 'cta': {'label': 'Esperar edición', 'action': 'view_listing'}},
    'qc': {'node': 'post', 'label': 'Control de calidad', 'percent': 85, 'cta': {'label': 'Esperar edición', 'action': 'view_listing'}},
    'editing': {'node': 'post', 'label': 'En postproducción', 'percent': 90, 'cta': {'label': 'Ver avance', 'action': 'view_listing'}},
    'preview_ready': {'node': 'post', 'label': 'Preview listo', 'percent': 95, 'cta': {'label': 'Revisar preview', 'action': 'review_preview'}},
    'ready_for_publish': {'node': 'post', 'label': 'Listo para publicar', 'percent': 98, 'cta': {'label': 'Publicar ahora', 'action': 'publish'}},
    'published': {'node': 'live', 'label': 'Publicación activa', 'percent': 100, 'cta': {'label': 'Ver publicación', 'action': 'view_listing_public'}},
}


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
    PUBLICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    WORKFLOW_NODE_CHOICES = [(key, WORKFLOW_NODE_LABELS[key]) for key in WORKFLOW_NODE_ORDER]
    WORKFLOW_SUBSTATE_CHOICES = [(key, data['label']) for key, data in WORKFLOW_SUBSTATE_DEFINITIONS.items()]
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
    # Eliminamos choices para permitir categorías libres/no forzadas por UI
    type = models.CharField(max_length=50, null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    plan = models.ForeignKey('ListingPlan', null=True, blank=True, on_delete=models.SET_NULL, related_name='properties')
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
    contact_name = models.CharField(
        max_length=120,
        blank=True,
        help_text="Nombre de contacto principal para coordinar la visita del piloto."
    )
    contact_email = models.EmailField(
        blank=True,
        help_text="Correo directo del vendedor o encargado."
    )
    contact_phone = models.CharField(
        max_length=32,
        blank=True,
        help_text="Teléfono del vendedor o encargado disponible para los pilotos."
    )
    address_line1 = models.CharField(
        max_length=255,
        blank=True,
        help_text="Dirección o punto de encuentro principal para la grabación."
    )
    address_line2 = models.CharField(
        max_length=255,
        blank=True,
        help_text="Información adicional de la dirección (interior, lote, etc.)."
    )
    address_city = models.CharField(max_length=120, blank=True)
    address_region = models.CharField(max_length=120, blank=True)
    address_country = models.CharField(max_length=120, blank=True)
    address_postal_code = models.CharField(max_length=20, blank=True)
    has_water = models.BooleanField(default=False)
    has_views = models.BooleanField(default=False)
    publication_status = models.CharField(
        max_length=10,
        choices=PUBLICATION_STATUS_CHOICES,
        default='pending',
        help_text='Estado de publicación de la propiedad'
    )
    workflow_node = models.CharField(max_length=20, choices=WORKFLOW_NODE_CHOICES, default='review')
    workflow_substate = models.CharField(max_length=32, choices=WORKFLOW_SUBSTATE_CHOICES, default='draft')
    workflow_progress = models.PositiveIntegerField(default=0, help_text="Progreso porcentual 0-100 del flujo completo")
    workflow_alerts = models.JSONField(default=list, blank=True, help_text="Alertas visibles para el vendedor (estructura [{'type': 'warning', 'message': '...'}])")
    listing_type = models.CharField(max_length=10, choices=PROPERTY_LISTING_TYPES, default='sale')
    rent_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rental_terms = models.TextField(blank=True)
    plusvalia_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Métrica que refleja el potencial de plusvalía (0-100). Visible para suscriptores Pro.")
    # Campos enriquecidos por IA (clasificación y resumen). No se usan para filtrar en la UI.
    ai_category = models.CharField(max_length=100, null=True, blank=True, help_text="Categoría inferida por IA (ej. Farm, Ranch, Forest, Lake) o etiquetas internas.")
    ai_summary = models.TextField(null=True, blank=True, help_text="Resumen corto generado por IA para mejorar búsquedas y recomendaciones.")
    terrain = models.CharField(max_length=50, choices=TERRAIN_CHOICES, default='flat', blank=True)
    access = models.CharField(max_length=50, choices=ACCESS_CHOICES, default='paved', blank=True)
    legal_status = models.CharField(max_length=50, choices=LEGAL_STATUS_CHOICES, default='clear', blank=True)
    utilities = models.JSONField(default=list, blank=True, help_text="Lista de servicios disponibles (ej. ['water', 'electricity'])")
    preferred_time_windows = models.JSONField(default=list, blank=True, help_text="Ventanas sugeridas por el vendedor para coordinar visita (estructura [{'day':'2024-04-01','range':['09:00','12:00']}, ...])")
    access_notes = models.TextField(blank=True, help_text="Instrucciones de acceso, seguridad, contacto, etc.")
    seller_notes = models.TextField(blank=True, help_text="Notas internas para el equipo SkyTerra.")
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

        # Validar workflow
        substate_meta = WORKFLOW_SUBSTATE_DEFINITIONS.get(self.workflow_substate)
        if not substate_meta:
            raise ValidationError({'workflow_substate': 'Estado de flujo inválido'})

        expected_node = substate_meta['node']
        if self.workflow_node != expected_node:
            self.workflow_node = expected_node

        progress = substate_meta.get('percent')
        if progress is not None:
            self.workflow_progress = max(0, min(100, int(progress)))

        if self.workflow_progress < 0 or self.workflow_progress > 100:
            raise ValidationError({'workflow_progress': 'El progreso debe estar entre 0 y 100'})

        if self.workflow_alerts is not None and not isinstance(self.workflow_alerts, list):
            raise ValidationError({'workflow_alerts': 'Debe ser una lista de alertas.'})

    def calculate_plusvalia_score(self):
        """Calcula el puntaje de plusvalía de la propiedad combinando 7 métricas y una evaluación IA.
        El resultado se normaliza en un rango 0-100.
        """
        from .plusvalia_service import PlusvaliaService  # Import aquí para evitar ciclos
        return PlusvaliaService.calculate(self)

    # -----------------------------
    # Workflow helpers
    # -----------------------------

    def get_workflow_definition(self):
        """Estructura completa (nodos y subestados) para uso en frontends."""
        nodes = []
        for key in WORKFLOW_NODE_ORDER:
            nodes.append({
                'key': key,
                'label': WORKFLOW_NODE_LABELS.get(key, key.title()),
                'substates': [
                    {
                        'key': sub_key,
                        'label': meta.get('label'),
                        'percent': meta.get('percent'),
                    }
                    for sub_key, meta in WORKFLOW_SUBSTATE_DEFINITIONS.items()
                    if meta.get('node') == key
                ],
            })
        return nodes

    def get_current_cta(self):
        """Devuelve la acción recomendada para el subestado actual."""
        meta = WORKFLOW_SUBSTATE_DEFINITIONS.get(self.workflow_substate) or {}
        return meta.get('cta', {'label': 'Ver detalles', 'action': 'view_listing'})

    def get_current_eta(self):
        """Tiempo estimado restante (placeholders ajustables por plan)."""
        base_eta = WORKFLOW_NODE_DEFAULT_ETAS.get(self.workflow_node, {'label': 'Siguiente paso', 'hours': 0})
        plan_eta = None
        if self.plan:
            plan_eta = self.plan.get_eta_for_node(self.workflow_node)
        payload = base_eta.copy()
        if plan_eta is not None:
            payload['hours'] = plan_eta
        return payload

    def transition_to(self, substate, actor=None, message=None, metadata=None, commit=True):
        """Actualiza el estado del flujo y registra historial."""
        if substate not in WORKFLOW_SUBSTATE_DEFINITIONS:
            raise ValidationError({'workflow_substate': f'Estado "{substate}" no es válido.'})

        meta = WORKFLOW_SUBSTATE_DEFINITIONS[substate]
        self.workflow_substate = substate
        self.workflow_node = meta['node']

        percent = meta.get('percent')
        if percent is not None:
            self.workflow_progress = max(0, min(100, int(percent)))

        if substate == 'approved_for_shoot':
            try:
                self.ensure_job(actor=actor, auto_invite=True)
            except Exception as exc:
                self.add_alert(
                    'error',
                    'Hubo un problema al preparar la orden de producción. Nuestro equipo ya fue notificado.',
                    payload={'error': str(exc)},
                    commit=True,
                )

        metadata = metadata or {}
        if commit:
            self.save(
                update_fields=['workflow_substate', 'workflow_node', 'workflow_progress', 'updated_at'],
                recalculate_plusvalia=False,
            )
            PropertyStatusHistory.objects.create(
                property=self,
                node=self.workflow_node,
                substate=self.workflow_substate,
                percent=self.workflow_progress,
                message=message or '',
                metadata=metadata,
                actor=actor,
            )
        return self

    def add_alert(self, alert_type, message, payload=None, commit=True):
        """Agrega una alerta visible para el vendedor."""
        alert = {
            'type': alert_type,
            'message': message,
            'payload': payload or {},
            'created_at': timezone.now().isoformat(),
        }
        current_alerts = list(self.workflow_alerts or [])
        current_alerts.append(alert)
        self.workflow_alerts = current_alerts
        if commit:
            self.save(update_fields=['workflow_alerts', 'updated_at'], recalculate_plusvalia=False)
        return alert

    def clear_alerts(self, alert_type=None, commit=True):
        """Elimina alertas (todas o filtrando por tipo)."""
        if alert_type is None:
            self.workflow_alerts = []
        else:
            self.workflow_alerts = [
                item for item in (self.workflow_alerts or []) if item.get('type') != alert_type
            ]
        if commit:
            self.save(update_fields=['workflow_alerts', 'updated_at'], recalculate_plusvalia=False)
        return self.workflow_alerts

    def build_status_bar_payload(self):
        """Payload listo para front (barra de status)."""
        nodes_payload = []
        current_index = WORKFLOW_NODE_ORDER.index(self.workflow_node) if self.workflow_node in WORKFLOW_NODE_ORDER else 0
        for idx, node_key in enumerate(WORKFLOW_NODE_ORDER):
            node_payload = {
                'key': node_key,
                'label': WORKFLOW_NODE_LABELS.get(node_key, node_key.title()),
                'state': 'pending',
            }
            if idx < current_index:
                node_payload['state'] = 'done'
            elif idx == current_index:
                node_payload['state'] = 'active'
                sub_meta = WORKFLOW_SUBSTATE_DEFINITIONS.get(self.workflow_substate, {})
                node_payload['substate'] = self.workflow_substate
                node_payload['substate_label'] = sub_meta.get('label')
            nodes_payload.append(node_payload)

        return {
            'property_id': self.pk,
            'node': self.workflow_node,
            'node_label': WORKFLOW_NODE_LABELS.get(self.workflow_node, self.workflow_node.title()),
            'substate': self.workflow_substate,
            'substate_label': WORKFLOW_SUBSTATE_DEFINITIONS.get(self.workflow_substate, {}).get('label', self.workflow_substate),
            'percent': self.workflow_progress,
            'cta': self.get_current_cta(),
            'eta': self.get_current_eta(),
            'alerts': self.workflow_alerts or [],
            'nodes': nodes_payload,
        }

    def build_workflow_timeline(self):
        """Construye una línea de tiempo consolidada por nodo (5 hitos clave)."""
        now = timezone.now()
        history_qs = self.status_history.all().order_by('created_at')
        history = list(history_qs)

        if not history:
            history.append(
                SimpleNamespace(
                    node='review',
                    substate='draft',
                    percent=0,
                    message='Publicación creada',
                    metadata={'auto': True},
                    actor=None,
                    created_at=self.created_at or now,
                )
            )
        elif not any(event.node == 'review' for event in history):
            first = history[0]
            history.insert(
                0,
                SimpleNamespace(
                    node='review',
                    substate='draft',
                    percent=0,
                    message='Publicación creada',
                    metadata={'auto': True},
                    actor=None,
                    created_at=min(self.created_at or now, first.created_at),
                ),
            )

        history.sort(key=lambda entry: entry.created_at or now)

        node_start_times = {key: None for key in WORKFLOW_NODE_ORDER}
        node_end_times = {key: None for key in WORKFLOW_NODE_ORDER}
        events_by_node = {key: [] for key in WORKFLOW_NODE_ORDER}

        previous_node = None
        for event in history:
            node_key = getattr(event, 'node', None)
            if node_key not in events_by_node:
                continue
            if node_start_times[node_key] is None:
                node_start_times[node_key] = event.created_at
            events_by_node[node_key].append(event)
            if previous_node and previous_node != node_key and node_end_times.get(previous_node) is None:
                node_end_times[previous_node] = event.created_at
            previous_node = node_key

        timeline = []
        current_index = WORKFLOW_NODE_ORDER.index(self.workflow_node) if self.workflow_node in WORKFLOW_NODE_ORDER else 0

        for idx, node_key in enumerate(WORKFLOW_NODE_ORDER):
            node_label = WORKFLOW_NODE_LABELS.get(node_key, node_key.title())
            events = events_by_node.get(node_key, [])
            started_at = node_start_times.get(node_key) or (self.created_at if idx == 0 else None)
            completed_at = node_end_times.get(node_key)

            state = 'pending'
            if idx < current_index:
                state = 'done'
            elif idx == current_index:
                state = 'active'

            # Si la publicación ya está en vivo (subestado published), marcar el hito como completado.
            if node_key == 'live' and self.workflow_substate == 'published':
                state = 'done'

            if completed_at is None and events and state == 'done':
                # Para el último hito no existe un nodo siguiente que establezca completed_at.
                last_event = events[-1]
                completed_at = getattr(last_event, 'created_at', None) or now

            end_reference = completed_at
            if started_at and not end_reference and state in {'active', 'done'}:
                end_reference = now

            duration_hours = None
            duration_days = None
            if started_at and end_reference:
                delta = end_reference - started_at
                seconds = max(delta.total_seconds(), 0)
                duration_hours = round(seconds / 3600, 2)
                duration_days = round(seconds / 86400, 2)

            expected_hours = None
            plan_eta = self.plan.get_eta_for_node(node_key) if self.plan else None
            if plan_eta is not None:
                expected_hours = plan_eta
            else:
                expected_hours = WORKFLOW_NODE_DEFAULT_ETAS.get(node_key, {}).get('hours')

            def serialize_event(event):
                substate_meta = WORKFLOW_SUBSTATE_DEFINITIONS.get(getattr(event, 'substate', ''), {})
                return {
                    'substate': getattr(event, 'substate', None),
                    'substate_label': substate_meta.get('label'),
                    'created_at': (event.created_at or now).isoformat(),
                    'message': getattr(event, 'message', ''),
                    'metadata': getattr(event, 'metadata', {}) or {},
                    'percent': getattr(event, 'percent', None),
                    'actor': getattr(event, 'actor', None),
                }

            serialized_events = [serialize_event(event) for event in events]
            current_event = serialized_events[-1] if serialized_events else None

            timeline.append({
                'key': node_key,
                'label': node_label,
                'state': state,
                'started_at': started_at.isoformat() if started_at else None,
                'completed_at': completed_at.isoformat() if completed_at else None,
                'duration_hours': duration_hours,
                'duration_days': duration_days,
                'expected_hours': expected_hours,
                'expected_days': round(expected_hours / 24, 2) if expected_hours is not None else None,
                'events': serialized_events,
                'current_event': current_event,
            })

        return timeline

    def ensure_job(self, actor=None, auto_invite=True):
        """Garantiza que exista un Job operativo asociado."""
        job = getattr(self, 'job', None)
        if job:
            return job

        from decimal import Decimal as _Decimal

        plan = self.plan
        entitlements = plan.entitlements if plan and isinstance(plan.entitlements, dict) else {}
        pilot_payout = entitlements.get('pilot_payout') or entitlements.get('pilot_fee') or entitlements.get('pilot_payout_amount')
        try:
            pilot_payout_decimal = _Decimal(str(pilot_payout)) if pilot_payout is not None else None
        except Exception:
            pilot_payout_decimal = None
        if pilot_payout_decimal is None and plan and getattr(plan, 'price', None) is not None:
            try:
                pilot_payout_decimal = _Decimal(str(plan.price))
            except Exception:
                pilot_payout_decimal = plan.price

        job = Job.objects.create(
            property=self,
            plan=plan,
            status='draft',
            price_amount=getattr(plan, 'price', None),
            pilot_payout_amount=pilot_payout_decimal,
            vendor_instructions=self.access_notes or '',
            notes=self.seller_notes or '',
        )

        if auto_invite:
            from .matching import MATCHING_DEFAULTS  # Lazy import to avoid circular
            wave_sent = False
            for wave in range(1, MATCHING_DEFAULTS['max_waves'] + 1):
                offers = job.send_invite_wave(wave=wave, actor=actor)
                if offers:
                    wave_sent = True
                    break
            if not wave_sent:
                self.add_alert(
                    'warning',
                    'No encontramos pilotos disponibles. Nuestro equipo será notificado.',
                    payload={'step': 'matching'},
                    commit=True,
                )
        return job

    def compute_submission_requirements(self):
        required_docs = {'deed', 'plan', 'proof'}
        status_map = {}
        for document in self.documents.all():
            status_map.setdefault(document.doc_type, document.status)
        missing = [doc for doc in required_docs if status_map.get(doc) != 'approved']
        has_boundary = bool(self.boundary_polygon)
        has_contact = bool(self.contact_phone and self.contact_name)
        has_address = bool(self.address_line1)
        return {
            'missing_documents': missing,
            'has_boundary': has_boundary,
            'has_contact': has_contact,
            'has_address': has_address,
            'can_submit': not missing and has_boundary and has_contact and has_address,
            'required_documents': list(required_docs),
        }

    def save(self, *args, **kwargs):
        """Override save para calcular automáticamente el plusvalia_score antes de guardar."""
        # Ejecuta validaciones estándar
        is_new = self.pk is None
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

        if is_new:
            try:
                has_history = self.status_history.exists()
            except Exception:
                has_history = False
            if not has_history:
                PropertyStatusHistory.objects.create(
                    property=self,
                    node=self.workflow_node,
                    substate=self.workflow_substate,
                    percent=self.workflow_progress,
                    message='Publicación creada',
                    metadata={'auto': True},
                    actor=None,
                )

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
    status = models.CharField(max_length=20, choices=[('processing', 'Processing'), ('active', 'Active'), ('error', 'Error')], default='active')
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

# -----------------------------
# Planes y workflow de publicación
# -----------------------------

class ListingPlan(models.Model):
    """Planes disponibles para los vendedores (definen SLA y entregables)."""
    key = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    entitlements = models.JSONField(default=dict, blank=True, help_text="Configuración de entregables/beneficios del plan.")
    sla_hours = models.JSONField(default=dict, blank=True, help_text="Horas estimadas por nodo. Ej: {'review': 24, 'post': 72}")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price', 'name']

    def __str__(self):
        return self.name

    def get_eta_for_node(self, node_key):
        if not self.sla_hours:
            return None
        return self.sla_hours.get(node_key)


class PropertyStatusHistory(models.Model):
    """Traza historial de cambios de estado para la barra de status."""
    property = models.ForeignKey(Property, related_name='status_history', on_delete=models.CASCADE)
    node = models.CharField(max_length=20, choices=Property.WORKFLOW_NODE_CHOICES)
    substate = models.CharField(max_length=32, choices=Property.WORKFLOW_SUBSTATE_CHOICES)
    percent = models.PositiveIntegerField(default=0)
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='property_status_events')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.property_id} -> {self.substate} ({self.percent}%)"


class PilotProfile(models.Model):
    """Perfil operativo para la red de pilotos."""
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('suspended', 'Suspendido'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pilot_profile')
    display_name = models.CharField(max_length=120, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('5.00'))
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    completed_jobs = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_available = models.BooleanField(default=False)
    location_latitude = models.FloatField(null=True, blank=True)
    location_longitude = models.FloatField(null=True, blank=True)
    last_heartbeat_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.display_name or self.user.get_full_name() or self.user.username


class PilotDocument(models.Model):
    """Documentos que debe tener un piloto para operar."""
    DOCUMENT_TYPES = [
        ('id', 'Identificación'),
        ('license', 'Licencia de piloto'),
        ('drone_registration', 'Registro de dron'),
        ('insurance', 'Seguro'),
        ('background_check', 'Certificado de antecedentes'),
        ('other', 'Otro'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('expired', 'Vencido'),
    ]

    pilot = models.ForeignKey(PilotProfile, related_name='documents', on_delete=models.CASCADE)
    doc_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='pilot_documents/')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    expires_at = models.DateField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_pilot_documents')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ('pilot', 'doc_type')

    def __str__(self):
        return f"{self.pilot} - {self.doc_type} ({self.status})"


JOB_STATUS_TO_PROPERTY_SUBSTATE = {
    'draft': 'approved_for_shoot',
    'inviting': 'inviting',
    'assigned': 'assigned',
    'scheduling': 'scheduling',
    'scheduled': 'scheduled',
    'shooting': 'shooting',
    'finished': 'finished',
    'uploading': 'uploading',
    'received': 'received',
    'qc': 'qc',
    'editing': 'editing',
    'preview_ready': 'preview_ready',
    'ready_for_publish': 'ready_for_publish',
    'published': 'published',
}


class Job(models.Model):
    """Trabajo operacional que conecta propiedad con piloto."""
    STATUS_CHOICES = [
        ('draft', 'En preparación'),
        ('inviting', 'Buscando piloto'),
        ('assigned', 'Piloto asignado'),
        ('scheduling', 'Coordinando agenda'),
        ('scheduled', 'Agenda confirmada'),
        ('shooting', 'En grabación'),
        ('finished', 'Grabación finalizada'),
        ('uploading', 'Subiendo material'),
        ('received', 'Material recibido'),
        ('qc', 'Control de calidad'),
        ('editing', 'En edición'),
        ('preview_ready', 'Preview listo'),
        ('ready_for_publish', 'Listo para publicar'),
        ('published', 'Publicado'),
        ('canceled', 'Cancelado'),
    ]

    property = models.OneToOneField(Property, related_name='job', on_delete=models.CASCADE)
    plan = models.ForeignKey(ListingPlan, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='draft')
    price_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    pilot_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    assigned_pilot = models.ForeignKey(PilotProfile, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_jobs')
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    invite_wave = models.PositiveIntegerField(default=0)
    last_status_change_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True)
    vendor_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Job {self.id} for property {self.property_id} ({self.status})"

    def send_invite_wave(self, wave=None, actor=None):
        """Envía una nueva ola de invitaciones."""
        from .matching import send_wave

        if wave is None or wave <= 0:
            wave = self.invite_wave + 1 if self.invite_wave else 1

        offers = send_wave(self, wave, actor=actor)
        if not offers and wave > self.invite_wave:
            # No se encontraron pilotos; mantener estado y alertar.
            self.property.add_alert(
                'warning',
                'No hay pilotos disponibles en este radio. Nuestro equipo revisará alternativas.',
                payload={'wave': wave},
                commit=True,
            )
        return offers

    def expire_pending_offers(self, auto=True):
        """Marca ofertas vencidas y opcionalmente envía la siguiente ola."""
        from .matching import MATCHING_DEFAULTS

        now = timezone.now()
        pending = self.offers.filter(status='pending', expires_at__lt=now)
        count = pending.update(status='expired', responded_at=now) if pending.exists() else 0

        if auto and count:
            next_wave = self.invite_wave + 1 if self.invite_wave else 1
            if next_wave <= MATCHING_DEFAULTS['max_waves']:
                offers = self.send_invite_wave(wave=next_wave, actor=None)
                if not offers:
                    self.property.add_alert(
                        'warning',
                        'Seguimos sin pilotos disponibles. Nuestro equipo coordinará manualmente.',
                        payload={'wave': next_wave},
                        commit=True,
                    )
            else:
                self.property.add_alert(
                    'warning',
                    'Se agotaron las invitaciones automáticas. Contactaremos contigo en breve.',
                    payload={'wave': next_wave},
                    commit=True,
                )
        return count

    def transition(self, status, actor=None, message=None, metadata=None, commit=True):
        if status not in dict(self.STATUS_CHOICES):
            raise ValidationError({'status': f'Estado "{status}" inválido.'})
        self.status = status
        if commit:
            actor_user = actor.user if isinstance(actor, PilotProfile) else actor
            update_fields = ['status', 'last_status_change_at', 'updated_at']
            if status == 'scheduled' and self.scheduled_start and self.scheduled_end:
                update_fields.extend(['scheduled_start', 'scheduled_end'])
            if status == 'assigned' and self.assigned_pilot_id:
                update_fields.append('assigned_pilot')
            self.save(update_fields=update_fields)
            JobTimelineEvent.objects.create(
                job=self,
                kind=status,
                message=message or '',
                metadata=metadata or {},
                actor=actor_user,
            )
        substate = JOB_STATUS_TO_PROPERTY_SUBSTATE.get(status)
        if substate:
            self.property.transition_to(
                substate,
                actor=actor.user if isinstance(actor, PilotProfile) else actor,
                message=message,
                metadata=metadata,
                commit=commit,
            )
        return self


class JobTimelineEvent(models.Model):
    """Eventos visibles en la línea de tiempo operacional."""
    job = models.ForeignKey(Job, related_name='timeline', on_delete=models.CASCADE)
    kind = models.CharField(max_length=50)
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='job_timeline_events')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_id} - {self.kind}"


class JobOffer(models.Model):
    """Invitaciones enviadas a pilotos elegibles."""
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('accepted', 'Aceptada'),
        ('declined', 'Rechazada'),
        ('expired', 'Expirada'),
        ('canceled', 'Cancelada'),
    ]

    job = models.ForeignKey(Job, related_name='offers', on_delete=models.CASCADE)
    pilot = models.ForeignKey(PilotProfile, related_name='offers', on_delete=models.CASCADE)
    wave = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    radius_km = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    ttl_seconds = models.PositiveIntegerField(default=20)
    sent_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-sent_at']
        unique_together = ('job', 'pilot')

    def __str__(self):
        return f"Offer {self.id} job {self.job_id} -> {self.pilot_id} ({self.status})"

    def accept(self, actor_user=None):
        if self.status != 'pending':
            raise ValidationError("La invitación ya no está disponible.")
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save(update_fields=['status', 'responded_at'])

        self.job.assigned_pilot = self.pilot
        self.job.transition(status='assigned', actor=actor_user, message='Piloto aceptó el trabajo.')
        # Expirar otras ofertas pendientes del mismo trabajo
        self.job.offers.exclude(pk=self.pk).filter(status='pending').update(
            status='expired',
            responded_at=timezone.now()
        )
        return self

    def decline(self):
        if self.status != 'pending':
            return self
        self.status = 'declined'
        self.responded_at = timezone.now()
        self.save(update_fields=['status', 'responded_at'])
        if not self.job.offers.filter(status='pending').exists():
            next_wave = self.job.invite_wave + 1 if self.job.invite_wave else 1
            if next_wave != self.job.invite_wave:
                self.job.send_invite_wave(wave=next_wave, actor=None)
        return self

# -----------------------------
# Órdenes de Grabación (workflow)
# -----------------------------

class RecordingOrder(models.Model):
    STATUS_CHOICES = [
        ('created', 'Orden creada'),
        ('recording', 'En grabación'),
        ('postproduction', 'Postproducción'),
        ('done', 'Finalizado'),
        ('canceled', 'Cancelado'),
    ]

    property = models.ForeignKey(Property, related_name='recording_orders', on_delete=models.CASCADE)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='recording_orders', on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name='assigned_recordings', on_delete=models.SET_NULL, limit_choices_to={'is_staff': True})
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created', db_index=True)
    scheduled_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"RecordingOrder {self.id} for {self.property.name} - {self.get_status_display()}"
