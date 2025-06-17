from django.contrib.auth.models import User
from properties.models import Property
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    property_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'date_joined',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
            'property_count'
        )

    def get_property_count(self, obj):
        """
        Calculates the number of properties owned by the user.
        """
        return Property.objects.filter(owner=obj).count()

class UserDetailsSerializer(serializers.ModelSerializer):
    """
    User model w/o password
    """
    class Meta:
        model = User
        fields = ('pk', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('email', )
