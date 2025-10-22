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
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.twitter.views import TwitterOAuthAdapter
from allauth.socialaccount.providers.apple.views import AppleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from skyterra_backend.views import (
    ProfileUpdateView,
    CSRFTokenView,
    OperatorLoginView,
    OperatorRegisterView,
)
from skyterra_backend.views_admin import AdminDashboardSummaryView, AdminUserListView, AdminDashboardStatsView, AdminPlanMetricsView  # Import stats view
from rest_framework import routers
from support_tickets.views import TicketViewSet, TicketResponseViewSet
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.urls import include as dj_include

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

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = settings.CLIENT_URL + '/login'

class TwitterLogin(SocialLoginView):
    adapter_class = TwitterOAuthAdapter

class AppleLogin(SocialLoginView):
    adapter_class = AppleOAuth2Adapter
    client_class = OAuth2Client
    # Use CLIENT_URL environment (fallback to localhost for dev)
    callback_url = settings.CLIENT_URL.rstrip('/') + '/login'

router = routers.DefaultRouter()
router.register(r'admin/tickets', TicketViewSet, basename='admin-tickets')
router.register(r'admin/ticket-responses', TicketResponseViewSet, basename='admin-ticket-responses')

urlpatterns = [
    path('', home_view, name='home'),  # Ruta raíz
    path('admin/', admin.site.urls),
    # API schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/ai-search/', AISearchView.as_view(), name='project-ai-search'),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/csrf/', CSRFTokenView.as_view(), name='set-csrf-cookie'),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/operator/login/', OperatorLoginView.as_view(), name='operator-login'),
    path('api/auth/operator/registration/', OperatorRegisterView.as_view(), name='operator-registration'),
    path('api/auth/profile/', ProfileUpdateView.as_view(), name='profile-update'),
    path('api/auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('api/auth/twitter/', TwitterLogin.as_view(), name='twitter_login'),
    path('api/auth/apple/', AppleLogin.as_view(), name='apple_login'),
    path('api/admin/dashboard-summary/', AdminDashboardSummaryView.as_view(), name='admin-dashboard-summary'),
    path('api/admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('api/admin/dashboard/stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('api/admin/dashboard/plan-metrics/', AdminPlanMetricsView.as_view(), name='admin-dashboard-plan-metrics'),
    path('api/', include('properties.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/ai/', include('ai_management.urls')),
    path('api/media/', dj_include('media_manager.urls')),
    path('api/', include(router.urls)),
]

# Servir archivos estáticos y media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
