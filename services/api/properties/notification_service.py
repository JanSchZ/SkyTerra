import logging
from typing import List
from django.conf import settings
from .models import PilotDevice, JobOffer

logger = logging.getLogger(__name__)


def send_job_offer_notification(offer: JobOffer) -> bool:
    """
    Envía notificaciones push a los dispositivos del piloto sobre una nueva oferta de trabajo.

    Returns:
        bool: True si se enviaron notificaciones exitosamente, False en caso contrario
    """
    try:
        pilot = offer.pilot
        devices = PilotDevice.objects.filter(pilot=pilot, is_active=True)

        if not devices.exists():
            logger.info(f"No active devices found for pilot {pilot.id}")
            return False

        # Configuración de la notificación
        title = "Nueva oferta de trabajo"
        body = f"¡Tienes una nueva oferta para grabar {offer.job.property.name}!"

        # Detalles adicionales del trabajo
        price = offer.job.pilot_payout_amount or offer.job.price_amount
        if price:
            body += f" Pago: ${price:,.0f}"

        distance = offer.metadata.get('distance_km') if offer.metadata else None
        if distance:
            body += f" • Distancia: {distance:.1f} km"

        # Enviar notificación a cada dispositivo activo
        sent_count = 0
        for device in devices:
            try:
                # Aquí se integraría con el servicio de notificaciones push real
                # Por ahora, solo registramos que se enviaría
                logger.info(
                    f"Would send push notification to {device.device_type} device "
                    f"({device.device_token[:20]}...) for pilot {pilot.user.username}: "
                    f"'{title}' - '{body}'"
                )
                sent_count += 1

            except Exception as device_error:
                logger.error(f"Error sending notification to device {device.id}: {device_error}")

        logger.info(f"Sent {sent_count} notifications for job offer {offer.id}")
        return sent_count > 0

    except Exception as e:
        logger.error(f"Error sending job offer notification: {e}")
        return False


def send_job_offers_notifications(offers: List[JobOffer]) -> int:
    """
    Envía notificaciones push para múltiples ofertas de trabajo.

    Returns:
        int: Número de notificaciones enviadas exitosamente
    """
    sent_count = 0
    for offer in offers:
        if send_job_offer_notification(offer):
            sent_count += 1

    logger.info(f"Sent {sent_count}/{len(offers)} job offer notifications successfully")
    return sent_count


def send_job_status_notification(pilot, job, status: str, message: str = None) -> bool:
    """
    Envía notificaciones push sobre cambios de estado de trabajos.

    Args:
        pilot: PilotProfile del piloto
        job: Job que cambió de estado
        status: Nuevo estado del trabajo
        message: Mensaje adicional (opcional)

    Returns:
        bool: True si se enviaron notificaciones exitosamente
    """
    try:
        devices = PilotDevice.objects.filter(pilot=pilot, is_active=True)

        if not devices.exists():
            logger.info(f"No active devices found for pilot {pilot.id}")
            return False

        # Configuración de la notificación según el estado
        status_messages = {
            'assigned': {
                'title': 'Trabajo asignado',
                'body': f'¡Se te asignó el trabajo {job.property.name}!',
            },
            'scheduled': {
                'title': 'Fecha confirmada',
                'body': f'La fecha de grabación para {job.property.name} está confirmada.',
            },
            'shooting': {
                'title': '¡Hora de volar!',
                'body': f'Comienza la grabación de {job.property.name}. ¡Buen vuelo!',
            },
            'finished': {
                'title': 'Grabación completada',
                'body': f'La grabación de {job.property.name} ha finalizado.',
            },
            'canceled': {
                'title': 'Trabajo cancelado',
                'body': f'El trabajo {job.property.name} ha sido cancelado.',
            },
        }

        notification_config = status_messages.get(status, {
            'title': 'Actualización de trabajo',
            'body': f'Estado de {job.property.name}: {status}',
        })

        title = notification_config['title']
        body = notification_config['body']

        if message:
            body += f" - {message}"

        # Enviar notificación a cada dispositivo activo
        sent_count = 0
        for device in devices:
            try:
                logger.info(
                    f"Would send status notification to {device.device_type} device "
                    f"({device.device_token[:20]}...) for pilot {pilot.user.username}: "
                    f"'{title}' - '{body}'"
                )
                sent_count += 1

            except Exception as device_error:
                logger.error(f"Error sending status notification to device {device.id}: {device_error}")

        logger.info(f"Sent {sent_count} status notifications for job {job.id}")
        return sent_count > 0

    except Exception as e:
        logger.error(f"Error sending job status notification: {e}")
        return False
