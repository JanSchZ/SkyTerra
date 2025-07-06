from rest_framework import serializers
from .models import AIModel, AIUsageLog, SamConfiguration

class AIModelSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='get_name_display', read_only=True)
    
    class Meta:
        model = AIModel
        fields = '__all__'

class AIUsageLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model_used.get_name_display', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AIUsageLog
        fields = '__all__'

class SamConfigurationSerializer(serializers.ModelSerializer):
    current_model_name = serializers.CharField(source='current_model.get_name_display', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = SamConfiguration
        fields = '__all__'
        read_only_fields = ('updated_at', 'updated_by')
