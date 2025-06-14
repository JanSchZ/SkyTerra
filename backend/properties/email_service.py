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
