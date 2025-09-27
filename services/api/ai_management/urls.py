from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIModelViewSet, AIUsageLogViewSet, SamConfigurationViewSet

router = DefaultRouter()
router.register(r'models', AIModelViewSet)
router.register(r'logs', AIUsageLogViewSet)
router.register(r'sam', SamConfigurationViewSet, basename='sam')

urlpatterns = [
    path('', include(router.urls)),
]
