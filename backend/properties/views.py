from django.shortcuts import render
from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Exists, OuterRef
from rest_framework.views import APIView
from rest_framework import status
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
        serializer.save(owner=self.request.user)

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

            gemini_service = GeminiService()
            
            gemini_contents = []
            for msg in conversation_history:
                role = "user" if msg.get("role") == "user" else "model"
                gemini_contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
            
            if current_query: 
                 gemini_contents.append({"role": "user", "parts": [{"text": current_query}]})

            system_instruction_text = (
                "Eres Sky, un asistente virtual experto en la búsqueda y recomendación de terrenos rurales en Chile para el portal SkyTerra. "
                "Tu objetivo principal es ayudar al usuario a encontrar el terreno perfecto de forma amigable y conversacional. "
                "Interactúa con el usuario, haz preguntas para clarificar sus necesidades si es necesario, y ofrece sugerencias. "
                "Cuando identifiques criterios de búsqueda claros (tipos de propiedad, rango de precios, características como agua o vistas, ubicaciones), "
                "extráelos y proporciónalos en una estructura JSON específica. Además, proporciona una respuesta conversacional."
                "Tu respuesta DEBE ser un único bloque de texto JSON válido que contenga dos claves principales: 'assistant_message' y 'extracted_filters'. "
                "'assistant_message' debe ser tu respuesta textual y amigable para el usuario. "
                "'extracted_filters' debe ser un objeto JSON con los siguientes campos posibles: "
                "  'propertyTypes': (lista de strings, ej: [\"farm\", \"ranch\"]), "
                "  'priceRange': (lista de dos números [min, max] o [null, null] si no se especifica), "
                "  'features': (lista de strings, ej: [\"hasWater\", \"hasViews\"]), "
                "  'locations': (lista de strings con nombres de lugares). "
                "Si no se pueden extraer filtros, estos campos pueden ser listas vacías o priceRange puede ser [null, null]. "
                "Ejemplo de respuesta JSON completa que debes generar: "
                "```json\n"
                "{\n"
                "  \"assistant_message\": \"¡Hola! Busco terrenos con acceso a agua. ¿Tienes alguna preferencia de ubicación o tamaño?\",\n"
                "  \"extracted_filters\": {\n"
                "    \"propertyTypes\": [],\n"
                "    \"priceRange\": [null, null],\n"
                "    \"features\": [\"hasWater\"],\n"
                "    \"locations\": []\n"
                "  }\n"
                "}\n"
                "```\n"
                "Mantén la conversación fluida. Si el usuario solo saluda, saluda de vuelta y pregúntale cómo puedes ayudarle a encontrar un terreno."
                "Si la consulta es muy vaga, pide más detalles. No inventes filtros si no están implícitos en la conversación."
            )

            generation_config = {
                "temperature": 0.7, 
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json", 
            }
            safety_settings = [ 
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
            ]

            parsed_gemini_response, raw_gemini_text = gemini_service.generate_content(
                system_instruction_text, gemini_contents, generation_config, safety_settings
            )
            
            assistant_text_response = parsed_gemini_response.get("assistant_message", "No se pudo obtener una respuesta del asistente.")
            suggested_filters = parsed_gemini_response.get("extracted_filters", {})

            final_suggested_filters = {
                "propertyTypes": suggested_filters.get("propertyTypes", []),
                "priceRange": suggested_filters.get("priceRange", [None, None]),
                "features": suggested_filters.get("features", []),
                "locations": suggested_filters.get("locations", [])
            }
            if not isinstance(final_suggested_filters["priceRange"], list) or len(final_suggested_filters["priceRange"]) != 2:
                final_suggested_filters["priceRange"] = [None, None]

            logger.info(f"[AISearchView] Mensaje del Asistente: {assistant_text_response}")
            logger.info(f"[AISearchView] Filtros Sugeridos (final): {json.dumps(final_suggested_filters, ensure_ascii=False)}")
            
            properties_query = Property.objects.all()
            tour_exists_annotation = Tour.objects.filter(property=OuterRef('pk'))
            properties_query = properties_query.annotate(
                image_count_annotation=Count('images'),
                has_tour_annotation=Exists(tour_exists_annotation)
            )

            if final_suggested_filters.get('propertyTypes') and len(final_suggested_filters['propertyTypes']) > 0:
                properties_query = properties_query.filter(type__in=final_suggested_filters['propertyTypes'])
            
            if final_suggested_filters.get('priceRange'):
                min_price, max_price = final_suggested_filters['priceRange']
                if isinstance(min_price, (int, float)):
                    properties_query = properties_query.filter(price__gte=min_price)
                if isinstance(max_price, (int, float)):
                    properties_query = properties_query.filter(price__lte=max_price)
            
            if final_suggested_filters.get('features'):
                for feature in final_suggested_filters['features']:
                    if feature == 'hasWater':
                        properties_query = properties_query.filter(has_water=True)
                    elif feature == 'hasViews':
                        properties_query = properties_query.filter(has_views=True)
                    elif feature == 'has360Tour':
                        properties_query = properties_query.filter(has_tour_annotation=True)

            matching_properties_data = []
            property_count = 0
            try:
                matching_properties = properties_query.order_by('-created_at')[:5]
                property_count = matching_properties.count()
                serializer = PropertyListSerializer(matching_properties, many=True)
                matching_properties_data = serializer.data
                logger.info(f"[AISearchView] Se encontraron {property_count} propiedades que coinciden.")
            except Exception as e:
                logger.error(f"[AISearchView ERROR] Error al obtener o serializar propiedades: {str(e)}", exc_info=True)

            updated_history = list(conversation_history) 
            if current_query:
                 updated_history.append({"role": "user", "content": current_query})
            updated_history.append({"role": "assistant", "content": assistant_text_response})
            
            final_backend_response = {
                "assistant_message": assistant_text_response,
                "suggestedFilters": final_suggested_filters, 
                "recommendations": matching_properties_data,
                "conversation_history": updated_history 
            }

            if self.DEBUG_MODE:
                final_backend_response['_debug_backend'] = {
                    'raw_gemini_response_text': raw_gemini_text,
                    'parsed_gemini_response': parsed_gemini_response,
                    'matching_properties_count': property_count,
                }
            
            self._log_debug(f"Respuesta final al frontend:", final_backend_response)
            return Response(final_backend_response, status=status.HTTP_200_OK)

        except GeminiServiceError as e:
            logger.error(f"[AISearchView ERROR] GeminiServiceError: {e.message}", extra={'details': e.details, 'status_code': e.status_code})
            return Response({
                'error': e.message,
                'details': e.details if self.DEBUG_MODE else "Error details suppressed.",
                'status_code_from_service': e.status_code
            }, status=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except Exception as e:
            error_message = f"Error inesperado en AISearchView: {str(e)}"
            logger.error(error_message, exc_info=True)
            return Response({
                'error': 'Unexpected server error', 
                'details': error_message if self.DEBUG_MODE else "Contacte al administrador del sistema.",
                'traceback': traceback.format_exc() if self.DEBUG_MODE else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, *args, **kwargs):
        print("--- AISearchView GET method reached (use POST for AI search) ---")
        return Response({"message": "Use POST for AI search. Include 'current_query' and 'conversation_history'."}, status=status.HTTP_200_OK)
