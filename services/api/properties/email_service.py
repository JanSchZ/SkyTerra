from django.core.mail import send_mail
from django.conf import settings

def send_property_status_email(property_instance):
    """Send an email to property owner informing new publication_status."""
    owner = property_instance.owner
    if not owner or not owner.email:
        return

    subject_map = {
        'approved': 'Tu propiedad ha sido aprobada',
        'rejected': 'Tu propiedad ha sido rechazada',
        'pending': 'Tu propiedad está pendiente de revisión',
    }
    subject = subject_map.get(property_instance.publication_status, 'Actualización de estado de tu propiedad')

    message = (
        f"Hola {owner.first_name or owner.username},\n\n"
        f"El estado de publicación de tu propiedad '{property_instance.name}' ha cambiado a: {property_instance.get_publication_status_display()}.\n\n"
        "Puedes acceder a tu cuenta para revisar los detalles.\n\n"
        "Saludos cordiales,\nEquipo SkyTerra"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[owner.email],
        fail_silently=True,
    )

def send_recording_order_created_email(order):
    """Notify admins that a new recording order was created."""
    try:
        prop = order.property
        user = order.requested_by
        subject = f"Nueva Solicitud de Grabación - Propiedad #{prop.id}: {prop.name}"
        message = (
            f"Se creó una nueva orden de grabación para la propiedad '{prop.name}' (ID {prop.id}).\n\n"
            f"Solicitado por: {getattr(user, 'username', 'usuario')} ({getattr(user, 'email', '-')}).\n"
            f"Estado inicial: {order.get_status_display()}.\n\n"
            f"Notas: {order.notes or '-'}\n\n"
            f"Panel Admin: /admin/\n"
        )
        recipients = getattr(settings, 'ADMIN_NOTIFICATION_EMAILS', []) or [settings.DEFAULT_FROM_EMAIL]
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients, fail_silently=True)
    except Exception:
        # No bloquear el flujo por fallos de email
        pass

def send_recording_order_status_email(order):
    """Notify property owner about recording order status changes."""
    try:
        owner = getattr(order.property, 'owner', None)
        if not owner or not owner.email:
            return
        subject = f"Actualización orden de grabación - {order.get_status_display()}"
        message = (
            f"Hola {owner.first_name or owner.username},\n\n"
            f"Tu orden de grabación para la propiedad '{order.property.name}' ahora está en estado: {order.get_status_display()}.\n\n"
            f"Notas: {order.notes or '-'}\n\n"
            "Gracias por usar SkyTerra."
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [owner.email], fail_silently=True)
    except Exception:
        pass
