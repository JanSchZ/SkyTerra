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
from django.contrib.auth import authenticate, views as auth_views
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
    """Vista para iniciar sesión con email/username y contraseña"""
    print(f"Login attempt with data: {request.data}")

    login_identifier = request.data.get('login_identifier') # Expecting 'login_identifier' from frontend
    password = request.data.get('password')

    if not login_identifier or not password:
        return Response({
            'error': 'Identificador de inicio de sesión y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Authenticate using the custom backend which handles email or username
    user = authenticate(request, username=login_identifier, password=password)
    print(f"Authentication result: {user}")

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
    print(f"🔄 Intento de registro con datos: {request.data}")
    
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Validación de campos requeridos
    if not email or not username or not password:
        error_msg = 'Email, username y contraseña son requeridos'
        print(f"❌ Campos faltantes: {error_msg}")
        return Response({
            'error': error_msg
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validación del formato del email
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        print(f"❌ Email inválido: {email}")
        return Response({
            'error': 'Formato de email inválido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validación de la contraseña
    if len(password) < 8:
        print(f"❌ Contraseña muy corta: {len(password)} caracteres")
        return Response({
            'error': 'La contraseña debe tener al menos 8 caracteres'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar si el usuario ya existe por email
    if User.objects.filter(email=email).exists():
        print(f"❌ Email ya existe: {email}")
        return Response({
            'error': 'Ya existe un usuario con este email'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verificar si el usuario ya existe por username
    if User.objects.filter(username=username).exists():
        print(f"❌ Username ya existe: {username}")
        return Response({
            'error': 'Ya existe un usuario con este nombre de usuario'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Crear usuario
    try:
        print(f"✅ Creando usuario: {username} ({email})")
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        token, created = Token.objects.get_or_create(user=user)
        
        print(f"✅ Usuario creado exitosamente: ID={user.id}, Token={'creado' if created else 'existente'}")
        
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
        print(f"❌ Error al crear usuario: {str(e)}")
        return Response({
            'error': f'Error al crear usuario: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path('', home_view, name='home'),  # Ruta raíz
    path('admin/', admin.site.urls),
    path('api/ai-search/', AISearchView.as_view(), name='project-ai-search'),
    path('api/auth/login/', login_view, name='auth-login'),
    path('api/auth/register/', register_view, name='auth-register'),
    # Password Reset URLs (namespaced for clarity, though not strictly necessary here)
    path('api/auth/password_reset/', 
         auth_views.PasswordResetView.as_view(template_name='registration/password_reset_form.html', email_template_name='registration/password_reset_email.html', subject_template_name='registration/password_reset_subject.txt'), 
         name='password_reset'),
    path('api/auth/password_reset/done/', 
         auth_views.PasswordResetDoneView.as_view(template_name='registration/password_reset_done.html'), 
         name='password_reset_done'),
    path('api/auth/reset/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html'), 
         name='password_reset_confirm'),
    path('api/auth/reset/done/', 
         auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'), 
         name='password_reset_complete'),
    path('api/', include('properties.urls')),
]

# Servir archivos estáticos y media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
