from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status, serializers
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Exists, OuterRef, Q
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail
import json
import datetime
import requests
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache import cache
from functools import wraps
import re
import hashlib
import logging
import traceback
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.utils._os import safe_join
import mimetypes
import os
import uuid
import zipfile
import shutil

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
    WORKFLOW_NODE_ORDER,
    WORKFLOW_NODE_LABELS,
    WORKFLOW_SUBSTATE_DEFINITIONS,
)
from .serializers import (
    PropertySerializer,
    PropertyListSerializer,
    TourSerializer,
    ImageSerializer,
    PropertyDocumentSerializer,
    PropertyVisitSerializer,
    PropertyPreviewSerializer,
    ComparisonSessionSerializer,
    TourPackageCreateSerializer,
    SavedSearchSerializer,
    FavoriteSerializer,
    RecordingOrderSerializer,
    ListingPlanSerializer,
    PropertyStatusHistorySerializer,
    PropertyStatusBarSerializer,
    PilotProfileSerializer,
    PilotDocumentSerializer,
    JobSerializer,
    JobOfferSerializer,
)
from skyterra_backend.permissions import IsOwnerOrAdmin
from .services import GeminiService, GeminiServiceError, categorize_property_with_ai, create_fallback_response_simple
from .email_service import send_property_status_email, send_recording_order_created_email, send_recording_order_status_email

# Create your views here.
logger = logging.getLogger(__name__)

def generate_cache_key(request, view_name, additional_params=None):
    """
    Genera una clave de caché inteligente basada en los parámetros de la request.
    Incluye query params relevantes para asegurar que diferentes filtros tengan diferentes claves.
    """
    # Parámetros base
    key_parts = [view_name]

    # Agregar parámetros de query relevantes para el caché
    # Compatibilidad con Django HttpRequest y DRF Request
    try:
        query_params = request.query_params.copy()  # DRF Request
    except Exception:
        try:
            query_params = request.GET.copy()  # Django HttpRequest
        except Exception:
            query_params = {}
    relevant_params = [
        'page', 'page_size', 'ordering', 'search',
        'price', 'size', 'has_water', 'has_views', 'listing_type',
        'min_price', 'max_price', 'min_size', 'max_size'
    ]

    for param in relevant_params:
        if param in query_params:
            key_parts.append(f"{param}:{query_params[param]}")

    # Agregar parámetros adicionales si existen
    if additional_params:
        for param, value in additional_params.items():
            key_parts.append(f"{param}:{value}")

    # Crear hash para la clave
    key_string = '|'.join(key_parts)
    return f"properties:{hashlib.md5(key_string.encode()).hexdigest()}"


def smart_cache_page(timeout=300):
    """
    Decorador inteligente para caché que considera parámetros de query y usuario.
    Cachea por 5 minutos por defecto, pero invalida cuando cambian parámetros relevantes.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(self, request, *args, **kwargs):
            # Solo cachear para métodos GET
            if request.method != 'GET':
                return view_func(self, request, *args, **kwargs)

            # Generar clave de caché inteligente
            cache_key = generate_cache_key(request, view_func.__name__)

            # Intentar obtener del caché
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                try:
                    # Reconstruir Response desde datos cacheados
                    cached_data = cached_response.get('data') if isinstance(cached_response, dict) else cached_response
                    cached_status = cached_response.get('status', 200) if isinstance(cached_response, dict) else 200
                    return Response(cached_data, status=cached_status)
                except Exception:
                    # Si algo falla con el formato cacheado, continuar a ejecutar la vista
                    logger.warning("Cached value format invalid; regenerating response")

            # Ejecutar la vista
            response = view_func(self, request, *args, **kwargs)

            # Cachear la respuesta si es exitosa
            if hasattr(response, 'status_code') and response.status_code == 200:
                try:
                    payload = getattr(response, 'data', None)
                    if payload is not None:
                        cache.set(cache_key, {'data': payload, 'status': 200}, timeout)
                        logger.debug(f"Cached response for key: {cache_key}")
                except Exception as e:
                    logger.warning(f"Failed to cache response for key {cache_key}: {e}")

            return response
        return _wrapped_view
    return decorator


def invalidate_property_cache():
    """
    Invalida todo el caché relacionado con propiedades.
    Útil cuando se crea, actualiza o elimina una propiedad.
    """
    # Obtener todas las claves que empiecen con 'properties:'
    cache_keys = cache.keys('properties:*') if hasattr(cache, 'keys') else []

    if cache_keys:
        cache.delete_many(cache_keys)
        logger.info(f"Invalidated {len(cache_keys)} property cache keys")
    else:
        # Fallback: borrar todas las claves que contengan 'properties'
        # Esto es menos eficiente pero funciona con todos los backends de caché
        try:
            # Intentar borrar algunas claves comunes
            common_keys = [
                'properties:list',
                'properties:preview',
                'properties:search',
            ]
            cache.delete_many(common_keys)
            logger.info("Invalidated common property cache keys")
        except:
            logger.warning("Could not invalidate property cache - cache backend may not support key listing")

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20 # Increased default page size for better performance
    page_size_query_param = 'page_size' # Allow client to override page_size
    max_page_size = 200 # Increased maximum page size for power users

class PropertyPreviewViewSet(viewsets.ReadOnlyModelViewSet):
    """Vista read-only que expone detalles mínimos de propiedades para visitantes anónimos"""
    queryset = Property.objects.filter(publication_status='approved').order_by('-created_at')
    serializer_class = PropertyPreviewSerializer
    pagination_class = StandardResultsSetPagination
    # Eliminamos filtros: el portal no expone filtros UI
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at', 'plusvalia_score']
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """
        Optimizado para preview de propiedades con prefetch_related para evitar N+1 queries.
        """
        queryset = super().get_queryset()

        # Optimizaciones para vista de preview
        queryset = queryset.prefetch_related(
            'images',  # Prefetch imágenes para el preview
        ).annotate(
            image_count_annotation=Count('images', distinct=True),
            has_tour_annotation=Exists(
                Tour.objects.filter(
                    property_id=OuterRef('pk'),
                    status='active'
                ).exclude(url__isnull=True).exclude(url='')
            )
        )

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Permite filtrar por múltiples IDs usando el query param `id__in=1,2,3`.
        Mantiene paginación y ordering estándar. Si alguno de los IDs no existe
        o no está publicado (approved), simplemente no aparecerá en los
        resultados.
        """
        try:
            ids_param = request.query_params.get('id__in')
            queryset = self.get_queryset()
            if ids_param:
                try:
                    raw_ids = [x.strip() for x in ids_param.split(',') if x.strip()]
                    ids = [int(x) for x in raw_ids]
                    if ids:
                        queryset = queryset.filter(id__in=ids)
                except Exception:
                    # Si el parámetro viene mal formado, ignorarlo y continuar sin filtro
                    pass

            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as exc:
            logger.error("Error en PropertyPreviewViewSet.list: %s", exc)
            serializer = self.get_serializer(self.get_queryset()[:0], many=True)
            # Responder vacío para no romper UX si hay algún problema puntual
            return Response(serializer.data)

