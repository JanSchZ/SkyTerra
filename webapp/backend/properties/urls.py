from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, TourViewSet, ImageViewSet

# Define router and register viewsets
router = DefaultRouter()
router.register(r'properties', PropertyViewSet)
router.register(r'tours', TourViewSet)
router.register(r'images', ImageViewSet)

# urlpatterns will now only contain router URLs for this app
urlpatterns = router.urls 