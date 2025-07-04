from rest_framework import viewsets, permissions
from .models import AIModel, AIUsageLog
from .serializers import AIModelSerializer, AIUsageLogSerializer

class AIModelViewSet(viewsets.ModelViewSet):
    queryset = AIModel.objects.all()
    serializer_class = AIModelSerializer
    permission_classes = [permissions.IsAdminUser] # Solo los administradores pueden gestionar los modelos de IA

class AIUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIUsageLog.objects.all()
    serializer_class = AIUsageLogSerializer
    permission_classes = [permissions.IsAdminUser] # Solo los administradores pueden ver los registros de uso