class PropertyViewSet(viewsets.ModelViewSet):
    """Viewset para la gestión de propiedades inmobiliarias"""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at', 'plusvalia_score']

    def get_permissions(self):
        """
        Permite lectura (list, retrieve) a cualquiera.
        Requiere ser propietario o admin para otras acciones (create, update, delete).
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        else: # For update, partial_update, destroy, etc.
            permission_classes = [IsOwnerOrAdmin]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'my_properties':
            return PropertyListSerializer
        return PropertySerializer
    
    def get_queryset(self):
        """
        Permite filtrar propiedades por rango de precio y tamaño y anota conteos relacionados.
        Optimizado con prefetch_related para evitar N+1 queries y select_related para joins eficientes.
        """
        queryset = super().get_queryset()

        # Optimizaciones de base de datos para evitar N+1 queries
        # Prefetch todas las relaciones necesarias en una sola consulta
        queryset = queryset.select_related(
            'owner',  # Join eficiente para el owner
            'plan',
            'job',
            'job__assigned_pilot',
            'job__assigned_pilot__user',
        ).prefetch_related(
            'images',  # Prefetch todas las imágenes relacionadas
            'tours',   # Prefetch todos los tours relacionados
            'documents',  # Prefetch documentos relacionados
            'documents__reviewed_by',
            'status_history',
            'job__offers',
            'job__offers__pilot',
            'job__offers__pilot__user',
            'job__timeline',
            'job__timeline__actor',
            'tours__property',  # Para evitar queries adicionales en el serializer de tours
            'images__property',  # Para evitar queries adicionales en el serializer de images
            'documents__property',  # Para evitar queries adicionales en el serializer de documents
            'owner__properties'  # Prefetch otras propiedades del mismo owner si se necesitan
        )

        # Annotations optimizadas - una sola consulta para contar elementos relacionados
        queryset = queryset.annotate(
            image_count_annotation=Count('images', distinct=True),
            tour_count_annotation=Count(
                'tours',
                distinct=True,
                filter=(Q(tours__status='active') & Q(tours__url__isnull=False) & ~Q(tours__url=''))
            ),
            document_count_annotation=Count('documents', distinct=True),
            has_tour_annotation=Exists(
                Tour.objects.filter(
                    property_id=OuterRef('pk'),
                    status='active'
                ).exclude(url__isnull=True).exclude(url='')
            ),
            has_document_annotation=Exists(PropertyDocument.objects.filter(property=OuterRef('pk')))
        )

        # Filter by publication_status for non-staff users # Comentado para mostrar todas
        # if not self.request.user.is_staff:
        #     queryset = queryset.filter(publication_status='approved')

        # Sin filtros de rango ni booleanos: Sam decide internamente

        # Optimización adicional: ordenar por campos indexados cuando sea posible
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['-created_at', 'created_at', '-updated_at', 'updated_at']:
            # Estos campos tienen índices naturales, usarlos directamente
            queryset = queryset.order_by(ordering)
        elif ordering in ['price', '-price', 'size', '-size']:
            # Campos que pueden beneficiarse de índices compuestos
            queryset = queryset.order_by(ordering, '-created_at')  # Fallback para estabilidad

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve para optimizar consulta individual de propiedad"""
        # Usar select_related y prefetch_related para optimizar la consulta
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        """Actualizar propiedad con validaciones adicionales"""
        try:
            instance = serializer.save()
            logger.info(f"Propiedad {instance.id} actualizada exitosamente. Nuevo estado: {instance.publication_status}")

            # Invalidar caché después de actualizar propiedad
            invalidate_property_cache()

            # Intentar refrescar clasificación/resumen por IA cuando cambien campos relevantes
            try:
                ai_data = categorize_property_with_ai(instance)
                updates = {}
                if ai_data.get('ai_category'):
                    updates['ai_category'] = ai_data['ai_category']
                if ai_data.get('ai_summary'):
                    updates['ai_summary'] = ai_data['ai_summary']
                if updates:
                    for k,v in updates.items():
                        setattr(instance, k, v)
                    instance.save(update_fields=list(updates.keys()))
            except Exception as _:
                logger.warning(f"No se pudo refrescar enriquecimiento IA para propiedad {instance.id}")

            # Manejar documentos nuevos enviados en actualización
            new_docs = self.request.FILES.getlist('new_documents')
            if new_docs:
                for doc_file in new_docs:
                    PropertyDocument.objects.create(
                        property=instance,
                        file=doc_file,
                        doc_type='other'
                    )
                logger.info(f"{len(new_docs)} documento(s) añadidos a la propiedad {instance.id} en actualización")

        except Exception as e:
            logger.error(f"Error al actualizar propiedad: {str(e)}", exc_info=True)
            # Re-raise to be handled by the main update method or DRF's exception handler
            raise

    def create(self, request, *args, **kwargs):
        """Permite a un vendedor crear su publicación inicial."""
        if not request.user.is_authenticated:
            return Response({'detail': 'Autenticación requerida'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        property_instance = serializer.save(owner=request.user)
        # Registrar historial inicial
        property_instance.transition_to(
            property_instance.workflow_substate or 'draft',
            actor=request.user,
            message='Publicación creada',
            metadata={'source': 'seller_create'},
            commit=True,
        )
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(property_instance).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Permitir edición a staff y propietarios."""
        property_instance = self.get_object()
        if not request.user.is_staff and property_instance.owner_id != request.user.id:
            raise PermissionDenied("No tienes permisos para editar esta propiedad.")
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error en update: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error al actualizar la propiedad', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def partial_update(self, request, *args, **kwargs):
        """Permitir edición parcial a staff y propietarios."""
        property_instance = self.get_object()
        if not request.user.is_staff and property_instance.owner_id != request.user.id:
            raise PermissionDenied("No tienes permisos para editar esta propiedad.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='my-properties', permission_classes=[permissions.IsAuthenticated])
    def my_properties(self, request):
        """Devuelve las propiedades del usuario autenticado."""
        queryset = self.get_queryset().filter(owner=request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit', permission_classes=[permissions.IsAuthenticated])
    def submit_for_review(self, request, pk=None):
        """Permite al vendedor enviar su publicación a revisión."""
        property_instance = self.get_object()
        if not (request.user.is_staff or property_instance.owner_id == request.user.id):
            raise PermissionDenied("No tienes permisos para esta acción.")
        requirements = property_instance.compute_submission_requirements()
        if not requirements.get('can_submit'):
            return Response(
                {
                    'error': 'La publicación aún no cumple los requisitos para revisión.',
                    'missing_documents': requirements.get('missing_documents', []),
                    'has_boundary': requirements.get('has_boundary'),
                    'has_contact': requirements.get('has_contact'),
                    'has_address': requirements.get('has_address'),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        message = request.data.get('message', 'Publicación enviada a revisión.')
        metadata = request.data.get('metadata', {})
        property_instance.transition_to('submitted', actor=request.user, message=message, metadata=metadata, commit=True)
        serializer = self.get_serializer(property_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='workflow-structure', permission_classes=[permissions.AllowAny])
    def workflow_structure(self, request):
        """Devuelve la estructura completa (nodos y subestados) para construir la UI."""
        payload = []
        for node_key in WORKFLOW_NODE_ORDER:
            payload.append({
                'key': node_key,
                'label': WORKFLOW_NODE_LABELS.get(node_key, node_key.title()),
                'substates': [
                    {
                        'key': sub_key,
                        'label': meta.get('label'),
                        'percent': meta.get('percent'),
                    }
                    for sub_key, meta in WORKFLOW_SUBSTATE_DEFINITIONS.items()
                    if meta.get('node') == node_key
                ],
            })
        return Response(payload)

    @action(detail=True, methods=['get'], url_path='status-bar', permission_classes=[permissions.IsAuthenticated])
    def status_bar(self, request, pk=None):
        """Retorna payload de la barra de status para el vendedor."""
        property_instance = self.get_object()
        payload = property_instance.build_status_bar_payload()
        serializer = PropertyStatusBarSerializer(payload)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='status-history', permission_classes=[permissions.IsAuthenticated])
    def status_history(self, request, pk=None):
        """Devuelve el historial de transiciones."""
        property_instance = self.get_object()
        serializer = PropertyStatusHistorySerializer(property_instance.status_history.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='transition', permission_classes=[permissions.IsAdminUser])
    def transition_workflow(self, request, pk=None):
        """Permite a un admin mover una publicación a un subestado específico."""
        property_instance = self.get_object()
        substate = request.data.get('substate')
        message = request.data.get('message', '')
        metadata = request.data.get('metadata', {})
        if not substate:
            return Response({'error': 'El campo "substate" es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            property_instance.transition_to(substate, actor=request.user, message=message, metadata=metadata, commit=True)
        except ValidationError as exc:
            return Response({'error': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(property_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='alerts', permission_classes=[permissions.IsAdminUser])
    def add_alert(self, request, pk=None):
        """Agrega una alerta para el vendedor (ej. documentos vencidos)."""
        property_instance = self.get_object()
        alert_type = request.data.get('type', 'info')
        message = request.data.get('message')
        payload = request.data.get('payload')
        if not message:
            return Response({'error': 'Se requiere un mensaje'}, status=status.HTTP_400_BAD_REQUEST)
        alert = property_instance.add_alert(alert_type, message, payload, commit=True)
        return Response(alert, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='clear-alerts', permission_classes=[permissions.IsAdminUser])
    def clear_alerts(self, request, pk=None):
        """Permite limpiar alertas (todas o por tipo)."""
        property_instance = self.get_object()
        alert_type = request.data.get('type')
        alerts = property_instance.clear_alerts(alert_type, commit=True)
        return Response({'alerts': alerts})

    @action(detail=True, methods=['post'], url_path='set-status', permission_classes=[permissions.IsAdminUser])
    def set_publication_status(self, request, pk=None):
        """Permite a un administrador cambiar el estado de publicación de una propiedad."""
        property_instance = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response({'error': 'El campo "status" es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in Property.PUBLICATION_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Estado inválido. Opciones válidas: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            property_instance.publication_status = new_status
            property_instance.save(update_fields=['publication_status', 'updated_at'])

            # Notificar al dueño del cambio de estado
            try:
                send_property_status_email(property_instance)
            except Exception:
                logger.warning("Fallo al enviar email de cambio de estado de propiedad")

            # Invalidar caché después de cambiar estado
            invalidate_property_cache()

            logger.info(f"Usuario {request.user.username} actualizó estado de propiedad ID {property_instance.id} a {new_status}")
            serializer = self.get_serializer(property_instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al actualizar estado de propiedad ID {property_instance.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error interno al actualizar el estado.', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='ai-categorize', permission_classes=[permissions.IsAdminUser])
    def ai_categorize(self, request, pk=None):
        """Permite forzar categorización/resumen por IA para una propiedad."""
        prop = self.get_object()
        data = categorize_property_with_ai(prop)
        if not data:
            return Response({'detail': 'No se pudo obtener clasificación IA'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        for k,v in data.items():
            setattr(prop, k, v)
        prop.save(update_fields=list(data.keys()))

        # Invalidar caché después de categorización IA
        invalidate_property_cache()

        return Response({'detail': 'Propiedad enriquecida', **data}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Restringir eliminación a staff; bloquear para clientes."""
        if not self.request.user.is_staff:
            raise PermissionDenied("Eliminación deshabilitada para clientes.")
        try:
            logger.info(f"Eliminando propiedad {instance.id} por usuario {self.request.user.username}")
            instance.delete()
            invalidate_property_cache()
            logger.info(f"Propiedad {instance.id} eliminada exitosamente")
        except Exception as e:
            logger.error(f"Error al eliminar propiedad {instance.id}: {str(e)}", exc_info=True)
            raise

class TourViewSet(viewsets.ModelViewSet):
    """Viewset para gestionar tours virtuales"""
    # Mostrar primero los tours más recientes.  Esto es útil porque el frontend
    # suele tomar el primer elemento para pre-visualización.
    queryset = Tour.objects.all().order_by('-created_at')
    serializer_class = TourSerializer
    filter_backends = []

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'get_stats', 'serve_content']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            # Allow any authenticated user to create tours (including admins)
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['destroy', 'update', 'partial_update']:
            # Only staff/admin users can delete or modify tours
            permission_classes = [permissions.IsAdminUser]
        else:
            # For other actions, require authentication
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return TourPackageCreateSerializer
        return TourSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        try:
            prop = self.request.query_params.get('property') or self.request.query_params.get('property_id')
        except Exception:
            prop = None
        if prop:
            try:
                qs = qs.filter(property_id=int(prop))
            except Exception:
                qs = qs.filter(property_id=prop)
        only_active = (self.request.query_params.get('only_active') or '').lower()
        if only_active in ('1', 'true', 'yes'):
            qs = qs.filter(status='active').exclude(url__isnull=True).exclude(url='')
        return qs

    def perform_create(self, serializer):
        package_file = serializer.validated_data.pop('package_file')
        prop = serializer.validated_data.get('property')

        # Validar permisos: solo el propietario o staff pueden subir tours para una propiedad
        try:
            if not self.request.user.is_staff and getattr(prop, 'owner_id', None) != self.request.user.id:
                raise PermissionDenied("Solo el propietario o staff puede subir tours para esta propiedad.")
        except Exception:
            # Si no hay prop o user, denegar de forma segura
            raise PermissionDenied("Permisos insuficientes para subir tour.")
        
        # Validar extensión
        allowed_extensions = ['.zip', '.ggpkg']
        if not any(package_file.name.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError({
                'package_file': f"Tipo de archivo no permitido. Solo se permiten archivos: {', '.join(allowed_extensions)}"
            })

        # Validación de tamaño removida - permitir archivos de cualquier tamaño

        tour_uuid = uuid.uuid4()
        tour_dir = os.path.join(settings.MEDIA_ROOT, 'tours', str(tour_uuid))
        
        try:
            os.makedirs(tour_dir, exist_ok=True)
            
            package_path = os.path.join(tour_dir, package_file.name)
            
            # Guardar archivo con validación de escritura
            try:
                with open(package_path, 'wb+') as destination:
                    for chunk in package_file.chunks():
                        destination.write(chunk)
            except (OSError, IOError) as e:
                raise serializers.ValidationError({
                    'package_file': f"Error escribiendo archivo: {str(e)}"
                })

            # Validar que es un ZIP válido
            try:
                if not zipfile.is_zipfile(package_path):
                    raise serializers.ValidationError({
                        'package_file': "El archivo no es un ZIP válido. Verifica que el archivo no esté corrupto."
                    })
            except Exception as e:
                raise serializers.ValidationError({
                    'package_file': f"Error validando archivo ZIP: {str(e)}"
                })

            # Extraer contenido del ZIP con validación de seguridad
            try:
                with zipfile.ZipFile(package_path, 'r') as zip_ref:
                    # Validar contenido del ZIP
                    total_size = 0
                    file_count = 0
                    
                    for member in zip_ref.infolist():
                        # Chequeo de seguridad contra path traversal
                        if member.filename.startswith('/') or '..' in member.filename:
                            raise serializers.ValidationError({
                                'package_file': f"El archivo contiene rutas inseguras: {member.filename}"
                            })
                        
                        # (Compatibilidad) No limitar el tamaño descomprimido aquí.
                        # Se mantiene un conteo informativo, pero sin bloquear.
                        try:
                            total_size += int(getattr(member, 'file_size', 0) or 0)
                        except Exception:
                            pass
                        file_count += 1
                        
                        # Nota: se eliminó el límite de cantidad de archivos por requerimiento
                    
                    zip_ref.extractall(tour_dir)
                    
            except zipfile.BadZipFile:
                raise serializers.ValidationError({
                    'package_file': "Archivo ZIP corrupto o inválido"
                })
            except Exception as e:
                if "inseguras" in str(e) or "demasiado" in str(e):
                    raise  # Re-lanzar nuestros errores personalizados
                raise serializers.ValidationError({
                    'package_file': f"Error extrayendo archivo: {str(e)}"
                })
            
            # Eliminar archivo ZIP original
            os.remove(package_path)

            # Post-proceso: sanitizar referencias absolutas tipo file:///C:/... dentro de html/js para evitar CORS
            try:
                file_uri_pattern = re.compile(r"file:///[A-Za-z]:[^'\"\s>]*")
                for root_dir, _dirs, files in os.walk(tour_dir):
                    for fname in files:
                        lower = fname.lower()
                        if lower.endswith(('.html', '.htm', '.js')):
                            fpath = os.path.join(root_dir, fname)
                            try:
                                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                                    content = f.read()
                                def _to_relative(m):
                                    uri = m.group(0)
                                    # Mantener querystring si existe
                                    base, sep, query = uri.partition('?')
                                    basename = os.path.basename(base)
                                    return basename + (sep + query if sep else '')
                                new_content = file_uri_pattern.sub(_to_relative, content)
                                if new_content != content:
                                    with open(fpath, 'w', encoding='utf-8', errors='ignore') as f:
                                        f.write(new_content)
                            except Exception:
                                # No bloquear por errores de sanitización
                                pass
            except Exception:
                pass

            # Buscar archivos de entrada del tour (HTML, HTM, PHP)
            entry_files = []
            try:
                for root_dir, _dirs, files in os.walk(tour_dir):
                    for fname in files:
                        if fname.lower().endswith(('.html', '.htm', '.php')):
                            rel_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir)
                            rel_path_posix = rel_path.replace('\\', '/')  # Normalizar separadores
                            depth = rel_path_posix.count('/')
                            entry_files.append((depth, rel_path_posix))
            except Exception as e:
                raise serializers.ValidationError({
                    'package_file': f"Error explorando contenido del tour: {str(e)}"
                })

            # Seleccionar el archivo de entrada principal usando lógica mejorada
            html_entry = self._select_tour_entry_file(tour_dir, entry_files)

            if not html_entry:
                # Si no se encontró ningún archivo de entrada válido, intentar generar uno automático para Pano2VR
                html_entry = self._generate_pano2vr_wrapper(tour_dir)

            # Prefer a stable, backend-served URL to avoid issues with dev media serving
            # Example: /api/tours/content/<uuid>/<relative-entry>
            tour_url = f"/api/tours/content/{tour_uuid}/{html_entry}"

            # Validar que el archivo de entrada existe y es accesible
            entry_file_path = os.path.join(tour_dir, html_entry.replace('/', os.sep))
            if not os.path.isfile(entry_file_path):
                logger.error(f"Archivo de entrada no encontrado: {entry_file_path}")
                raise serializers.ValidationError({
                    'package_file': f"El archivo de entrada seleccionado '{html_entry}' no existe en el paquete"
                })

            # Verificar que el archivo no está vacío y tiene contenido válido
            try:
                with open(entry_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(1024)  # Leer primeros 1KB
                    if not content.strip():
                        raise serializers.ValidationError({
                            'package_file': f"El archivo de entrada '{html_entry}' está vacío"
                        })

                    # Para archivos PHP, verificar que tienen estructura básica
                    if html_entry.lower().endswith('.php'):
                        if '<?php' not in content and '<!DOCTYPE' not in content:
                            logger.warning(f"Archivo PHP '{html_entry}' no parece tener estructura válida")

            except (IOError, OSError) as e:
                logger.error(f"Error accediendo al archivo de entrada: {e}")
                raise serializers.ValidationError({
                    'package_file': f"Error accediendo al archivo de entrada '{html_entry}': {str(e)}"
                })

            instance = serializer.save(
                url=tour_url,
                package_path=os.path.join('tours', str(tour_uuid)),
                type='package',
                status='active',
                tour_id=tour_uuid
            )

            logger.info(f"Tour {instance.id} procesado exitosamente: {len(entry_files)} archivos de entrada encontrados, usando {html_entry}")

            # Asegurar un solo tour por propiedad: eliminar anteriores
            deleted_count = Tour.objects.filter(property=instance.property).exclude(id=instance.id).count()
            if deleted_count > 0:
                Tour.objects.filter(property=instance.property).exclude(id=instance.id).delete()
                logger.info(f"Eliminados {deleted_count} tours anteriores de la propiedad {instance.property.id}")

        except serializers.ValidationError:
            # Limpiar en caso de error de validación
            if os.path.exists(tour_dir):
                shutil.rmtree(tour_dir)
            raise
        except Exception as e:
            # Limpiar en caso de cualquier otro error
            if os.path.exists(tour_dir):
                shutil.rmtree(tour_dir)
            logger.error(f"Error inesperado procesando tour: {e}", exc_info=True)
            raise serializers.ValidationError({
                'package_file': f"Error interno procesando el tour: {str(e)}"
            })

    @action(detail=False, methods=['get'], url_path=r'content/(?P<tour_uuid>[^/]+)/(?P<subpath>.*)', permission_classes=[permissions.AllowAny])
    def serve_content(self, request, tour_uuid=None, subpath=''):
        """
        Sirve archivos del paquete del tour desde el disco de manera segura.

        Esto evita depender de la ruta /media/ cuando el entorno de desarrollo
        o el despliegue no está sirviendo MEDIA_URL directamente.

        Ejemplo de URL final expuesta por la API:
        /api/tours/content/<tour_uuid>/<ruta_relativa_al_html_de_entrada>
        """
        try:
            # Validar que el tour exista
            tour = Tour.objects.filter(tour_id=tour_uuid).first()
            if not tour:
                return Response({'detail': 'Tour no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            base_dir = os.path.join(settings.MEDIA_ROOT, 'tours', str(tour_uuid))
            # Normalizar separadores y prevenir traversal
            subpath = subpath.replace('..', '').lstrip('/').replace('\\', '/')
            try:
                full_path = safe_join(base_dir, subpath)
            except Exception:
                return Response({'detail': 'Ruta no permitida'}, status=status.HTTP_404_NOT_FOUND)

            if not os.path.isfile(full_path):
                return Response({'detail': 'Archivo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            # Detectar content-type
            ctype, _ = mimetypes.guess_type(full_path)
            # Evitar descarga de .php: no ejecutamos PHP, pero podemos servirlo como HTML estático
            if not ctype or os.path.splitext(full_path)[1].lower() == '.php':
                ctype = 'text/html'

            # Usar FileResponse para transmitir el archivo
            from django.http import FileResponse
            resp = FileResponse(open(full_path, 'rb'), content_type=ctype)
            # Sugerir nombre del archivo
            resp["Content-Disposition"] = f"inline; filename=\"{os.path.basename(full_path)}\""
            # Establecer una CSP permisiva SOLO para este contenido (no global)
            frame_ancestors = ' '.join(getattr(settings, 'CSP_FRAME_ANCESTORS', ("'self'",)))
            csp_value = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://player.vimeo.com; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob: https:; "
                "media-src 'self' data: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self' https://www.youtube.com https://player.vimeo.com; "
                f"frame-ancestors {frame_ancestors}; "
                "frame-src 'self' https://www.youtube.com https://player.vimeo.com; "
                "object-src 'none'"
            )
            resp['Content-Security-Policy'] = csp_value
            return resp
        except Exception as e:
            logger.error(f"Error sirviendo contenido de tour {tour_uuid}: {e}", exc_info=True)
            return Response({'detail': 'Error interno'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _select_tour_entry_file(self, tour_dir, entry_files):
        """
        Selecciona el archivo de entrada principal del tour usando lógica mejorada.

        Args:
            tour_dir: Directorio raíz del tour
            entry_files: Lista de tuplas (depth, rel_path) con archivos candidatos

        Returns:
            str: Ruta relativa del archivo de entrada seleccionado, o None si no se encuentra
        """
        if not entry_files:
            return None

        # Directorios a evitar (contienen archivos de configuración/plantillas)
        vendor_dirs = ('/bower_components/', '/node_modules/', '/vendor/', '/vendors/',
                      '/libs/', '/lib/', '/third_party/', '/third-party/', '/thirdparty/')
        plugin_dirs = ('/modules/', '/plugins/', '/themes/')

        def in_forbidden_dir(path_posix):
            """Verifica si el archivo está en un directorio prohibido"""
            norm = '/' + path_posix if not path_posix.startswith('/') else path_posix
            return any(forbidden in norm for forbidden in vendor_dirs + plugin_dirs)

        def analyze_file_content(file_path):
            """
            Analiza el contenido del archivo para determinar si es un visor válido.

            Returns:
                dict: Información sobre el tipo de archivo y su score
            """
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(100000)  # Leer hasta 100KB

                content_lower = content.lower()

                # Detectar diferentes tipos de tours
                is_lapentor = 'lapentor' in content_lower and 'ng-app' in content_lower
                is_pano2vr = 'pano2vr' in content_lower or 'pano2vr_player' in content_lower
                is_krpano = 'krpano' in content_lower or 'embedpano' in content_lower
                is_tour_viewer = any(keyword in content_lower for keyword in [
                    'tour.xml', 'panorama', '360', 'vr', 'viewer'
                ])

                # Penalizar archivos de configuración/plantillas
                is_config = any(keyword in content_lower for keyword in [
                    'config.html', 'template.html', 'tpl.html', 'readme'
                ]) or 'config' in file_path.lower()

                # Penalizar páginas de error
                is_error_page = any(keyword in content_lower for keyword in [
                    '404', 'not found', 'error', 'sorry', 'oops'
                ]) and len(content) < 2000  # Páginas de error suelen ser cortas

                return {
                    'is_lapentor': is_lapentor,
                    'is_pano2vr': is_pano2vr,
                    'is_krpano': is_krpano,
                    'is_tour_viewer': is_tour_viewer,
                    'is_config': is_config,
                    'is_error_page': is_error_page,
                    'has_body': '<body' in content_lower,
                    'has_scripts': '<script' in content_lower
                }
            except Exception:
                return {}

        def calculate_score(depth, rel_path, file_info):
            """Calcula el score de un archivo candidato"""
            low = rel_path.lower()
            name = os.path.basename(low)
            score = 0

            # === PUNTOS POSITIVOS ===

            # Archivos principales (máximo prioridad)
            if name in ('index.php', 'index.html', 'index.htm'):
                score += 200
            elif 'index' in name:
                score += 150

            # Nombres comunes de tours
            if name in ('tour.html', 'viewer.html', 'panorama.html', 'vr.html', 'main.html'):
                score += 120

            # Archivos específicos de sistemas de tour
            if file_info.get('is_lapentor') and name == 'index.php':
                score += 300  # Lapentor usa index.php como entrada principal
            if file_info.get('is_pano2vr'):
                score += 100
            if file_info.get('is_krpano'):
                score += 100

            # Contenido de tour válido
            if file_info.get('is_tour_viewer'):
                score += 80
            if file_info.get('has_body') and file_info.get('has_scripts'):
                score += 50

            # Directorios favorables
            if '/output/' in low or '/dist/' in low or '/build/' in low:
                score += 40

            # Archivos en raíz tienen bonus
            if depth == 0:
                score += 30

            # === PUNTOS NEGATIVOS ===

            # Archivos de error
            if file_info.get('is_error_page') or name in ('404.html', 'error.html', 'offline.html'):
                score -= 500

            # Archivos de configuración y plantillas
            if file_info.get('is_config') or name in ('config.html', 'readme.html', 'template.html'):
                score -= 400

            # Directorios prohibidos
            if in_forbidden_dir(rel_path):
                score -= 300

            # Archivos muy profundos
            if depth > 5:
                score -= 50

            # Penalizar PHP fuertemente (no ejecutable aquí)
            if name.endswith('.php'):
                score -= 250

            return score

        # Filtrar candidatos válidos
        candidates = []
        for depth, rel_path in entry_files:
            file_path = os.path.join(tour_dir, rel_path.replace('/', os.sep))
            file_info = analyze_file_content(file_path)
            score = calculate_score(depth, rel_path, file_info)

            # Solo incluir candidatos con score positivo
            if score > 0:
                candidates.append((score, depth, len(rel_path), rel_path))

        if not candidates:
            return None

        # Ordenar por score (descendente), luego por profundidad (ascendente), luego por longitud (ascendente)
        candidates.sort(key=lambda x: (-x[0], x[1], x[2]))

        best_candidate = candidates[0][3]
        # Evitar .php si existe alternativa HTML
        try:
            if best_candidate.lower().endswith('.php'):
                base_dir = os.path.dirname(best_candidate)
                # Buscar otro candidato .html en el mismo nivel
                for sc, d, ln, rp in candidates:
                    if d == candidates[0][1] and rp.lower().endswith(('.html', '.htm')) and os.path.dirname(rp) == base_dir:
                        best_candidate = rp
                        break
        except Exception:
            pass

        logger.info(f"Archivo de entrada seleccionado: {best_candidate} (score: {candidates[0][0]})")

        return best_candidate

    def _generate_pano2vr_wrapper(self, tour_dir):
        """
        Intenta generar un wrapper automático para tours Pano2VR.

        Args:
            tour_dir: Directorio del tour

        Returns:
            str: Nombre del archivo wrapper generado, o None si falla
        """
        try:
            # Buscar archivos necesarios de Pano2VR
            player_js_path = None
            pano_xml_path = None
            skin_js_path = None

            for root_dir, _dirs, files in os.walk(tour_dir):
                for fname in files:
                    low = fname.lower()
                    if low == 'pano2vr_player.js':
                        player_js_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir).replace('\\', '/')
                    elif low == 'pano.xml':
                        pano_xml_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir).replace('\\', '/')
                    elif low == 'skin.js':
                        skin_js_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir).replace('\\', '/')

            # Buscar three.js si existe
            three_js_path = None
            for root_dir, _dirs, files in os.walk(tour_dir):
                for fname in files:
                    low = fname.lower()
                    if low in ('three.min.js', 'three.js'):
                        three_js_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir).replace('\\', '/')
                        break
                if three_js_path:
                    break

            if player_js_path and pano_xml_path:
                wrapper_name = 'index_auto.html'
                wrapper_path = os.path.join(tour_dir, wrapper_name)

                skin_script = f'<script src="{skin_js_path}"></script>' if skin_js_path else ''
                three_script = f'<script src="{three_js_path}"></script>' if three_js_path else ''

                html = (
                    '<!DOCTYPE html>'
                    '<html lang="es">'
                    '<head>'
                    '<meta charset="utf-8" />'
                    '<meta name="viewport" content="width=device-width, initial-scale=1" />'
                    '<title>Tour 360°</title>'
                    f'{three_script}'
                    f'<script src="{player_js_path}"></script>'
                    f'{skin_script}'
                    '</head>'
                    '<body style="margin:0; padding:0; overflow:hidden; background:#000">'
                    '<div id="pano" style="width:100vw; height:100vh;"></div>'
                    '<script>'
                    '  try {'
                    '    var player = new pano2vrPlayer("pano");'
                    f'    player.readConfigUrlAsync("{pano_xml_path}");'
                    '  } catch (e) { console.error(e); }'
                    '</script>'
                    '</body>'
                    '</html>'
                )

                with open(wrapper_path, 'w', encoding='utf-8') as f:
                    f.write(html)

                logger.info(f"Wrapper Pano2VR generado automáticamente: {wrapper_name}")
                return wrapper_name
            else:
                logger.warning("No se encontraron archivos necesarios para generar wrapper Pano2VR")
                return None

        except Exception as e:
            logger.error(f"Error generando wrapper Pano2VR: {e}")
            return None

    @action(detail=False, methods=['get'], url_path='stats', permission_classes=[permissions.AllowAny])
    def get_stats(self, request):
        """Endpoint para obtener estadísticas de tours"""
        try:
            total_tours = Tour.objects.count()
            active_tours = Tour.objects.filter(url__isnull=False).exclude(url='').count()
            error_tours = Tour.objects.filter(url__isnull=True).count() + Tour.objects.filter(url='').count()
            
            # Calcular almacenamiento usado (estimación)
            import os
            tours_dir = os.path.join(settings.MEDIA_ROOT, 'tours')
            storage_used = 0
            
            if os.path.exists(tours_dir):
                for root, dirs, files in os.walk(tours_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            storage_used += os.path.getsize(file_path)
                        except (OSError, IOError):
                            pass
            
            # Convertir a MB
            storage_used_mb = storage_used / (1024 * 1024)
            
            return Response({
                'total_tours': total_tours,
                'active_tours': active_tours,
                'error_tours': error_tours,
                'storage_used': f"{storage_used_mb:.1f} MB",
                'storage_used_bytes': storage_used
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de tours: {e}", exc_info=True)
            return Response(
                {'error': 'Error obteniendo estadísticas'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ImageViewSet(viewsets.ModelViewSet):
    """Viewset para gestionar imágenes de propiedades"""
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    filter_backends = []
    ordering_fields = ['order']
    
    def get_queryset(self):
        queryset = Image.objects.all()
        # Accept both 'property' and 'property_id' query params for compatibility
        property_id = self.request.query_params.get('property') or self.request.query_params.get('property_id')
        if property_id:
            queryset = queryset.filter(property_id=property_id)
        return queryset.order_by('order')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

@method_decorator(csrf_exempt, name='dispatch')
class AISearchView(APIView):
    authentication_classes = [TokenAuthentication] # No usar SessionAuthentication aquí
    permission_classes = [permissions.AllowAny]
    DEBUG_MODE = getattr(settings, 'DEBUG', False)

    def _log_debug(self, message, data=None):
        if self.DEBUG_MODE:
            log_message = f"[AISearchView DEBUG] {message}"
            if data:
                log_message += f": {json.dumps(data, indent=2, ensure_ascii=False)[:500]}"
                if len(json.dumps(data)) > 500:
                    log_message += "..."
            logger.debug(log_message)

    def post(self, request, *args, **kwargs):
        try:
            # Accept both 'query' (new backend contract) and legacy 'current_query' from the frontend
            query = request.data.get('query') or request.data.get('current_query') or ''

            if not query:
                return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Optional conversation context provided by the frontend
            conversation_history = request.data.get('conversation_history', [])
            if isinstance(conversation_history, str):
                try:
                    conversation_history = json.loads(conversation_history)
                except json.JSONDecodeError:
                    conversation_history = []
            if not isinstance(conversation_history, list):
                conversation_history = []

            # Use the GeminiService to process the natural-language query and build the response
            gemini_service = GeminiService()
            ai_response = gemini_service.search_properties_with_ai(query, conversation_history)

            # The AI helper already returns the expected JSON structure for the frontend
            return Response(ai_response, status=status.HTTP_200_OK)
        except GeminiServiceError as e:
            # Fallback: si no hay API key o falla el proveedor, devolver recomendaciones básicas
            try:
                fallback = create_fallback_response_simple(query)
                return Response(fallback, status=status.HTTP_200_OK)
            except Exception:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f'Error in AISearchView: {str(e)}', exc_info=True)
            # Fallback genérico
            try:
                fallback = create_fallback_response_simple(request.data.get('query') or request.data.get('current_query') or '')
                return Response(fallback, status=status.HTTP_200_OK)
            except Exception:
                return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, *args, **kwargs):
        logger.debug("AISearchView GET reached; advise to use POST for AI search")
        return Response({"message": "Use POST for AI search. Include 'current_query' and 'conversation_history'."}, status=status.HTTP_200_OK)

class PropertyDocumentViewSet(viewsets.ModelViewSet):
    """Viewset to manage property documents (upload, list, delete)."""
    queryset = PropertyDocument.objects.all().order_by('-uploaded_at')
    serializer_class = PropertyDocumentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description']
    ordering_fields = ['uploaded_at']

    def get_permissions(self):
        """
        Allow read-only access to everyone for documents linked to approved properties.
        Write operations require authentication and ownership or staff status.
        """
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-staff users can only see documents of approved properties or their own properties
        if not self.request.user.is_staff:
            queryset = queryset.filter(
                Q(property__publication_status='approved') |
                Q(property__owner=self.request.user)
            )
        return queryset

    def perform_create(self, serializer):
        property_instance = serializer.validated_data.get('property')
        # Ensure user is owner or staff
        if not self.request.user.is_staff and property_instance.owner != self.request.user:
            raise PermissionDenied("No tiene permisos para añadir documentos a esta propiedad.")
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        if not self.request.user.is_staff and instance.property.owner != self.request.user:
            raise PermissionDenied("No tiene permisos para modificar este documento.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and instance.property.owner != self.request.user:
            raise PermissionDenied("No tiene permisos para eliminar este documento.")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def approve(self, request, pk=None):
        """Approve a document"""
        document = self.get_object()
        if document.status != 'pending':
            return Response({'detail': 'El documento ya fue revisado.'}, status=status.HTTP_400_BAD_REQUEST)
        document.status = 'approved'
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        # If all documents for property are approved, set property to approved
        if not document.property.documents.filter(status__in=['pending', 'rejected']).exists():
            document.property.publication_status = 'approved'
            document.property.save()
            send_property_status_email(document.property)

        return Response({'detail': 'Documento aprobado.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reject(self, request, pk=None):
        """Reject a document"""
        document = self.get_object()
        if document.status != 'pending':
            return Response({'detail': 'El documento ya fue revisado.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get('reason', '')
        document.status = 'rejected'
        document.description = f"{document.description}\nRECHAZADO: {reason}" if reason else document.description
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        # Mark property status as rejected (optional)
        document.property.publication_status = 'rejected'
        document.property.save()
        send_property_status_email(document.property)

        return Response({'detail': 'Documento rechazado.'}, status=status.HTTP_200_OK)


class ListingPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """Planes y entitlements disponibles para vendedores."""
    queryset = ListingPlan.objects.all().order_by('price', 'name')
    serializer_class = ListingPlanSerializer
    permission_classes = [permissions.AllowAny]


class PilotProfileViewSet(viewsets.ModelViewSet):
    """Gestión del perfil operativo de pilotos."""
    queryset = PilotProfile.objects.select_related('user').prefetch_related('documents')
    serializer_class = PilotProfileSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        if not user.is_authenticated:
            return qs.none()
        return qs.filter(user=user)

    def create(self, request, *args, **kwargs):
        profile, created = PilotProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=False, methods=['get', 'patch'], url_path='me', permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        profile, _ = PilotProfile.objects.get_or_create(user=request.user)
        if request.method.lower() == 'patch':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='availability', permission_classes=[permissions.IsAuthenticated])
    def set_availability(self, request):
        profile, _ = PilotProfile.objects.get_or_create(user=request.user)
        is_available = bool(request.data.get('is_available', True))
        profile.is_available = is_available
        profile.last_heartbeat_at = timezone.now()
        profile.save(update_fields=['is_available', 'last_heartbeat_at', 'updated_at'])
        return Response({'is_available': profile.is_available})

    @action(detail=False, methods=['post'], url_path='heartbeat', permission_classes=[permissions.IsAuthenticated])
    def heartbeat(self, request):
        profile, _ = PilotProfile.objects.get_or_create(user=request.user)
        profile.last_heartbeat_at = timezone.now()
        profile.location_latitude = request.data.get('latitude', profile.location_latitude)
        profile.location_longitude = request.data.get('longitude', profile.location_longitude)
        profile.save(update_fields=['last_heartbeat_at', 'location_latitude', 'location_longitude', 'updated_at'])
        return Response({'status': 'ok'})


class PilotDocumentViewSet(viewsets.ModelViewSet):
    """Carga y revisión de documentos de pilotos."""
    serializer_class = PilotDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PilotDocument.objects.select_related('pilot', 'pilot__user')

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        pilot_profile = getattr(user, 'pilot_profile', None)
        if not pilot_profile:
            return qs.none()
        return qs.filter(pilot=pilot_profile)

    def perform_create(self, serializer):
        pilot_profile = getattr(self.request.user, 'pilot_profile', None)
        if not pilot_profile:
            raise PermissionDenied('Solo operadores pueden subir documentos.')
        serializer.save(pilot=pilot_profile, status='pending', reviewed_by=None, reviewed_at=None)

    def perform_update(self, serializer):
        pilot_profile = getattr(self.request.user, 'pilot_profile', None)
        if not (self.request.user.is_staff or pilot_profile):
            raise PermissionDenied('No autorizado.')
        serializer.save(status='pending', reviewed_by=None, reviewed_at=None)


class JobViewSet(viewsets.ModelViewSet):
    """Gestión de trabajos operativos."""
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Job.objects.select_related(
        'property',
        'property__owner',
        'plan',
        'assigned_pilot',
        'assigned_pilot__user',
    ).prefetch_related(
        'offers',
        'offers__pilot',
        'offers__pilot__user',
        'timeline',
        'timeline__actor',
    )

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_status', 'invite_next_wave']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_staff:
            return qs
        pilot_profile = getattr(user, 'pilot_profile', None)
        if pilot_profile:
            return qs.filter(Q(assigned_pilot=pilot_profile) | Q(offers__pilot=pilot_profile)).distinct()
        return qs.filter(property__owner=user)

    @action(detail=False, methods=['get'], url_path='available', permission_classes=[permissions.IsAuthenticated])
    def available(self, request):
        pilot_profile = getattr(request.user, 'pilot_profile', None)
        if not pilot_profile:
            return Response([], status=status.HTTP_200_OK)
        qs = Job.objects.select_related(
            'property',
            'plan',
        ).prefetch_related(
            'offers',
            'offers__pilot',
        ).filter(
            offers__pilot=pilot_profile,
            offers__status='pending'
        ).distinct()
        job_list = list(qs)
        for job in job_list:
            job.expire_pending_offers(auto=True)
        serializer = self.get_serializer(job_list, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        job = self.get_object()
        job.expire_pending_offers(auto=True)
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='schedule', permission_classes=[permissions.IsAuthenticated])
    def schedule(self, request, pk=None):
        job = self.get_object()
        user = request.user
        pilot_profile = getattr(user, 'pilot_profile', None)
        is_owner = job.property.owner_id == user.id
        is_pilot = pilot_profile and job.assigned_pilot_id == pilot_profile.id
        if not (user.is_staff or is_owner or is_pilot):
            raise PermissionDenied('No autorizado para agendar este trabajo.')

        from django.utils.dateparse import parse_datetime

        start_raw = request.data.get('scheduled_start')
        end_raw = request.data.get('scheduled_end')
        if not start_raw or not end_raw:
            return Response({'error': 'scheduled_start y scheduled_end son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        start_dt = parse_datetime(start_raw)
        end_dt = parse_datetime(end_raw)
        if not start_dt or not end_dt:
            return Response({'error': 'Formato de fecha inválido. Use ISO8601.'}, status=status.HTTP_400_BAD_REQUEST)
        if end_dt <= start_dt:
            return Response({'error': 'La hora de término debe ser posterior al inicio.'}, status=status.HTTP_400_BAD_REQUEST)

        job.scheduled_start = start_dt
        job.scheduled_end = end_dt
        job.transition('scheduled', actor=user, message=request.data.get('message', 'Agenda confirmada'), metadata={'source': 'schedule_action'})
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-status', permission_classes=[permissions.IsAdminUser])
    def set_status(self, request, pk=None):
        job = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        message = request.data.get('message', '')
        metadata = request.data.get('metadata', {})
        try:
            job.transition(new_status, actor=request.user, message=message, metadata=metadata)
        except ValidationError as exc:
            return Response({'error': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start-flight', permission_classes=[permissions.IsAuthenticated])
    def start_flight(self, request, pk=None):
        job = self.get_object()
        user = request.user
        pilot_profile = getattr(user, 'pilot_profile', None)
        if not (user.is_staff or (pilot_profile and job.assigned_pilot_id == pilot_profile.id)):
            raise PermissionDenied('Solo el piloto asignado puede iniciar la grabación.')
        job.transition('shooting', actor=user, message=request.data.get('message', 'Vuelo iniciado'), metadata={'source': 'pilot_app'})
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='complete-flight', permission_classes=[permissions.IsAuthenticated])
    def complete_flight(self, request, pk=None):
        job = self.get_object()
        user = request.user
        pilot_profile = getattr(user, 'pilot_profile', None)
        if not (user.is_staff or (pilot_profile and job.assigned_pilot_id == pilot_profile.id)):
            raise PermissionDenied('Solo el piloto asignado puede finalizar la grabación.')
        job.transition('finished', actor=user, message=request.data.get('message', 'Grabación finalizada'), metadata={'source': 'pilot_app'})
        serializer = self.get_serializer(job)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='invite-next-wave', permission_classes=[permissions.IsAdminUser])
    def invite_next_wave(self, request, pk=None):
        job = self.get_object()
        next_wave = job.invite_wave + 1 if job.invite_wave else 1
        offers = job.send_invite_wave(wave=next_wave, actor=request.user)
        serializer = JobOfferSerializer(offers, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if offers else status.HTTP_200_OK)


class JobOfferViewSet(viewsets.ModelViewSet):
    """Invitaciones enviadas a operadores."""
    serializer_class = JobOfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobOffer.objects.select_related('job', 'job__property', 'pilot', 'pilot__user')

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        pilot_profile = getattr(user, 'pilot_profile', None)
        if not pilot_profile:
            return qs.none()
        return qs.filter(pilot=pilot_profile)

    @action(detail=True, methods=['post'], url_path='accept', permission_classes=[permissions.IsAuthenticated])
    def accept_offer(self, request, pk=None):
        offer = self.get_object()
        if not (request.user.is_staff or offer.pilot.user_id == request.user.id):
            raise PermissionDenied('No puedes aceptar esta invitación.')
        offer.accept(actor_user=request.user)
        serializer = self.get_serializer(offer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='decline', permission_classes=[permissions.IsAuthenticated])
    def decline_offer(self, request, pk=None):
        offer = self.get_object()
        if not (request.user.is_staff or offer.pilot.user_id == request.user.id):
            raise PermissionDenied('No puedes rechazar esta invitación.')
        offer.decline()
        serializer = self.get_serializer(offer)
        return Response(serializer.data)

class RecordingOrderViewSet(viewsets.ModelViewSet):
    """Gestiona las órdenes de grabación de tours 360."""
    queryset = RecordingOrder.objects.all().order_by('-updated_at')
    serializer_class = RecordingOrderSerializer
    filter_backends = []

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAdminUser]
        elif self.action in ['create', 'my_orders']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['set_status', 'assign']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = super().get_queryset()
        mine = self.request.query_params.get('mine')
        if mine in ('1', 'true', 'yes') and self.request.user.is_authenticated and not self.request.user.is_staff:
            qs = qs.filter(requested_by=self.request.user)
        return qs

    def perform_create(self, serializer):
        prop = serializer.validated_data.get('property')
        user = self.request.user
        if not user.is_staff and getattr(prop, 'owner_id', None) != user.id:
            raise PermissionDenied("Solo el propietario puede solicitar grabación para esta propiedad.")
        order = serializer.save(requested_by=user, status='created')
        try:
            send_recording_order_created_email(order)
        except Exception:
            logger.warning("Fallo al enviar email de creación de orden de grabación")

    @action(detail=False, methods=['get'], url_path='mine')
    def my_orders(self, request):
        qs = RecordingOrder.objects.filter(requested_by=request.user).order_by('-updated_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid = [c[0] for c in RecordingOrder.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'error': f'Estado inválido. Opciones: {", ".join(valid)}'}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        if 'notes' in request.data:
            order.notes = request.data.get('notes')
        if 'scheduled_date' in request.data:
            try:
                from django.utils.dateparse import parse_datetime
                order.scheduled_date = parse_datetime(request.data.get('scheduled_date'))
            except Exception:
                pass
        order.save()
        try:
            send_recording_order_status_email(order)
        except Exception:
            logger.warning("Fallo al enviar email de estado de orden de grabación")
        return Response(self.get_serializer(order).data)

class PropertyVisitViewSet(viewsets.ModelViewSet):
    queryset = PropertyVisit.objects.all().order_by('-visited_at')
    serializer_class = PropertyVisitSerializer
    http_method_names = ['post', 'head', 'options']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class ComparisonSessionViewSet(viewsets.ModelViewSet):
    """Permite crear y actualizar sesiones de comparación (máx 4 propiedades)."""
    queryset = ComparisonSession.objects.all().order_by('-updated_at')
    serializer_class = ComparisonSessionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'list', 'retrieve']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            session_key = self.request.session.session_key or self.request.session.save() or self.request.session.session_key
            serializer.save(session_key=session_key)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated:
            return qs.filter(user=self.request.user)
        else:
            session_key = self.request.session.session_key
            return qs.filter(session_key=session_key)

class SavedSearchViewSet(viewsets.ModelViewSet):
    queryset = SavedSearch.objects.all().order_by('-updated_at')
    serializer_class = SavedSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedSearch.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# -----------------------------
# Favorites ViewSet
# -----------------------------

class FavoriteViewSet(viewsets.ModelViewSet):
    """CRUD de favoritos. Lista solo favoritos del usuario autenticado."""
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Favorite.objects.filter(user=self.request.user)
            .select_related('property')
            .prefetch_related('property__images', 'property__tours')
            .order_by('-created_at')
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    http_method_names = ['get', 'post', 'delete']
