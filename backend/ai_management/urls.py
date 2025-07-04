from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIModelViewSet, AIUsageLogViewSet

router = DefaultRouter()
router.register(r'models', AIModelViewSet)
router.register(r'logs', AIUsageLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
