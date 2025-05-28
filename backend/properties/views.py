from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Exists, OuterRef
from rest_framework.views import APIView
from django.conf import settings
import json
import datetime
import requests
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import traceback

from .models import Property, Tour, Image
from .serializers import (
    PropertySerializer, PropertyListSerializer,
    TourSerializer, ImageSerializer
)
from .services import GeminiService, GeminiServiceError

# Create your views here.
logger = logging.getLogger(__name__)

class PropertyViewSet(viewsets.ModelViewSet):
    """Viewset para la gestión de propiedades inmobiliarias"""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['price', 'size', 'has_water', 'has_views']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser] # Explicitly set parsers
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'my_properties':
            return PropertyListSerializer
        return PropertySerializer
    
    def get_queryset(self):
        """Permite filtrar propiedades por rango de precio y tamaño y anota conteos relacionados."""
        queryset = super().get_queryset()
        
        # Annotations for N+1 optimization
        tour_exists = Tour.objects.filter(property=OuterRef('pk'))
        queryset = queryset.annotate(
            image_count_annotation=Count('images'),
            has_tour_annotation=Exists(tour_exists)
        )
        
        # Filtros adicionales por rango
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        min_size = self.request.query_params.get('min_size')
        max_size = self.request.query_params.get('max_size')
        
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass
        if min_size:
            try:
                queryset = queryset.filter(size__gte=float(min_size))
            except ValueError:
                pass
        if max_size:
            try:
                queryset = queryset.filter(size__lte=float(max_size))
            except ValueError:
                pass
            
        return queryset

    def perform_create(self, serializer):
        """Crear propiedad asignando el owner al usuario autenticado"""
        try:
            # Asegurar que el usuario esté autenticado
            if not self.request.user.is_authenticated:
                logger.error("Intento de crear propiedad sin autenticación")
                raise PermissionError("Debe estar autenticado para crear propiedades")
            
            # Log de los datos recibidos para debugging
            logger.info(f"Creando propiedad para usuario: {self.request.user.username}")
            logger.info(f"Datos recibidos: {serializer.validated_data}")
            
            # Guardar con el owner
            property_instance = serializer.save(owner=self.request.user)
            logger.info(f"Propiedad creada exitosamente con ID: {property_instance.id}")
            
        except Exception as e:
            logger.error(f"Error al crear propiedad: {str(e)}", exc_info=True)
            raise

    def perform_update(self, serializer):
        """Actualizar propiedad con validaciones adicionales"""
        try:
            # Verificar que el usuario sea el owner de la propiedad
            instance = self.get_object()
            if instance.owner != self.request.user and not self.request.user.is_staff:
                logger.error(f"Usuario {self.request.user.username} intentó editar propiedad {instance.id} sin permisos")
                raise PermissionError("No tiene permisos para editar esta propiedad")
            
            logger.info(f"Actualizando propiedad ID: {instance.id}")
            logger.info(f"Datos recibidos: {serializer.validated_data}")
            
            serializer.save()
            logger.info(f"Propiedad {instance.id} actualizada exitosamente")
            
        except Exception as e:
            logger.error(f"Error al actualizar propiedad: {str(e)}", exc_info=True)
            raise

    def create(self, request, *args, **kwargs):
        """Override create para manejo personalizado de errores"""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error en create: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error al crear la propiedad', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        """Override update para manejo personalizado de errores"""
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error en update: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error al actualizar la propiedad', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path='my-properties', permission_classes=[permissions.IsAuthenticated])
    def my_properties(self, request):
        """Devuelve las propiedades del usuario autenticado."""
        tour_exists = Tour.objects.filter(property=OuterRef('pk'))
        user_properties = Property.objects.filter(owner=request.user).annotate(
            image_count_annotation=Count('images'),
            has_tour_annotation=Exists(tour_exists)
        ).order_by('-created_at')
        
        page = self.paginate_queryset(user_properties)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(user_properties, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class TourViewSet(viewsets.ModelViewSet):
    """Viewset para gestionar tours virtuales"""
    queryset = Tour.objects.all()
    serializer_class = TourSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['property', 'type']

class ImageViewSet(viewsets.ModelViewSet):
    """Viewset para gestionar imágenes de propiedades"""
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['property', 'type']
    ordering_fields = ['order']
    
    def get_queryset(self):
        queryset = Image.objects.all()
        property_id = self.request.query_params.get('property_id')
        
        if property_id:
            queryset = queryset.filter(property_id=property_id)
            
        return queryset.order_by('order')

@method_decorator(csrf_exempt, name='dispatch')
class AISearchView(APIView):
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
            current_query = request.data.get('query') 
            if current_query is None: 
                 current_query = request.data.get('current_query', '')
                 conversation_history = request.data.get('conversation_history', [])
            else: 
                 conversation_history = []

            if not current_query and not conversation_history: 
                return Response({'error': 'Current query or conversation history is missing.'}, status=status.HTTP_400_BAD_REQUEST)

            self._log_debug(f"Current Query: '{current_query}'")
            self._log_debug(f"Conversation History (entrada):", conversation_history)

            try:
                gemini_service = GeminiService()
                
                # Usar el nuevo método que integra propiedades reales
                ai_response = gemini_service.search_properties_with_ai(
                    user_query=current_query,
                    conversation_history=conversation_history
                )
                
                self._log_debug("Respuesta de IA procesada:", ai_response)
                
                # Verificar si es una respuesta válida
                if ai_response and isinstance(ai_response, dict):
                    # Asegurar que tenemos los campos necesarios
                    response_data = {
                        'assistant_message': ai_response.get('assistant_message', 'Búsqueda procesada'),
                        'suggestedFilters': ai_response.get('suggestedFilters', {
                            'propertyTypes': [],
                            'priceRange': [None, None],
                            'features': [],
                            'sizeRange': [None, None]
                        }),
                        'recommendations': ai_response.get('recommendations', []),
                        'interpretation': ai_response.get('interpretation', current_query),
                        'fallback': ai_response.get('fallback', False)
                    }
                    
                    # Agregar información adicional si es respuesta de fallback
                    if ai_response.get('fallback'):
                        response_data['assistant_message'] += " (Usando búsqueda básica)"
                    
                    self._log_debug("Respuesta final enviada:", response_data)
                    return Response(response_data, status=status.HTTP_200_OK)
                
                else:
                    # Si no hay respuesta válida, crear una respuesta básica
                    fallback_response = {
                        'assistant_message': 'No se pudo procesar tu búsqueda en este momento.',
                        'suggestedFilters': {
                            'propertyTypes': [],
                            'priceRange': [None, None],
                            'features': [],
                            'sizeRange': [None, None]
                        },
                        'recommendations': [],
                        'interpretation': current_query,
                        'error': 'Servicio temporalmente no disponible'
                    }
                    
                    return Response(fallback_response, status=status.HTTP_200_OK)
                
            except GeminiServiceError as e:
                logger.error(f"Error específico de GeminiService: {e}")
                
                # Crear respuesta de error más informativa
                error_response = {
                    'assistant_message': f'Error en el servicio de IA: {str(e)}',
                    'suggestedFilters': {
                        'propertyTypes': [],
                        'priceRange': [None, None],
                        'features': [],
                        'sizeRange': [None, None]
                    },
                    'recommendations': [],
                    'interpretation': current_query,
                    'error': str(e),
                    'suggestions': 'Verifique la configuración de la API de Gemini o intente más tarde.'
                }
                
                return Response(error_response, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Error inesperado en AISearchView: {e}", exc_info=True)
                
                # Respuesta de error genérico
                error_response = {
                    'assistant_message': 'Error interno del servidor. Intente nuevamente.',
                    'suggestedFilters': {
                        'propertyTypes': [],
                        'priceRange': [None, None],
                        'features': [],
                        'sizeRange': [None, None]
                    },
                    'recommendations': [],
                    'interpretation': current_query,
                    'error': 'Error interno del servidor'
                }
                
                return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error crítico en AISearchView: {e}", exc_info=True)
            return Response({
                'error': 'Error crítico del servidor',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, *args, **kwargs):
        print("--- AISearchView GET method reached (use POST for AI search) ---")
        return Response({"message": "Use POST for AI search. Include 'current_query' and 'conversation_history'."}, status=status.HTTP_200_OK)
