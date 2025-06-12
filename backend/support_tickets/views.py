from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from rest_framework.generics import ListAPIView
from .models import Ticket, TicketResponse
from .serializers import TicketSerializer, TicketResponseSerializer
from rest_framework.pagination import PageNumberPagination

# Create your views here.

class TicketPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

class TicketViewSet(viewsets.ModelViewSet):
    """Allows users to create tickets and admins to manage them."""
    queryset = Ticket.objects.all().order_by('-created_at')
    serializer_class = TicketSerializer
    pagination_class = TicketPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'description', 'user__username', 'assigned_to__username']
    ordering_fields = ['created_at', 'priority', 'status']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Allow any authenticated user to view their own tickets; admins view all
            return [permissions.IsAuthenticated()]
        else:
            # create is allowed for authenticated, update/delete for staff only
            if self.action == 'create':
                return [permissions.IsAuthenticated()]
            return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TicketResponseViewSet(viewsets.ModelViewSet):
    queryset = TicketResponse.objects.all().order_by('created_at')
    serializer_class = TicketResponseSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(user_admin=self.request.user)
