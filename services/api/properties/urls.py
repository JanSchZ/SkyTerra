from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet,
    TourViewSet,
    ImageViewSet,
    PropertyDocumentViewSet,
    PropertyVisitViewSet,
    PropertyPreviewViewSet,
    ComparisonSessionViewSet,
    SavedSearchViewSet,
    FavoriteViewSet,
    RecordingOrderViewSet,
    ListingPlanViewSet,
    PilotProfileViewSet,
    PilotDocumentViewSet,
    PilotDeviceViewSet,
    JobViewSet,
    JobOfferViewSet,
)

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
router.register(r'recording-orders', RecordingOrderViewSet, basename='recordingorder')
router.register(r'plans', ListingPlanViewSet, basename='listingplan')
router.register(r'pilot-profiles', PilotProfileViewSet, basename='pilotprofile')
router.register(r'pilot-documents', PilotDocumentViewSet, basename='pilotdocument')
router.register(r'pilot-devices', PilotDeviceViewSet, basename='pilotdevice')
router.register(r'jobs', JobViewSet, basename='job')
router.register(r'job-offers', JobOfferViewSet, basename='joboffer')
# Note: debug endpoint is available at /api/jobs/debug/

# urlpatterns will now only contain router URLs for this app
urlpatterns = [
    # Servir archivos de paquetes de tours vía backend (evita depender de MEDIA_URL)
    re_path(r'^tours/content/(?P<tour_uuid>[^/]+)/(?P<subpath>.*)$', TourViewSet.as_view({'get': 'serve_content'}), name='tour-content'),
]

# Incluir las rutas generadas por el router
urlpatterns += router.urls 
