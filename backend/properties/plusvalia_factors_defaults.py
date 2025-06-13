from math import radians, cos, sin, asin, sqrt
from datetime import timedelta
import logging

from django.utils import timezone

from .plusvalia_factor_registry import register_factor
from .external_market_service import ExternalMarketDataService
from .models import PropertyVisit

logger = logging.getLogger(__name__)

# Helpers ---------------------------------------------------------

def _haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371
    return c * r

# Factor definitions ---------------------------------------------

@register_factor("relative_market_price", 0.15)
def relative_market_price(property):
    svc = ExternalMarketDataService()
    est_value = svc.get_market_estimated_value(property.latitude, property.longitude)
    if not est_value:
        return 50
    ratio = float(property.price) / est_value
    if ratio <= 0.8:
        return 100
    if ratio >= 1.5:
        return 0
    return max(0, 100 - ((ratio - 0.8) * 100 / (1.5 - 0.8)))

@register_factor("appreciation_rate", 0.12)
def appreciation_rate(property):
    svc = ExternalMarketDataService()
    rate = svc.get_historical_appreciation_rate(property.latitude, property.longitude, years=3)
    if rate is None:
        return 50
    if rate >= 10:
        return 100
    if rate <= 0:
        return 0
    return rate * 10

@register_factor("demand", 0.10)
def demand(property):
    since = timezone.now() - timedelta(days=30)
    prop_visits = PropertyVisit.objects.filter(property=property, visited_at__gte=since).count()
    total_visits = PropertyVisit.objects.filter(visited_at__gte=since).count()
    prop_count = property.__class__.objects.count() or 1
    avg = total_visits / prop_count
    if avg == 0:
        return 50
    ratio = prop_visits / avg
    if ratio >= 2:
        return 100
    return max(0, min(100, ratio * 50))

@register_factor("price_per_hectare", 0.08)
def price_per_hectare(property):
    if not property.size:
        return 0
    pph = float(property.price) / property.size
    if pph <= 1000:
        return 100
    if pph >= 20000:
        return 0
    return max(0, 100 - ((pph - 1000) * 100 / (20000 - 1000)))

@register_factor("water", 0.08)
def water(property):
    return 100 if property.has_water else 0

@register_factor("views", 0.08)
def views(property):
    return 100 if property.has_views else 0

@register_factor("size", 0.08)
def size(property):
    if not property.size:
        return 0
    if property.size >= 500:
        return 100
    if property.size <= 10:
        return 0
    return (property.size - 10) * 100 / (500 - 10)

@register_factor("proximity_santiago", 0.08)
def proximity(property):
    if property.latitude is None or property.longitude is None:
        return 50
    dist = _haversine(property.latitude, property.longitude, -33.4489, -70.6693)
    if dist <= 50:
        return 100
    if dist >= 500:
        return 0
    return max(0, 100 - ((dist - 50) * 100 / (500 - 50)))

@register_factor("listing_type", 0.04)
def listing_type(property):
    return {"sale": 100, "both": 50, "rent": 0}.get(property.listing_type, 50)

@register_factor("publication_status", 0.07)
def publication_status(property):
    return 100 if property.publication_status == "approved" else 0 