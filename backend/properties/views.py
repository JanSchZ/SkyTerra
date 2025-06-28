from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status, serializers
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
from django.utils.decorators import method_decorator
import logging
import traceback
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
import os
import uuid
import zipfile
import shutil

from .models import Property, Tour, Image, PropertyDocument, PropertyVisit, ComparisonSession, SavedSearch, Favorite
from .serializers import (
    PropertySerializer, PropertyListSerializer,
    TourSerializer, ImageSerializer, PropertyDocumentSerializer, PropertyVisitSerializer,
    PropertyPreviewSerializer, ComparisonSessionSerializer, TourPackageCreateSerializer, SavedSearchSerializer, FavoriteSerializer
)
from skyterra_backend.permissions import IsOwnerOrAdmin
from .services import GeminiService, GeminiServiceError
from .email_service import send_property_status_email

# Create your views here.
logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 12 # Default page size
    page_size_query_param = 'page_size' # Allow client to override page_size
    max_page_size = 100 # Maximum page size

class PropertyPreviewViewSet(viewsets.ReadOnlyModelViewSet):
    """Vista read-only que expone detalles mínimos de propiedades para visitantes anónimos"""
    queryset = Property.objects.filter(publication_status='approved').order_by('-created_at')
    serializer_class = PropertyPreviewSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['price', 'size', 'has_water', 'has_views', 'listing_type']
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'size', 'created_at', 'plusvalia_score']
    permission_classes = [permissions.AllowAny]

class PropertyViewSet(viewsets.ModelViewSet):
    """Viewset para la gestión de propiedades inmobiliarias"""
    queryset = Property.objects.all().order_by('-created_at')
    serializer_class = PropertySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['price', 'size', 'has_water', 'has_views', 'listing_type', 'publication_status']
    # 'location_name' se eliminó porque no existe en el modelo
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
        # Los usuarios staff ven todas las propiedades, los demás solo las aprobadas. # Comentado para mostrar todas
        """
        queryset = super().get_queryset()
        
        # Annotations for N+1 optimization
        tour_exists = Tour.objects.filter(property=OuterRef('pk'))
        queryset = queryset.select_related('owner').prefetch_related('images').annotate(
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
            
            # Procesar documentos subidos (campo 'new_documents')
            new_docs = self.request.FILES.getlist('new_documents')
            if new_docs:
                for doc_file in new_docs:
                    PropertyDocument.objects.create(
                        property=property_instance,
                        file=doc_file,
                        doc_type='other'
                    )
                logger.info(f"{len(new_docs)} documento(s) asociados a la propiedad {property_instance.id}")
            
        except Exception as e:
            logger.error(f"Error al crear propiedad: {str(e)}", exc_info=True)
            # El error ya se maneja en el método create, aquí solo relanzamos para que create lo capture
            raise

    def perform_update(self, serializer):
        """Actualizar propiedad con validaciones adicionales"""
        try:
            instance = serializer.save()
            logger.info(f"Propiedad {instance.id} actualizada exitosamente. Nuevo estado: {instance.publication_status}")
            
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
    # Mostrar primero los tours más recientes.  Esto es útil porque el frontend
    # suele tomar el primer elemento para pre-visualización.
    queryset = Tour.objects.all().order_by('-created_at')
    serializer_class = TourSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['property', 'type']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return TourPackageCreateSerializer
        return TourSerializer

    def perform_create(self, serializer):
        package_file = serializer.validated_data.pop('package_file')
        
        # Validar extensión
        allowed_extensions = ['.zip', '.ggpkg']
        if not any(package_file.name.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(f"Tipo de archivo no permitido. Permitidos: {', '.join(allowed_extensions)}")

        tour_uuid = uuid.uuid4()
        tour_dir = os.path.join(settings.MEDIA_ROOT, 'tours', str(tour_uuid))
        os.makedirs(tour_dir, exist_ok=True)

        package_path = os.path.join(tour_dir, package_file.name)
        with open(package_path, 'wb+') as destination:
            for chunk in package_file.chunks():
                destination.write(chunk)

        try:
            if not zipfile.is_zipfile(package_path):
                raise serializers.ValidationError("El archivo no es un paquete ZIP (.zip o .ggpkg) válido.")

            with zipfile.ZipFile(package_path, 'r') as zip_ref:
                # Chequeo de seguridad básico contra path traversal
                for member in zip_ref.infolist():
                    if member.filename.startswith('/') or '..' in member.filename:
                        raise serializers.ValidationError(f"El paquete contiene una ruta de archivo insegura: {member.filename}")
                
                zip_ref.extractall(tour_dir)
            
            os.remove(package_path)

            # Buscar todos los archivos .html o .htm y elegir el que esté más cerca de la raíz
            html_files = []
            for root_dir, _dirs, files in os.walk(tour_dir):
                for fname in files:
                    if fname.lower().endswith(('.html', '.htm')):
                        rel_path = os.path.relpath(os.path.join(root_dir, fname), tour_dir)
                        rel_path_posix = rel_path.replace('\\', '/')  # Normalizar separadores
                        # Guardar también la "profundidad" para priorizar los más cercanos a la raíz
                        depth = rel_path_posix.count('/')
                        html_files.append((depth, rel_path_posix))

            if not html_files:
                raise serializers.ValidationError("No se encontró ningún archivo HTML dentro del paquete para usarlo como entrada.")

            # Elegir el archivo con menor profundidad (más cercano a la raíz). En caso de empate, el primero.
            html_entry = sorted(html_files, key=lambda t: t[0])[0][1]

            tour_url = f"{settings.MEDIA_URL}tours/{tour_uuid}/{html_entry}"
            
            instance = serializer.save(
                url=tour_url, 
                package_path=os.path.join('tours', str(tour_uuid)),
                type='package',
                tour_id=tour_uuid
            )
            logger.info(f"Paquete de tour {instance.id} creado y descomprimido en {tour_dir}")

            # Asegurar un solo tour por propiedad: eliminar cualquier otro (anteriores)
            Tour.objects.filter(property=instance.property).exclude(id=instance.id).delete()

        except Exception as e:
            if os.path.exists(tour_dir):
                shutil.rmtree(tour_dir)
            logger.error(f"Error procesando paquete de tour: {e}", exc_info=True)
            raise serializers.ValidationError(str(e))

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
            # Accept both 'query' (new backend contract) and legacy 'current_query' from the frontend
            query = request.data.get('query') or request.data.get('current_query') or ''

            if not query:
                return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Optional conversation context provided by the frontend
            conversation_history = request.data.get('conversation_history', [])

            # Use the GeminiService to process the natural-language query and build the response
            gemini_service = GeminiService()
            ai_response = gemini_service.search_properties_with_ai(query, conversation_history)

            # The AI helper already returns the expected JSON structure for the frontend
            return Response(ai_response, status=status.HTTP_200_OK)
        except GeminiServiceError as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f'Error in AISearchView: {str(e)}')
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request, *args, **kwargs):
        print("--- AISearchView GET method reached (use POST for AI search) ---")
        return Response({"message": "Use POST for AI search. Include 'current_query' and 'conversation_history'."}, status=status.HTTP_200_OK)

class PropertyDocumentViewSet(viewsets.ModelViewSet):
    """Viewset to manage property documents (upload, list, delete)."""
    queryset = PropertyDocument.objects.all().order_by('-uploaded_at')
    serializer_class = PropertyDocumentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property', 'doc_type', 'status']
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
        return Favorite.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    http_method_names = ['get', 'post', 'delete']
