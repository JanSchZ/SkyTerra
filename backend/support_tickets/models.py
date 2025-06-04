from django.db import models
from django.conf import settings # To get the User model

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('new', 'Nuevo'),
        ('in_progress', 'En Progreso'),
        ('on_hold', 'En Espera'),
        ('resolved', 'Resuelto'),
        ('closed', 'Cerrado'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets', verbose_name='Usuario')
    subject = models.CharField(max_length=255, verbose_name='Asunto')
    description = models.TextField(verbose_name='Descripción')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', verbose_name='Estado')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium', verbose_name='Prioridad')
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='assigned_tickets',
        limit_choices_to={'is_staff': True}, # Only staff can be assigned
        verbose_name='Asignado a'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')

    def __str__(self):
        return f"Ticket #{self.id}: {self.subject} ({self.user.username})"

    class Meta:
        verbose_name = 'Ticket de Soporte'
        verbose_name_plural = 'Tickets de Soporte'
        ordering = ['-created_at']

class TicketResponse(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='responses', verbose_name='Ticket')
    user_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        verbose_name='Administrador',
        limit_choices_to={'is_staff': True} # Only staff can respond as admin
    )
    message = models.TextField(verbose_name='Mensaje de Respuesta')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Respuesta')

    def __str__(self):
        return f"Respuesta de {self.user_admin.username} en Ticket #{self.ticket.id}"

    class Meta:
        verbose_name = 'Respuesta de Ticket'
        verbose_name_plural = 'Respuestas de Tickets'
        ordering = ['created_at']
