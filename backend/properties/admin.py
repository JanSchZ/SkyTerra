from django.contrib import admin
from .models import Property, Tour, Image

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'size', 'has_water', 'has_views', 'created_at')
    list_filter = ('has_water', 'has_views')
    search_fields = ('name', 'description')

@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ('property', 'type', 'created_at')
    list_filter = ('type',)
    search_fields = ('property__name',)

@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ('property', 'type', 'order', 'created_at')
    list_filter = ('type',)
    search_fields = ('property__name',)
    list_editable = ('order',)
