from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.models import User
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Servicio para envío de emails del sistema"""
    
    @staticmethod
    def send_property_submitted_notification(property_obj):
        """Envía notificación a admins cuando se sube una nueva propiedad"""
        try:
            # Obtener todos los administradores
            admins = User.objects.filter(is_staff=True)
            admin_emails = [admin.email for admin in admins if admin.email]
            
            if not admin_emails:
                logger.warning("No hay administradores con email configurado")
                return False
            
            subject = f"Nueva propiedad pendiente de aprobación: {property_obj.name}"
            
            # Crear el contexto para el template
            context = {
                'property': property_obj,
                'owner': property_obj.owner,
                'admin_url': f"{settings.FRONTEND_URL or 'http://localhost:3000'}/admin/properties/{property_obj.id}"
            }
            
            # Crear contenido del email
            text_content = f"""
¡Nueva propiedad enviada para aprobación!

Propiedad: {property_obj.name}
Tipo: {property_obj.get_type_display()}
Precio: ${property_obj.price:,.0f}
Tamaño: {property_obj.size} hectáreas
Propietario: {property_obj.owner.get_full_name() or property_obj.owner.username}
Email del propietario: {property_obj.owner.email}

Descripción:
{property_obj.description}

Para aprobar o rechazar esta propiedad, ingresa al panel de administración.

--
Sistema SkyTerra
🏞️ Conectando con la naturaleza
            """
            
            # Enviar email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=admin_emails,
            )
            
            email.send()
            logger.info(f"Email de nueva propiedad enviado a {len(admin_emails)} administradores")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email de nueva propiedad: {str(e)}")
            return False
    
    @staticmethod
    def send_property_approval_notification(property_obj, approved=True):
        """Envía notificación al propietario sobre el estado de su propiedad"""
        try:
            if not property_obj.owner or not property_obj.owner.email:
                logger.warning(f"Propiedad {property_obj.id} no tiene propietario con email")
                return False
            
            status_text = "aprobada" if approved else "rechazada"
            subject = f"Tu propiedad '{property_obj.name}' ha sido {status_text}"
            
            if approved:
                text_content = f"""
¡Excelentes noticias, {property_obj.owner.get_full_name() or property_obj.owner.username}!

Tu propiedad "{property_obj.name}" ha sido APROBADA y ya está visible en SkyTerra.

Los usuarios ahora pueden:
- Ver tu propiedad en el mapa
- Acceder a toda la información que proporcionaste
- Contactarte para más detalles

Puedes ver tu propiedad publicada en: {settings.FRONTEND_URL or 'http://localhost:3000'}

¡Gracias por confiar en SkyTerra para promocionar tu propiedad!

--
Equipo SkyTerra
🏞️ Conectando con la naturaleza
                """
            else:
                text_content = f"""
Hola {property_obj.owner.get_full_name() or property_obj.owner.username},

Lamentamos informarte que tu propiedad "{property_obj.name}" no ha sido aprobada para publicación en este momento.

Esto puede deberse a:
- Información incompleta o inconsistente
- Imágenes de baja calidad
- Falta de documentación requerida

Te recomendamos:
1. Revisar la información proporcionada
2. Asegurarte de que las imágenes sean claras y representen bien la propiedad
3. Volver a enviar la propiedad con las correcciones necesarias

Si tienes preguntas, no dudes en contactarnos.

--
Equipo SkyTerra
🏞️ Conectando con la naturaleza
                """
            
            # Enviar email
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[property_obj.owner.email],
            )
            
            email.send()
            logger.info(f"Email de {status_text} enviado a {property_obj.owner.email}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email de aprobación: {str(e)}")
            return False
