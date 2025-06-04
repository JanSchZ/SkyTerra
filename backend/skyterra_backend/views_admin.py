from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from datetime import timedelta
from properties.models import Property
from support_tickets.models import Ticket
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Avg
from .serializers import UserSerializer # Import the new serializer

User = get_user_model()

class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        last_7_days_start = now - timedelta(days=7) # Renamed for clarity
        last_month_start = now - timedelta(days=30)

        # Propiedades pendientes de aprobación
        pending_properties = Property.objects.filter(publication_status='pending_approval').count()
        # Propiedades publicadas hoy
        published_today = Property.objects.filter(publication_status='published', created_at__date=today).count()
        # Tickets de soporte abiertos
        open_tickets = Ticket.objects.filter(status__in=['new', 'in_progress', 'on_hold']).count()
        # Nuevos usuarios últimos 7 días
        new_users = User.objects.filter(date_joined__gte=last_7_days_start).count() # Use renamed variable

        # Nuevas estadísticas
        properties_last_week = Property.objects.filter(created_at__gte=last_7_days_start, created_at__lte=now).count()
        properties_last_month = Property.objects.filter(created_at__gte=last_month_start, created_at__lte=now).count()
        average_property_size_data = Property.objects.aggregate(avg_size=Avg('size'))
        average_property_size = average_property_size_data['avg_size']

        # Propiedades creadas por día en los últimos 7 días (para gráfico)
        from django.db.models.functions import TruncDate
        properties_by_day = (
            Property.objects.filter(created_at__gte=last_7_days_start) # Use renamed variable
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .order_by('day')
            .annotate(count=models.Count('id'))
        )

        return Response({
            "pending_properties": pending_properties,
            "published_today": published_today,
            "open_tickets": open_tickets,
            "new_users": new_users,
            "properties_by_day": list(properties_by_day),
            "properties_last_week": properties_last_week,
            "properties_last_month": properties_last_month,
            "average_property_size": average_property_size if average_property_size is not None else 0,
        })

class AdminUserListView(ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-date_joined')