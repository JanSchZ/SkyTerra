from django.contrib import admin
from .models import (
    Property,
    Tour,
    Image,
    PropertyDocument,
    RecordingOrder,
    ListingPlan,
    PropertyStatusHistory,
    PilotProfile,
    PilotDocument,
    PilotDevice,
    Job,
    JobOffer,
    JobTimelineEvent,
)

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'owner_display', # Using a custom method for owner
        'price',
        'size',
        'publication_status',
        'workflow_node',
        'workflow_substate',
        'workflow_progress',
        'has_water',
        'has_views',
        'created_at'
    )
    list_filter = ('publication_status', 'workflow_node', 'workflow_substate', 'has_water', 'has_views', 'type') # Added publication_status and type
    search_fields = ('name', 'description', 'owner__username', 'owner__email') # Added owner fields to search
    list_editable = ('publication_status',)
    readonly_fields = ('created_at', 'updated_at', 'workflow_progress') # Good practice to make these readonly

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

@admin.register(PropertyDocument)
class PropertyDocumentAdmin(admin.ModelAdmin):
    list_display = ('property', 'doc_type', 'status', 'uploaded_at', 'reviewed_by')
    list_filter = ('doc_type',)
    search_fields = ('property__name', 'description')

@admin.register(RecordingOrder)
class RecordingOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'property', 'requested_by', 'assigned_to', 'status', 'scheduled_date', 'updated_at')
    list_filter = ('status',)
    search_fields = ('property__name', 'requested_by__username', 'assigned_to__username')


@admin.register(ListingPlan)
class ListingPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'price', 'updated_at')
    search_fields = ('name', 'key')


@admin.register(PropertyStatusHistory)
class PropertyStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('property', 'node', 'substate', 'percent', 'created_at', 'actor')
    list_filter = ('node', 'substate')
    search_fields = ('property__name', 'message')


@admin.register(PilotProfile)
class PilotProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'status', 'is_available', 'rating', 'score', 'updated_at')
    list_filter = ('status', 'is_available')
    search_fields = ('user__username', 'user__email', 'display_name')


@admin.register(PilotDocument)
class PilotDocumentAdmin(admin.ModelAdmin):
    list_display = ('pilot', 'doc_type', 'status', 'expires_at', 'uploaded_at', 'reviewed_by')
    list_filter = ('doc_type', 'status')
    search_fields = ('pilot__user__username', 'pilot__display_name')


@admin.register(PilotDevice)
class PilotDeviceAdmin(admin.ModelAdmin):
    list_display = ('pilot', 'device_token', 'device_type', 'is_active', 'created_at')
    list_filter = ('device_type', 'is_active')
    search_fields = ('pilot__user__username', 'pilot__display_name', 'device_token')


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('id', 'property', 'status', 'assigned_pilot', 'scheduled_start', 'scheduled_end', 'updated_at')
    list_filter = ('status',)
    search_fields = ('property__name', 'assigned_pilot__user__username')

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('debug/', self.debug_view, name='job_debug'),
        ]
        return custom_urls + urls

    def debug_view(self, request):
        from django.shortcuts import render
        from .models import PilotProfile, Property, Job
        from django.db.models import Q

        # Get system stats
        approved_properties = Property.objects.filter(publication_status='approved').count()
        approved_for_shoot = Property.objects.filter(workflow_substate='approved_for_shoot').count()
        total_jobs = Job.objects.count()
        available_pilots = PilotProfile.objects.filter(status='approved', is_available=True).count()
        properties_with_coords = Property.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True).count()

        context = {
            'title': 'Job System Debug',
            'approved_properties': approved_properties,
            'approved_for_shoot': approved_for_shoot,
            'total_jobs': total_jobs,
            'available_pilots': available_pilots,
            'properties_with_coordinates': properties_with_coords,
            'recent_jobs': Job.objects.select_related('property', 'assigned_pilot').order_by('-created_at')[:10],
            'pilots': PilotProfile.objects.select_related('user').filter(status='approved')[:20],
        }
        return render(request, 'admin/properties/job_debug.html', context)


@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'pilot', 'status', 'wave', 'score', 'sent_at')
    list_filter = ('status', 'wave')
    search_fields = ('job__property__name', 'pilot__user__username')


@admin.register(JobTimelineEvent)
class JobTimelineEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'kind', 'actor', 'created_at')
    list_filter = ('kind',)
    search_fields = ('job__property__name', 'message')
