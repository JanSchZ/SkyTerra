from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Exists, OuterRef
from rest_framework.views import APIView
from django.conf import settings
from django.core.mail import send_mail
import json
import datetime
import requests
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import traceback
from rest_framework.pagination import PageNumberPagination

from .models import Property, Tour, Image
from .serializers import (
    PropertySerializer, PropertyListSerializer,
    TourSerializer, ImageSerializer, AdminTourPackageCreateSerializer
)
from .services import GeminiService, GeminiServiceError
from .email_service import EmailService
import os
import zipfile
import shutil
import uuid # Already imported in models.py, but good to have here if used directly

# Create your views here.
logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12 # Default page size
    page_size_query_param = 'page_size' # Allow client to override page_size
    max_page_size = 100 # Maximum page size

class PropertyViewSet(viewsets.ModelViewSet):
    """Viewset para la gestión de propiedades inmobiliarias"""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['price', 'size', 'has_water', 'has_views']
    # 'location_name' se eliminó porque no existe en el modelo
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at', 'publication_status']
    # permission_classes = [permissions.IsAuthenticatedOrReadOnly] # Example, adjust as needed

    def get_permissions(self):
        """
        Permite lectura (list, retrieve) a cualquiera.
        Requiere autenticación para otras acciones (create, update, delete, my_properties).
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'my_properties':
            return PropertyListSerializer
        return PropertySerializer
    
    def get_queryset(self):
        """
        Permite filtrar propiedades por rango de precio y tamaño y anota conteos relacionados.
        # Los usuarios staff ven todas las propiedades, los demás solo las aprobadas. # Comentado para mostrar todas
        """
        queryset = super().get_queryset()
        
        # Annotations for N+1 optimization
        tour_exists = Tour.objects.filter(property=OuterRef('pk'))
        queryset = queryset.annotate(
            image_count_annotation=Count('images'),
            has_tour_annotation=Exists(tour_exists)
        )
        
        # Filter by publication_status for non-staff users # Comentado para mostrar todas
        # if not self.request.user.is_staff:
        #     queryset = queryset.filter(publication_status='approved')

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
        """Crear propiedad asignando el owner al usuario autenticado y enviar email de notificación."""
        try:
            if not self.request.user.is_authenticated:
                logger.error("Intento de crear propiedad sin autenticación")
                # This should ideally be caught by permission_classes, but as a safeguard:
                return Response({"detail": "Debe estar autenticado para crear propiedades."}, status=status.HTTP_401_UNAUTHORIZED)

            logger.info(f"Creando propiedad para usuario: {self.request.user.username}")
            logger.info(f"Datos recibidos: {serializer.validated_data}")
            
            property_instance = serializer.save(owner=self.request.user, publication_status='pending')
            logger.info(f"Propiedad creada exitosamente con ID: {property_instance.id}, Estado: {property_instance.publication_status}")            # Enviar email de notificación si la propiedad está pendiente de revisión
            if property_instance.publication_status == 'pending':
                try:
                    from .email_service import EmailService
                    email_sent = EmailService.send_property_submitted_notification(property_instance)
                    if email_sent:
                        logger.info(f"Email de notificación enviado exitosamente para propiedad ID: {property_instance.id}")
                    else:
                        logger.warning(f"No se pudo enviar email de notificación para propiedad ID: {property_instance.id}")
                except Exception as email_error:
                    logger.error(f"Error al enviar email de notificación para propiedad ID: {property_instance.id}: {str(email_error)}", exc_info=True)
                    # No relanzar el error para no impedir la creación de la propiedad, solo loggearlo.
            
        except Exception as e:
            logger.error(f"Error al crear propiedad: {str(e)}", exc_info=True)
            # El error ya se maneja en el método create, aquí solo relanzamos para que create lo capture
            raise

    def perform_update(self, serializer):
        """Actualizar propiedad con validaciones adicionales"""
        try:
            instance = self.get_object() # instance is retrieved first

            # Permission check: User must be owner or staff
            if instance.owner != self.request.user and not self.request.user.is_staff:
                logger.error(f"Usuario {self.request.user.username} intentó editar propiedad {instance.id} sin permisos.")
                # This should ideally be caught by permission_classes in the viewset or object-level permissions.
                # Raising PermissionError here will lead to a 500 error if not handled by DRF's exception handler.
                # A more DRF-idiomatic way is to rely on `self.check_object_permissions(self.request, instance)`
                # or let the main `update` method's permission checks handle it.
                # However, for this specific instruction, we ensure the logic is within perform_update.
                # To be safe and explicit, we can return a Response for clarity, though this might duplicate view-level checks.
                # For now, let's stick to the plan of modifying validated_data.
                # The original code had `raise PermissionError`, which is fine if DRF handles it.
                # The `update` method already has a permission check, so this one is an additional safeguard.
                raise PermissionError("No tiene permisos para editar esta propiedad.")

            logger.info(f"Actualizando propiedad ID: {instance.id} por usuario {self.request.user.username}")
            logger.info(f"Datos recibidos para actualización: {serializer.validated_data}")

            # Prevent non-staff users from changing publication_status
            if not self.request.user.is_staff:
                if 'publication_status' in serializer.validated_data:
                    # Log the attempt and remove the field
                    original_status_attempt = serializer.validated_data['publication_status']
                    logger.warning(
                        f"Usuario no administrador {self.request.user.username} "
                        f"intentó cambiar publication_status a '{original_status_attempt}' "
                        f"para la propiedad ID {instance.id}. Este cambio será ignorado."
                    )
                    del serializer.validated_data['publication_status']

                # Additionally, if the property was already approved, a non-staff owner should not be able to change it back to pending.
                # Or, if any change is made by a non-staff owner to an approved property, it should perhaps revert to 'pending'.
                # The current issue description implies admins approve publications.
                # If a user edits an *already approved* property, should it become pending again?
                # For now, the scope is to prevent users from *setting* the status.
                # Let's assume that if an admin approved it, user edits on other fields are fine without changing status,
                # unless specified otherwise.

            serializer.save()
            logger.info(f"Propiedad {instance.id} actualizada exitosamente. Nuevo estado: {instance.publication_status}")
            
        except PermissionError as pe: # Catch the specific error
            # This is to make sure PermissionError is handled gracefully if not caught by DRF default handlers
            # However, DRF's default exception handling should convert PermissionDenied to 403.
            # Re-raising here to let DRF handle it.
            raise pe
        except Exception as e:
            logger.error(f"Error al actualizar propiedad {instance.id}: {str(e)}", exc_info=True)
            # Re-raise to be handled by the main update method or DRF's exception handler
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
            # Validar permisos antes de llamar a super().update
            instance = self.get_object()
            if instance.owner != self.request.user and not self.request.user.is_staff:
                logger.warning(f"Permiso denegado: Usuario {request.user} intentando actualizar propiedad {instance.id} de {instance.owner}")
                return Response({"detail": "No tiene permisos para editar esta propiedad."}, status=status.HTTP_403_FORBIDDEN)
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
            logger.info(f"Usuario {request.user.username} actualizó estado de propiedad ID {property_instance.id} a {new_status}")
            serializer = self.get_serializer(property_instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error al actualizar estado de propiedad ID {property_instance.id}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Error interno al actualizar el estado.', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TourViewSet(viewsets.ModelViewSet):
    """Viewset para gestionar tours virtuales"""
    queryset = Tour.objects.all()
    serializer_class = TourSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['property', 'type']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

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

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

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
                    # Construir la respuesta base, priorizando los datos de ai_response
                    response_data = {
                        'search_mode': ai_response.get('search_mode', 'property_recommendation'), # Default si no viene
                        'assistant_message': ai_response.get('assistant_message', 'Búsqueda procesada.'),
                        'flyToLocation': ai_response.get('flyToLocation', None), # Incluir flyToLocation
                        'suggestedFilters': ai_response.get('suggestedFilters'), # Puede ser None si es modo location
                        'recommendations': ai_response.get('recommendations', []),
                        'interpretation': ai_response.get('interpretation', current_query),
                        'fallback': ai_response.get('fallback', False)
                    }

                    # Si suggestedFilters es None (ej. en modo 'location'), inicializarlo a un dict vacío para consistencia
                    if response_data['suggestedFilters'] is None:
                        response_data['suggestedFilters'] = {
                            'propertyTypes': [],
                            'priceRange': [None, None],
                            'features': [],
                            'sizeRange': [None, None]
                        }
                    
                    # Agregar información adicional si es respuesta de fallback
                    if response_data.get('fallback'):
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
                    'error': 'Error interno del servidor'                }
                
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


# ============================================================================
# ADMIN WORKFLOW VIEWS - Sistema de Aprobación de Propiedades
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_pending_properties(request):
    """Lista todas las propiedades pendientes de aprobación"""
    try:
        pending_properties = Property.objects.filter(
            publication_status='pending'
        ).order_by('-created_at')
        
        serializer = PropertyListSerializer(pending_properties, many=True)
        
        return Response({
            'count': pending_properties.count(),
            'properties': serializer.data
        })
    except Exception as e:
        logger.error(f"Error obteniendo propiedades pendientes: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminTourPackageViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    queryset = Tour.objects.all().order_by('-created_at') # using created_at as per model

    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update': # update also uses create serializer for file upload
            return AdminTourPackageCreateSerializer
        return TourSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        property_instance = validated_data.get('property')
        tour_zip_file = validated_data.get('tour_zip')
        provided_tour_id = validated_data.get('tour_id') # Optional from serializer
        tour_name = validated_data.get('name')
        tour_description = validated_data.get('description')

        if not tour_zip_file:
            return Response({'error': 'Tour ZIP file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not tour_zip_file.name.endswith('.zip'):
            return Response({'error': 'Invalid file type. Only ZIP files are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate tour_id if not provided or if it's an empty string
        generated_tour_id_str = str(provided_tour_id) if provided_tour_id else uuid.uuid4().hex

        # Ensure property_instance is not None (it should be handled by serializer's validation if field is required)
        if not property_instance:
             return Response({'error': 'Property not found or not provided.'}, status=status.HTTP_400_BAD_REQUEST)


        # Define paths
        # property_id_str = str(property_instance.id)
        # Using property_instance.pk which is the primary key value
        base_tour_path = os.path.join('tours', str(property_instance.pk), generated_tour_id_str)
        tour_extract_full_path = os.path.join(settings.MEDIA_ROOT, base_tour_path)

        # Create directory
        os.makedirs(tour_extract_full_path, exist_ok=True)

        temp_zip_path = os.path.join(tour_extract_full_path, tour_zip_file.name)

        try:
            # Save uploaded zip file temporarily
            with open(temp_zip_path, 'wb+') as temp_zip:
                for chunk in tour_zip_file.chunks():
                    temp_zip.write(chunk)

            # Extract zip file
            with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                zip_ref.extractall(tour_extract_full_path)

            # Clean up the temporary zip file
            os.remove(temp_zip_path)

            # Find main HTML file (simple check for index.html or tour.html)
            # This logic might need to be more robust (e.g., user specifies main file, or parse a manifest)
            main_html_file = None
            possible_main_files = ['index.html', 'tour.html'] # Add more common names if needed

            # Check in root of extracted tour
            for pf in possible_main_files:
                if os.path.exists(os.path.join(tour_extract_full_path, pf)):
                    main_html_file = pf
                    break

            # If not in root, check one level deeper (common for packages like Pano2VR)
            if not main_html_file:
                for root, dirs, files in os.walk(tour_extract_full_path):
                    if main_html_file: break
                    # Limit depth to one level from tour_extract_full_path
                    if root == tour_extract_full_path or os.path.dirname(root) == tour_extract_full_path:
                        for pf in possible_main_files:
                            if pf in files:
                                # Check if this file is in a subdirectory relative to tour_extract_full_path
                                relative_dir = os.path.relpath(root, tour_extract_full_path)
                                if relative_dir == '.': # root itself
                                     main_html_file = pf
                                else:
                                     main_html_file = os.path.join(relative_dir, pf)
                                break
                    # Prune exploration beyond one level deep from the initial extraction path
                    if os.path.dirname(root) != tour_extract_full_path and root != tour_extract_full_path :
                        dirs[:] = [] # Stop descending further from this path


            if not main_html_file:
                shutil.rmtree(tour_extract_full_path) # Clean up if main file not found
                return Response({'error': f'Main HTML file (e.g., index.html, tour.html) not found in ZIP.'}, status=status.HTTP_400_BAD_REQUEST)

            package_path_for_model = os.path.join(base_tour_path, main_html_file).replace('\\', '/')

            # Construct URL using MEDIA_URL
            # Ensure no leading slash if MEDIA_URL already ends with one
            if settings.MEDIA_URL.endswith('/'):
                full_url_for_access = request.build_absolute_uri(f"{settings.MEDIA_URL}{package_path_for_model}")
            else:
                full_url_for_access = request.build_absolute_uri(f"{settings.MEDIA_URL}/{package_path_for_model}")


            # Create Tour object
            tour_data_for_creation = {
                'property': property_instance.pk,
                'tour_id': generated_tour_id_str,
                'package_path': package_path_for_model,
                'url': full_url_for_access,
                'type': 'package',
                'name': tour_name if tour_name else f"Tour for {property_instance.name}",
                'description': tour_description
            }

            # Use TourSerializer for creating the instance, as AdminTourPackageCreateSerializer has 'tour_zip'
            # which is not a model field.
            # We need to ensure all required fields for Tour model are present.
            # The AdminTourPackageCreateSerializer is for input validation and file handling.
            # For saving, we map to model fields.

            # Check if a tour with this tour_id already exists for this property
            existing_tour = Tour.objects.filter(property=property_instance, tour_id=generated_tour_id_str).first()
            if existing_tour:
                # This is an update scenario for the files, but the request was a POST (create)
                # For simplicity, let's reject if tour_id is provided and already exists on a POST.
                # Proper update logic should be in PUT/PATCH.
                if provided_tour_id: # If admin specified an ID that already exists
                     shutil.rmtree(tour_extract_full_path) # Clean up newly extracted files
                     return Response({'error': f'A tour with the specified tour_id {provided_tour_id} already exists for this property. Use update (PUT/PATCH) to modify.'}, status=status.HTTP_409_CONFLICT)
                # If tour_id was generated and somehow clashed (highly unlikely with UUID4 hex)
                # Or if no tour_id was provided, but we generated one that clashed (even more unlikely)
                # Fallback: just in case, clean up and error
                shutil.rmtree(tour_extract_full_path)
                return Response({'error': 'Tour ID conflict or error generating unique ID.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            tour_instance = Tour.objects.create(
                property=property_instance,
                tour_id=generated_tour_id_str,
                package_path=package_path_for_model,
                url=full_url_for_access,
                type='package',
                name=tour_name if tour_name else f"Tour for {property_instance.name}",
                description=tour_description
            )

            output_serializer = TourSerializer(tour_instance, context={'request': request})
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except zipfile.BadZipFile:
            shutil.rmtree(tour_extract_full_path, ignore_errors=True)
            return Response({'error': 'Invalid ZIP file.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            shutil.rmtree(tour_extract_full_path, ignore_errors=True)
            logger.error(f"Error creating tour package: {str(e)}", exc_info=True)
            return Response({'error': f'Failed to create tour package: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.pop('partial', False))
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        tour_zip_file = validated_data.get('tour_zip')

        if tour_zip_file: # If a new zip file is uploaded
            # Delete old package files
            if instance.package_path:
                old_package_base_dir = os.path.dirname(os.path.join(settings.MEDIA_ROOT, instance.package_path))
                if os.path.exists(old_package_base_dir) and old_package_base_dir != settings.MEDIA_ROOT : # safety check
                    shutil.rmtree(old_package_base_dir, ignore_errors=True)

            # Process the new zip file (similar to create logic)
            property_instance = instance.property
            # tour_id remains the same for update
            tour_id_str = str(instance.tour_id)

            base_tour_path = os.path.join('tours', str(property_instance.pk), tour_id_str)
            tour_extract_full_path = os.path.join(settings.MEDIA_ROOT, base_tour_path)
            os.makedirs(tour_extract_full_path, exist_ok=True)
            temp_zip_path = os.path.join(tour_extract_full_path, tour_zip_file.name)

            try:
                with open(temp_zip_path, 'wb+') as temp_zip:
                    for chunk in tour_zip_file.chunks():
                        temp_zip.write(chunk)
                with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
                    zip_ref.extractall(tour_extract_full_path)
                os.remove(temp_zip_path)

                main_html_file = None
                possible_main_files = ['index.html', 'tour.html']
                for pf in possible_main_files:
                    if os.path.exists(os.path.join(tour_extract_full_path, pf)):
                        main_html_file = pf
                        break
                if not main_html_file: # Check one level deeper
                    for root, dirs, files in os.walk(tour_extract_full_path):
                        if main_html_file: break
                        if root == tour_extract_full_path or os.path.dirname(root) == tour_extract_full_path:
                            for pf in possible_main_files:
                                if pf in files:
                                    relative_dir = os.path.relpath(root, tour_extract_full_path)
                                    main_html_file = os.path.join(relative_dir, pf) if relative_dir != '.' else pf
                                    break
                        if os.path.dirname(root) != tour_extract_full_path and root != tour_extract_full_path :
                            dirs[:] = []


                if not main_html_file:
                    # Don't delete the new files yet, the old tour is still technically active
                    return Response({'error': 'Main HTML file (e.g., index.html, tour.html) not found in new ZIP.'}, status=status.HTTP_400_BAD_REQUEST)

                instance.package_path = os.path.join(base_tour_path, main_html_file).replace('\\','/')

                if settings.MEDIA_URL.endswith('/'):
                     instance.url = request.build_absolute_uri(f"{settings.MEDIA_URL}{instance.package_path}")
                else:
                     instance.url = request.build_absolute_uri(f"{settings.MEDIA_URL}/{instance.package_path}")
                instance.type = 'package' # Ensure type is package

            except zipfile.BadZipFile:
                return Response({'error': 'Invalid new ZIP file.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error updating tour package files: {str(e)}", exc_info=True)
                return Response({'error': f'Failed to update tour package files: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save other potentially updated fields like name, description
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        # tour_id cannot be changed on update via this mechanism, property also cannot be changed.
        instance.save()

        output_serializer = TourSerializer(instance, context={'request': request})
        return Response(output_serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.package_path:
            # Derive the base directory of the tour package from its package_path
            # e.g. if package_path is 'tours/prop_id/tour_id/index.html', base is 'tours/prop_id/tour_id'
            package_full_path = os.path.join(settings.MEDIA_ROOT, instance.package_path)
            package_base_dir = os.path.dirname(package_full_path) # Gets 'tours/prop_id/tour_id/

            # A more robust way if main_html_file is nested:
            # Path(instance.package_path).parts will give ('tours', 'prop_id', 'tour_id', ..., 'index.html')
            # We want to delete the 'tour_id' directory.
            # Example: package_path = 'tours/1/abc123def/data/index.html'
            # We need to delete 'MEDIA_ROOT/tours/1/abc123def'

            # Assuming package_path starts with 'tours/<property_pk>/<tour_id_str>/...'
            path_parts = instance.package_path.replace('\\', '/').split('/')
            if len(path_parts) >= 3 and path_parts[0] == 'tours':
                # Construct path to 'tours/property_pk/tour_id_str' directory
                tour_dir_to_delete = os.path.join(settings.MEDIA_ROOT, path_parts[0], path_parts[1], path_parts[2])
                if os.path.exists(tour_dir_to_delete) and tour_dir_to_delete.startswith(os.path.join(settings.MEDIA_ROOT, 'tours')): # Safety check
                    shutil.rmtree(tour_dir_to_delete, ignore_errors=True)
                    logger.info(f"Deleted tour package directory: {tour_dir_to_delete}")
                else:
                    logger.warning(f"Tour package directory not found or path is suspicious, not deleting: {tour_dir_to_delete}")
            else:
                logger.warning(f"Tour package_path format unexpected, cannot reliably delete directory: {instance.package_path}")

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_approve_property(request, property_id):
    """Aprueba una propiedad y envía notificación al propietario"""
    try:
        property_obj = Property.objects.get(id=property_id)
        
        if property_obj.publication_status != 'pending':
            return Response({
                'error': 'Esta propiedad ya ha sido procesada'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Aprobar la propiedad
        property_obj.publication_status = 'approved'
        property_obj.save()
        
        # Enviar notificación por email
        email_sent = EmailService.send_property_approval_notification(
            property_obj, approved=True
        )
        
        return Response({
            'message': 'Propiedad aprobada exitosamente',
            'property_id': property_id,
            'email_sent': email_sent
        })
        
    except Property.DoesNotExist:
        return Response({
            'error': 'Propiedad no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error aprobando propiedad {property_id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_reject_property(request, property_id):
    """Rechaza una propiedad y envía notificación al propietario"""
    try:
        property_obj = Property.objects.get(id=property_id)
        
        if property_obj.publication_status != 'pending':
            return Response({
                'error': 'Esta propiedad ya ha sido procesada'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Rechazar la propiedad
        property_obj.publication_status = 'rejected'
        property_obj.save()
        
        # Enviar notificación por email
        email_sent = EmailService.send_property_approval_notification(
            property_obj, approved=False
        )
        
        return Response({
            'message': 'Propiedad rechazada',
            'property_id': property_id,
            'email_sent': email_sent
        })
        
    except Property.DoesNotExist:
        return Response({
            'error': 'Propiedad no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error rechazando propiedad {property_id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_add_tour(request, property_id):
    """Añade un tour virtual a una propiedad"""
    try:
        property_obj = Property.objects.get(id=property_id)
        
        tour_url = request.data.get('url')
        tour_type = request.data.get('type', '360')
        
        if not tour_url:
            return Response({
                'error': 'URL del tour es requerida'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear el tour
        tour = Tour.objects.create(
            property=property_obj,
            url=tour_url,
            type=tour_type
        )
        
        serializer = TourSerializer(tour)
        
        return Response({
            'message': 'Tour añadido exitosamente',
            'tour': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Property.DoesNotExist:
        return Response({
            'error': 'Propiedad no encontrada'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error añadiendo tour a propiedad {property_id}: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_dashboard_stats(request):
    """Estadísticas para el dashboard de administración"""
    try:
        stats = {
            'pending_properties': Property.objects.filter(publication_status='pending').count(),
            'approved_properties': Property.objects.filter(publication_status='approved').count(),
            'rejected_properties': Property.objects.filter(publication_status='rejected').count(),
            'total_properties': Property.objects.count(),
            'properties_with_tours': Property.objects.filter(tours__isnull=False).distinct().count(),
        }
        
        return Response(stats)
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas del dashboard: {str(e)}")
        return Response({
            'error': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
