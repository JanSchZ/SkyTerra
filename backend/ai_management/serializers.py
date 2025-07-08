from rest_framework import serializers
from .models import AIModel, AIUsageLog, SamConfiguration

class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = '__all__'

class AIUsageLogSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source='model_used.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)

    class Meta:
        model = AIUsageLog
        fields = ['id', 'user', 'username', 'model_used', 'model_name', 'request_type', 'tokens_input', 
                  'tokens_output', 'cost', 'response_time_ms', 'success', 
                  'error_message', 'timestamp']

class SamConfigurationSerializer(serializers.ModelSerializer):
    current_model_details = AIModelSerializer(source='current_model', read_only=True)
    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)

    class Meta:
        model = SamConfiguration
        fields = ['id', 'is_enabled', 'current_model', 'current_model_details',
                  'custom_instructions', 'max_history_messages', 'response_temperature',
                  'updated_at', 'updated_by_username']