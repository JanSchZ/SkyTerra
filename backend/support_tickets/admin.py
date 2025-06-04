from django.contrib import admin
from .models import Ticket, TicketResponse

class TicketResponseInline(admin.TabularInline):
    model = TicketResponse
    extra = 1 # Cuántos formularios de respuesta vacíos mostrar
    fields = ('user_admin', 'message', 'created_at')
    readonly_fields = ('created_at',)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user_admin":
            kwargs["initial"] = request.user.id
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'user', 'status', 'priority', 'assigned_to', 'created_at', 'updated_at')
    list_filter = ('status', 'priority', 'assigned_to', 'created_at')
    search_fields = ('id', 'subject', 'description', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('subject', 'user', 'description')
        }),
        ('Estado y Prioridad', {
            'fields': ('status', 'priority', 'assigned_to')
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [TicketResponseInline]

    def save_model(self, request, obj, form, change):
        if 'assigned_to' in form.changed_data and obj.assigned_to and obj.status == 'new':
            obj.status = 'in_progress'
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, TicketResponse) and not instance.pk: 
                if instance.ticket.status == 'new':
                    instance.ticket.status = 'in_progress'
                    instance.ticket.save()
                if not instance.user_admin_id:
                    instance.user_admin = request.user
            instance.save()
        formset.save_m2m()

# @admin.register(TicketResponse)
# class TicketResponseAdmin(admin.ModelAdmin):
#     list_display = ('id', 'ticket', 'user_admin', 'created_at')
#     search_fields = ('ticket__subject', 'user_admin__username', 'message')
#     readonly_fields = ('created_at',)
