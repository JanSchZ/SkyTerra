from django.contrib.auth.models import User
from properties.models import Property
from rest_framework import serializers
from dj_rest_auth.serializers import LoginSerializer
from rest_framework.response import Response
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.contrib.auth import authenticate
from allauth.account.adapter import get_adapter

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

class CustomLoginSerializer(LoginSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Acepta tanto 'login_identifier' como 'username' desde el frontend
        username_or_email = attrs.get('username') or attrs.get('login_identifier')
        password = attrs.get('password')

        if not username_or_email:
            raise serializers.ValidationError('Debe proporcionar un nombre de usuario o correo electrónico.')

        user = authenticate(request=self.context.get('request'), username=username_or_email, password=password)

        if not user:
            # Try to be more specific about the error
            if User.objects.filter(email__iexact=username_or_email).exists() or User.objects.filter(username__iexact=username_or_email).exists():
                raise serializers.ValidationError('Contraseña incorrecta.')
            else:
                raise serializers.ValidationError('Usuario o correo electrónico no registrado.')
        
        attrs['user'] = user
        return attrs

class CustomRegisterSerializer(RegisterSerializer):
    # Override username and email to explicitly set required based on new allauth settings
    # Assuming username is not required as per settings.ACCOUNT_USERNAME_REQUIRED = False
    # username = serializers.CharField(required=False, allow_blank=True) # Removed to let allauth manage
    # email = serializers.EmailField(required=True) # Removed to let allauth manage

    def validate_email(self, email):
        email = get_adapter().clean_email(email)
        return email