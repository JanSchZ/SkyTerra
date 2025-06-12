from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
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
    TourSerializer, ImageSerializer
)
from .services import GeminiService, GeminiServiceError

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
    filterset_fields = ['price', 'size', 'has_water', 'has_views', 'listing_type']
    # 'location_name' se eliminó porque no existe en el modelo
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at']

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
            logger.info(f"Propiedad creada exitosamente con ID: {property_instance.id}, Estado: {property_instance.publication_status}")

            # Enviar email de notificación si la propiedad está pendiente de revisión
            if property_instance.publication_status == 'pending':
                try:
                    subject = f"Nueva Propiedad Enviada para Revisión: {property_instance.name}"
                    message_body = f"""
                    Una nueva propiedad ha sido enviada para revisión:

                    Nombre: {property_instance.name}
                    Tipo: {property_instance.get_type_display()}
                    Precio: {property_instance.price}
                    Tamaño: {property_instance.size} ha
                    Enviada por: {self.request.user.username} (ID: {self.request.user.id})
                    
                    ID de Propiedad: {property_instance.id}

                    Por favor, revísala en el panel de administración. 
                    (Enlace al detalle en API: /api/properties/{property_instance.id}/ ) 
                    """
                    # Asegúrate que DEFAULT_FROM_EMAIL está configurado en settings.py
                    from_email = settings.DEFAULT_FROM_EMAIL
                    recipient_list = ['skyedits.cl@gmail.com'] 
                    
                    send_mail(subject, message_body, from_email, recipient_list, fail_silently=False)
                    logger.info(f"Email de notificación enviado a {recipient_list} para propiedad ID: {property_instance.id}")
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
            query = request.data.get('query', '')
            if not query:
                return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Use GeminiService for NLP processing
            gemini_service = GeminiService()
            interpreted_query = gemini_service.interpret_query(query)  # Assume this returns structured data like {'location': 'región de los lagos', 'features': ['borde de lago', 'sin vecinos cerca']}
            
            # Build dynamic queryset based on interpreted query
            queryset = Property.objects.all()
            if 'location' in interpreted_query:
                queryset = queryset.filter(description__icontains=interpreted_query['location'])  # Example filter
            if 'features' in interpreted_query:
                for feature in interpreted_query['features']:
                    queryset = queryset.filter(description__icontains=feature)
            
            # Order and limit to top 3
            top_properties = queryset.order_by('-price').distinct()[:3]  # Example ordering; adjust based on relevance
            serializer = PropertyListSerializer(top_properties, many=True)
            return Response({'top_options': serializer.data})
        except GeminiServiceError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f'Error in AISearchView: {str(e)}')
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, *args, **kwargs):
        print("--- AISearchView GET method reached (use POST for AI search) ---")
        return Response({"message": "Use POST for AI search. Include 'current_query' and 'conversation_history'."}, status=status.HTTP_200_OK)
