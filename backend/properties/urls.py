from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyViewSet, TourViewSet, ImageViewSet, PropertyDocumentViewSet, PropertyVisitViewSet, PropertyPreviewViewSet, ComparisonSessionViewSet, SavedSearchViewSet, FavoriteViewSet

# Define router and register viewsets
router = DefaultRouter()
router.register(r'properties-preview', PropertyPreviewViewSet, basename='propertypreview')
router.register(r'properties', PropertyViewSet)
router.register(r'tours', TourViewSet)
router.register(r'images', ImageViewSet)
router.register(r'documents', PropertyDocumentViewSet)
router.register(r'property-visits', PropertyVisitViewSet, basename='propertyvisit')
router.register(r'compare', ComparisonSessionViewSet, basename='comparisonsession')
router.register(r'saved-searches', SavedSearchViewSet, basename='savedsearch')
router.register(r'favorites', FavoriteViewSet, basename='favorite')

# urlpatterns will now only contain router URLs for this app
urlpatterns = router.urls 