from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from rest_framework.generics import ListAPIView
from .models import Ticket, TicketResponse
from .serializers import TicketSerializer, TicketResponseSerializer
from rest_framework.pagination import PageNumberPagination
from skyterra_backend.permissions import IsOwnerOrAdmin

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
        if self.action in ['list', 'retrieve', 'create']:
            return [permissions.IsAuthenticated()]
        # For update, partial_update, destroy
        return [IsOwnerOrAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Admins can see all tickets, regular users only their own
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TicketResponseViewSet(viewsets.ModelViewSet):
    queryset = TicketResponse.objects.all().order_by('created_at')
    serializer_class = TicketResponseSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(ticket__user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user_admin=self.request.user)
