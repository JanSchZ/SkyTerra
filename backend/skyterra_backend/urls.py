"""
URL configuration for skyterra_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken import views as token_views
from properties.views import AISearchView
from django.http import JsonResponse
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

def home_view(request):
    """Vista simple para la página de inicio"""
    return JsonResponse({
        'message': 'Bienvenido a SkyTerra API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'api_properties': '/api/properties/',
            'api_tours': '/api/tours/',
            'api_images': '/api/images/',
            'ai_search': '/api/ai-search/',
            'auth_login': '/api/auth/login/',
            'auth_register': '/api/auth/register/'
        }
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Vista para iniciar sesión"""
    print(f"Login attempt with data: {request.data}")  # Debug
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Buscar usuario por email
    try:
        user_obj = User.objects.get(email=email)
        print(f"User found: {user_obj.username}")  # Debug
        user = authenticate(username=user_obj.username, password=password)
        print(f"Authentication result: {user}")  # Debug
    except User.DoesNotExist:
        print(f"User with email {email} not found")  # Debug
        user = None
    
    if user and user.is_active:
        token, created = Token.objects.get_or_create(user=user)
        print(f"Token created: {created}, token: {token.key[:10]}...")  # Debug
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })
    else:
        return Response({
            'error': 'Credenciales inválidas o usuario inactivo'
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Vista para registrar usuario"""
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not email or not username or not password:
        return Response({
            'error': 'Email, username y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar si el usuario ya existe
    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'Ya existe un usuario con este email'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=username).exists():
        return Response({
            'error': 'Ya existe un usuario con este nombre de usuario'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Crear usuario
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'error': f'Error al crear usuario: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path('', home_view, name='home'),  # Ruta raíz
    path('admin/', admin.site.urls),
    path('api/ai-search/', AISearchView.as_view(), name='project-ai-search'),
    path('api/auth/login/', login_view, name='auth-login'),
    path('api/auth/register/', register_view, name='auth-register'),
    path('api/', include('properties.urls')),
]

# Servir archivos estáticos y media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
