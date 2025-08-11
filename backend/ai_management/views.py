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
        """Populate default AI models"""
        try:
            default_models_data = [
                {"name": "Gemini 1.0 Pro", "api_name": "gemini-pro", "price_per_1k_tokens_input": 0.0001, "price_per_1k_tokens_output": 0.0002, "max_tokens": 32768, "is_active": True, "supports_thinking": False},
                {"name": "Gemini 1.5 Flash", "api_name": "gemini-1.5-flash-latest", "price_per_1k_tokens_input": 0.00035, "price_per_1k_tokens_output": 0.0005, "max_tokens": 1048576, "is_active": True, "supports_thinking": True},
                {"name": "Gemini 1.5 Pro", "api_name": "gemini-1.5-pro-latest", "price_per_1k_tokens_input": 0.0035, "price_per_1k_tokens_output": 0.007, "max_tokens": 1048576, "is_active": True, "supports_thinking": True},
            ]

            for model_data in default_models_data:
                AIModel.objects.update_or_create(api_name=model_data['api_name'], defaults=model_data)
            
            return Response({"message": "Default AI models populated successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
    
    def perform_update(self, serializer):
        """Custom update logic to record the user who made the change."""
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['get'])
    def current_config(self, request):
        """Get current Sam configuration"""
        config = SamConfiguration.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get Sam status information"""
        config = SamConfiguration.get_config()
        return Response({
            'is_enabled': config.is_enabled,
            'current_model': config.current_model.name if config.current_model else None,
            'current_model_api_name': config.current_model.api_name if config.current_model else None,
            'has_custom_instructions': bool(config.custom_instructions),
            'last_updated': config.updated_at,
            'updated_by': config.updated_by.username if config.updated_by else None
        })