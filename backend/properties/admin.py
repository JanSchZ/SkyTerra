from django.contrib import admin
from .models import Property, Tour, Image # Ensure Property is imported

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'owner_display', # Using a custom method for owner
        'price',
        'size',
        'publication_status',
        'has_water',
        'has_views',
        'created_at'
    )
    list_filter = ('publication_status', 'has_water', 'has_views', 'type') # Added publication_status and type
    search_fields = ('name', 'description', 'owner__username', 'owner__email') # Added owner fields to search
    list_editable = ('publication_status',)
    readonly_fields = ('created_at', 'updated_at') # Good practice to make these readonly

    # Define a method to display owner information more gracefully
    def owner_display(self, obj):
        if obj.owner:
            return obj.owner.username  # Or obj.owner.email, or obj.owner.get_full_name()
        return None
    owner_display.short_description = 'Owner' # Sets column header
    owner_display.admin_order_field = 'owner__username' # Allows sorting by owner's username

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
