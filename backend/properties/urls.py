from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet, TourViewSet, ImageViewSet,
    admin_pending_properties, admin_approve_property, 
    admin_reject_property, admin_add_tour, admin_dashboard_stats
)

# Define router and register viewsets
router = DefaultRouter()
router.register(r'properties', PropertyViewSet)
router.register(r'tours', TourViewSet)
router.register(r'images', ImageViewSet)

# Admin URLs for property workflow
admin_urlpatterns = [
    path('admin/dashboard/stats/', admin_dashboard_stats, name='admin-dashboard-stats'),
    path('admin/properties/pending/', admin_pending_properties, name='admin-pending-properties'),
    path('admin/properties/<int:property_id>/approve/', admin_approve_property, name='admin-approve-property'),
    path('admin/properties/<int:property_id>/reject/', admin_reject_property, name='admin-reject-property'),
    path('admin/properties/<int:property_id>/add-tour/', admin_add_tour, name='admin-add-tour'),
]

# urlpatterns will now contain router URLs + admin URLs
urlpatterns = router.urls + admin_urlpatterns