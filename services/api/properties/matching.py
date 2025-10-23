import math
import logging
from datetime import timedelta
from typing import List, Tuple, TYPE_CHECKING

from django.apps import apps
from django.db.models import Prefetch
from django.utils import timezone

logger = logging.getLogger(__name__)

if TYPE_CHECKING:  # pragma: no cover
    from .models import Job, JobOffer, PilotProfile

# Importación lazy para evitar dependencias circulares
def _get_notification_service():
    from .notification_service import send_job_offers_notifications
    return send_job_offers_notifications

# Configuración por defecto; puede moverse a settings si se requiere.
MATCHING_DEFAULTS = {
    "invite_count": 5,
    "initial_radius_km": 10,
    "radius_step_km": 10,
    "max_radius_km": 50,
    "ttl_seconds": 20,
    "max_waves": 3,
    "activity_minutes": 30,
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia aproximada entre dos puntos (km)."""
    radius = 6371.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def pilot_is_operational(pilot: PilotProfile) -> bool:
    """Requiere documentos aprobados y estado activo."""
    if pilot.status != "approved":
        return False
    docs = getattr(pilot, "_prefetched_documents", None) or list(pilot.documents.all())
    if not docs:
        return False
    for doc in docs:
        if doc.status in {"pending", "rejected", "expired"}:
            return False
    return True


def compute_score(pilot: PilotProfile, distance_km: float, radius_km: float) -> float:
    """Score simple basado en rating, distancia y actividad."""
    rating_component = float(pilot.rating or 0) / 5.0
    distance_norm = min(distance_km / radius_km, 1.0) if radius_km > 0 else 1.0
    distance_component = 1.0 - distance_norm
    completion_component = min(pilot.completed_jobs / 50.0, 1.0) if pilot.completed_jobs else 0.0
    activity_component = 0.0
    last_seen = pilot.last_heartbeat_at
    if last_seen:
        delta_minutes = (timezone.now() - last_seen).total_seconds() / 60.0
        activity_component = max(0.0, 1.0 - min(delta_minutes / MATCHING_DEFAULTS["activity_minutes"], 1.0))
    penalty = 0.0
    if not pilot.is_available:
        penalty -= 0.5
    return (
        0.5 * rating_component
        + 0.3 * distance_component
        + 0.15 * completion_component
        + 0.05 * activity_component
        + penalty
    )


def shortlist_pilots(job: "Job", wave: int) -> List[Tuple["PilotProfile", float, float]]:
    """Devuelve pilotos elegibles ordenados (pilot, distancia, score)."""
    property_obj = job.property
    logger.info(f"Shortlisting pilots for job {job.id} (property: {property_obj.name})")

    if property_obj.latitude is None or property_obj.longitude is None:
        logger.warning(f"Property {property_obj.id} has no coordinates")
        return []

    PilotProfile = apps.get_model("properties", "PilotProfile")
    PilotDocument = apps.get_model("properties", "PilotDocument")
    invited_ids = set(job.offers.values_list("pilot_id", flat=True))

    # Count available pilots
    total_pilots = PilotProfile.objects.filter(status="approved", is_available=True).count()
    logger.info(f"Total approved and available pilots: {total_pilots}")

    base_qs = (
        PilotProfile.objects.filter(status="approved", is_available=True)
        .exclude(id__in=invited_ids)
        .select_related("user")
        .prefetch_related(Prefetch("documents", queryset=PilotDocument.objects.all()))
    )

    logger.info(f"Found {base_qs.count()} eligible pilots (excluding already invited)")

    radius_km = min(
        MATCHING_DEFAULTS["initial_radius_km"] + (wave - 1) * MATCHING_DEFAULTS["radius_step_km"],
        MATCHING_DEFAULTS["max_radius_km"],
    )

    pilots = []
    pilots_with_coords = 0
    pilots_in_radius = 0

    for pilot in base_qs:
        if pilot.location_latitude is None or pilot.location_longitude is None:
            continue

        pilots_with_coords += 1
        distance_km = haversine_distance_km(
            property_obj.latitude,
            property_obj.longitude,
            pilot.location_latitude,
            pilot.location_longitude,
        )

        if distance_km > radius_km:
            continue

        pilots_in_radius += 1
        pilot._prefetched_documents = list(pilot.documents.all())
        if not pilot_is_operational(pilot):
            continue
        score = compute_score(pilot, distance_km, radius_km)
        pilots.append((pilot, distance_km, score))

    logger.info(f"Pilots with coordinates: {pilots_with_coords}, in radius: {pilots_in_radius}, operational: {len(pilots)}")

    pilots.sort(key=lambda item: item[2], reverse=True)
    return pilots[: MATCHING_DEFAULTS["invite_count"]]


def send_wave(job: "Job", wave: int, actor=None) -> List["JobOffer"]:
    """Genera invitaciones para una ola específica."""
    logger.info(f"Sending invite wave {wave} for job {job.id} (property: {job.property.name})")

    if wave > MATCHING_DEFAULTS["max_waves"]:
        logger.warning(f"Wave {wave} exceeds max waves {MATCHING_DEFAULTS['max_waves']}")
        return []

    JobOffer = apps.get_model("properties", "JobOffer")
    job.expire_pending_offers(auto=False)
    candidates = shortlist_pilots(job, wave)
    logger.info(f"Found {len(candidates)} pilot candidates for job {job.id}")

    if not candidates:
        logger.warning(f"No pilot candidates found for job {job.id}")
        return []

    offers = []
    now = timezone.now()
    expires = now + timedelta(seconds=MATCHING_DEFAULTS["ttl_seconds"])
    for pilot, distance_km, score in candidates:
        offer, created = JobOffer.objects.get_or_create(
            job=job,
            pilot=pilot,
            defaults={
                "wave": wave,
                "score": score,
                "radius_km": distance_km,
                "ttl_seconds": MATCHING_DEFAULTS["ttl_seconds"],
                "expires_at": expires,
                "metadata": {"wave": wave, "distance_km": distance_km},
            },
        )
        if created:
            offers.append(offer)

    if offers:
        job.invite_wave = wave
        job.status = "inviting"
        job.last_status_change_at = now
        job.save(update_fields=["invite_wave", "status", "last_status_change_at", "updated_at"])
        job.property.transition_to("inviting", actor=actor, metadata={"wave": wave}, commit=True)
        JobTimelineEvent = apps.get_model("properties", "JobTimelineEvent")
        JobTimelineEvent.objects.create(
            job=job,
            kind=f"invite_wave_{wave}",
            message=f"Ola {wave} enviada a {len(offers)} pilotos",
            metadata={
                "wave": wave,
                "offer_ids": [offer.id for offer in offers],
            },
            actor=getattr(actor, "user", actor),
        )

        # Enviar notificaciones push a los pilotos
        if offers:
            try:
                notification_service = _get_notification_service()
                notification_service(offers)
            except Exception as notification_error:
                # No bloquear el flujo por fallos de notificaciones
                logger.warning(f"Failed to send notifications for job {job.id}: {notification_error}")

    return offers
