from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg, Q
from django.db import models
from django.utils import timezone
from datetime import timedelta
from .models import AIModel, AIUsageLog, SamConfiguration
from .serializers import AIModelSerializer, AIUsageLogSerializer, SamConfigurationSerializer

class AIModelViewSet(viewsets.ModelViewSet):
    queryset = AIModel.objects.all()
    serializer_class = AIModelSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def active_models(self, request):
        """Get only active models"""
        active_models = AIModel.objects.filter(is_active=True)
        serializer = self.get_serializer(active_models, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def populate_defaults(self, request):
        """Populate default Gemini models with correct configurations"""
        default_models = [
            {
                'name': 'gemini-2.0-flash',
                'api_name': 'gemini-2.0-flash',
                'price_per_1k_tokens_input': 0.0001,
                'price_per_1k_tokens_output': 0.0002,
                'system_prompt': 'Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces.',
                'max_tokens': 65536,
                'supports_thinking': False,
                'is_active': True
            },
            {
                'name': 'gemini-2.5-flash',
                'api_name': 'gemini-2.5-flash',
                'price_per_1k_tokens_input': 0.0001,
                'price_per_1k_tokens_output': 0.0002,
                'system_prompt': 'Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces.',
                'max_tokens': 65536,
                'supports_thinking': True,
                'is_active': True
            },
            {
                'name': 'gemini-2.5-pro',
                'api_name': 'gemini-2.5-pro',
                'price_per_1k_tokens_input': 0.0005,
                'price_per_1k_tokens_output': 0.001,
                'system_prompt': 'Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces.',
                'max_tokens': 65536,
                'supports_thinking': True,
                'is_active': True
            }
        ]
        
        created_models = []
        for model_data in default_models:
            model, created = AIModel.objects.get_or_create(
                name=model_data['name'],
                defaults=model_data
            )
            if created:
                created_models.append(model.name)
        
        return Response({
            'message': f'Created {len(created_models)} new models',
            'created_models': created_models
        })

class AIUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIUsageLog.objects.all()
    serializer_class = AIUsageLogSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def usage_stats(self, request):
        """Get usage statistics for the admin dashboard"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Total usage stats
        total_requests = AIUsageLog.objects.filter(timestamp__gte=start_date).count()
        total_tokens_input = AIUsageLog.objects.filter(timestamp__gte=start_date).aggregate(Sum('tokens_input'))['tokens_input__sum'] or 0
        total_tokens_output = AIUsageLog.objects.filter(timestamp__gte=start_date).aggregate(Sum('tokens_output'))['tokens_output__sum'] or 0
        total_cost = AIUsageLog.objects.filter(timestamp__gte=start_date).aggregate(Sum('cost'))['cost__sum'] or 0
        
        # Usage by model
        usage_by_model = AIUsageLog.objects.filter(timestamp__gte=start_date).values(
            'model_used__name'
        ).annotate(
            request_count=Count('id'),
            total_tokens_input=Sum('tokens_input'),
            total_tokens_output=Sum('tokens_output'),
            total_cost=Sum('cost'),
            avg_response_time=Avg('response_time_ms')
        ).order_by('-request_count')
        
        # Success rate
        success_rate = AIUsageLog.objects.filter(
            timestamp__gte=start_date
        ).aggregate(
            success_count=Count('id', filter=Q(success=True)),
            total_count=Count('id')
        )
        
        success_percentage = 0
        if success_rate['total_count'] > 0:
            success_percentage = (success_rate['success_count'] / success_rate['total_count']) * 100
        
        return Response({
            'total_requests': total_requests,
            'total_tokens_input': total_tokens_input,
            'total_tokens_output': total_tokens_output,
            'total_cost': float(total_cost),
            'usage_by_model': list(usage_by_model),
            'success_rate': round(success_percentage, 2),
            'period_days': days
        })

class SamConfigurationViewSet(viewsets.ModelViewSet):
    queryset = SamConfiguration.objects.all()
    serializer_class = SamConfigurationSerializer
    permission_classes = [permissions.IsAdminUser]
    
    @action(detail=False, methods=['get'])
    def current_config(self, request):
        """Get current Sam configuration"""
        config = SamConfiguration.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def update_config(self, request):
        """Update Sam configuration"""
        config = SamConfiguration.get_config()
        serializer = self.get_serializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get Sam status information"""
        config = SamConfiguration.get_config()
        return Response({
            'is_enabled': config.is_enabled,
            'current_model': config.current_model.get_name_display() if config.current_model else None,
            'current_model_api_name': config.current_model.api_name if config.current_model else None,
            'has_custom_instructions': bool(config.custom_instructions),
            'last_updated': config.updated_at,
            'updated_by': config.updated_by.username if config.updated_by else None
        })
    
    @action(detail=False, methods=['post'])
    def upload_icon(self, request):
        """Upload custom icon for Sam"""
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import os
        
        if 'sam_icon' not in request.FILES:
            return Response({'error': 'No se proporcionó archivo de ícono'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        icon_file = request.FILES['sam_icon']
        
        # Validate file type
        if not icon_file.content_type.startswith('image/'):
            return Response({'error': 'El archivo debe ser una imagen'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create media directory if it doesn't exist
            icon_dir = 'icons/sam/'
            if not os.path.exists(f'media/{icon_dir}'):
                os.makedirs(f'media/{icon_dir}', exist_ok=True)
            
            # Save file
            filename = f'sam_icon_{timezone.now().strftime("%Y%m%d_%H%M%S")}.png'
            file_path = default_storage.save(f'{icon_dir}{filename}', ContentFile(icon_file.read()))
            
            return Response({
                'message': 'Ícono subido exitosamente',
                'icon_url': f'/media/{file_path}',
                'filename': filename
            })
            
        except Exception as e:
            return Response({'error': f'Error subiendo archivo: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)