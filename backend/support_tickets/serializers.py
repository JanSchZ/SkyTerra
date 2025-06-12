from rest_framework import serializers
from .models import Ticket, TicketResponse
from django.contrib.auth import get_user_model

User = get_user_model()

class TicketSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    assigned_to = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'subject', 'description', 'status', 'priority',
            'user', 'assigned_to', 'created_at', 'updated_at'
        ]

class TicketResponseSerializer(serializers.ModelSerializer):
    user_admin = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = TicketResponse
        fields = ['id', 'ticket', 'user_admin', 'message', 'created_at'] 