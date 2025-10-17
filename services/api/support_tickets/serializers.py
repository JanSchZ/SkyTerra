from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketResponse

User = get_user_model()


class TicketResponseSerializer(serializers.ModelSerializer):
    user_admin = serializers.StringRelatedField(read_only=True)
    user_admin_id = serializers.IntegerField(source='user_admin.id', read_only=True)
    user_admin_email = serializers.EmailField(source='user_admin.email', read_only=True)

    class Meta:
        model = TicketResponse
        fields = ['id', 'ticket', 'user_admin', 'user_admin_id', 'user_admin_email', 'message', 'created_at']


class TicketSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    assigned_to = serializers.StringRelatedField(read_only=True)
    assigned_to_user_id = serializers.IntegerField(source='assigned_to.id', read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source='assigned_to',
        queryset=User.objects.filter(is_staff=True),
        allow_null=True,
        required=False,
        write_only=True,
    )
    assigned_to_email = serializers.EmailField(source='assigned_to.email', read_only=True)

    responses = TicketResponseSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id',
            'subject',
            'description',
            'status',
            'priority',
            'user',
            'user_id',
            'user_email',
            'assigned_to',
            'assigned_to_user_id',
            'assigned_to_id',
            'assigned_to_email',
            'responses',
            'created_at',
            'updated_at',
        ]
