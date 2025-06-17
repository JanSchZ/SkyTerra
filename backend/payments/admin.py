from django.contrib import admin
from .models import Coupon

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'value', 'is_active', 'valid_from', 'valid_to')
    list_filter = ('is_active', 'discount_type', 'valid_from', 'valid_to')
    search_fields = ('code',)
    fieldsets = (
        (None, {
            'fields': ('code', 'is_active')
        }),
        ('Discount Details', {
            'fields': ('discount_type', 'value')
        }),
        ('Validity Period', {
            'fields': ('valid_from', 'valid_to')
        }),
    )
    ordering = ('-valid_to',)
