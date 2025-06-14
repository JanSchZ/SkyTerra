from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, TourViewSet, ImageViewSet, PropertyDocumentViewSet, PropertyVisitViewSet

# Define router and register viewsets
router = DefaultRouter()
router.register(r'properties', PropertyViewSet)
router.register(r'tours', TourViewSet)
router.register(r'images', ImageViewSet)
router.register(r'documents', PropertyDocumentViewSet)
router.register(r'property-visits', PropertyVisitViewSet, basename='propertyvisit')

# urlpatterns will now only contain router URLs for this app
urlpatterns = router.urls 