import logging
from math import radians, cos, sin, asin, sqrt

from django.conf import settings

from .plusvalia_factor_registry import get_factors, get_weights, register_factor

from datetime import timedelta

try:
    from .services import GeminiService, GeminiServiceError
except Exception:
    GeminiService = None
    GeminiServiceError = Exception

try:
    from .external_market_service import ExternalMarketDataService
except Exception:
    ExternalMarketDataService = None

from .models import PropertyVisit

logger = logging.getLogger(__name__)

class PlusvaliaService:
    """Servicio encargado de calcular el puntaje de plusvalía (0-100) de una Property."""

    # Coordenadas aproximadas de Santiago de Chile, referencia para proximidad a grandes centros urbanos
    REFERENCE_LAT = -33.4489
    REFERENCE_LON = -70.6693

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        """Calcula la distancia en kilómetros entre dos puntos usando la fórmula de Haversine."""
        # convertir de grados a radianes
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        # fórmula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radio de la Tierra en kilómetros
        return c * r

    @classmethod
    def _price_per_hectare_score(cls, property):
        if not property.size or property.size == 0:
            return 0
        pph = float(property.price) / property.size
        # Mejor puntaje a precios más bajos
        if pph <= 1000:
            return 100
        if pph >= 20000:
            return 0
        # Escalado lineal inverso
        return max(0, 100 - ((pph - 1000) * 100 / (20000 - 1000)))

    @classmethod
    def _water_score(cls, property):
        return 100 if property.has_water else 0

    @classmethod
    def _views_score(cls, property):
        return 100 if property.has_views else 0

    @classmethod
    def _size_score(cls, property):
        size = property.size or 0
        if size >= 500:
            return 100
        if size <= 10:
            return 0
        return (size - 10) * 100 / (500 - 10)

    @classmethod
    def _proximity_score(cls, property):
        if property.latitude is None or property.longitude is None:
            return 50  # Puntaje medio si no hay ubicación exacta
        dist = cls._haversine(property.latitude, property.longitude, cls.REFERENCE_LAT, cls.REFERENCE_LON)
        if dist <= 50:
            return 100
        if dist >= 500:
            return 0
        return max(0, 100 - ((dist - 50) * 100 / (500 - 50)))

    @classmethod
    def _listing_type_score(cls, property):
        mapping = {
            'sale': 100,
            'both': 50,
            'rent': 0,
        }
        return mapping.get(property.listing_type, 50)

    @classmethod
    def _publication_status_score(cls, property):
        return 100 if property.publication_status == 'approved' else 0

    # IA evaluation ---------------------------------------------------------
    @classmethod
    def _ai_score(cls, property):
        """Solicita a una IA un puntaje 0-100 basado en los detalles de la propiedad.
        Si falla, retorna 50 como valor neutral."""
        # Deshabilitar IA si no se quiere llamar API en entornos sin clave
        if not GeminiService:
            return 50
        try:
            gemini = GeminiService()
            prompt = (
                "Eres un modelo que evalúa el potencial de plusvalía de propiedades rurales. "
                "A continuación se describe una propiedad. Responde SOLO con un número entero entre 0 y 100 que refleje tu evaluación global.\n\n"
                f"Nombre: {property.name}\n"
                f"Tipo: {property.type}\n"
                f"Precio: {property.price}\n"
                f"Tamaño (ha): {property.size}\n"
                f"Tiene agua: {property.has_water}\n"
                f"Tiene vistas: {property.has_views}\n"
                f"Descripción: {property.description[:500]}\n"
                "\nPuntaje:"
            )
            response = gemini.search_properties_with_ai(prompt)  # Reutilizamos método existente pero esperamos JSON
            # Intentar extraer número
            import re, json as pyjson
            score_match = re.search(r"\b(\d{1,3})\b", response if isinstance(response, str) else pyjson.dumps(response))
            if score_match:
                score = int(score_match.group(1))
                return max(0, min(100, score))
        except GeminiServiceError as ge:
            logger.warning(f"GeminiServiceError evaluando IA plusvalía: {ge}")
        except Exception as e:
            logger.error(f"Error llamando a IA para plusvalía: {e}", exc_info=True)
        return 50  # Valor neutral si falla

    # -------------------- Demanda interna ---------------------
    @classmethod
    def _demand_score(cls, property, lookback_days: int = 30):
        """Calcula un puntaje basado en la cantidad de visitas recientes comparado con la media global."""
        try:
            since = timezone.now() - timedelta(days=lookback_days)
            property_visits = PropertyVisit.objects.filter(property=property, visited_at__gte=since).count()
            avg_visits = PropertyVisit.objects.filter(visited_at__gte=since).count()
            property_count = property.__class__.objects.count()
            avg_per_property = avg_visits / property_count if property_count else 0
            if avg_per_property == 0:
                return 50  # Neutral
            ratio = property_visits / avg_per_property
            # ratio 2x or more -> 100, ratio 0 -> 0
            if ratio >= 2:
                return 100
            return max(0, min(100, ratio * 50))  # linear 0->50 (ratio 1), up to 100
        except Exception as e:
            logger.error(f"Error calculando demand_score: {e}")
            return 50

    # -------------------- Datos mercado externos ---------------
    @classmethod
    def _relative_market_price_score(cls, property):
        svc = ExternalMarketDataService()
        est_value = svc.get_market_estimated_value(property.latitude, property.longitude)
        if est_value is None or est_value == 0:
            return 50
        ratio = float(property.price) / est_value
        # Si la propiedad está <=80% del valor de mercado -> 100; >=150% -> 0
        if ratio <= 0.8:
            return 100
        if ratio >= 1.5:
            return 0
        # score decreases linearly between ratios 0.8 and 1.5
        return max(0, 100 - ((ratio - 0.8) * 100 / (1.5 - 0.8)))

    @classmethod
    def _appreciation_rate_score(cls, property):
        svc = ExternalMarketDataService()
        appr = svc.get_historical_appreciation_rate(property.latitude, property.longitude, years=3)
        if appr is None:
            return 50
        # 0% -> 0, 5% -> 50, 10% -> 100
        if appr <= 0:
            return 0
        if appr >= 10:
            return 100
        return appr * 10

    @classmethod
    def calculate(cls, property):
        """Calcula la puntuación global considerando todos los factores registrados."""
        import decimal
        # Asegurarse de que los factores por defecto estén importados
        try:
            from . import plusvalia_factors_defaults  # noqa: F401
        except ImportError:
            pass

        factors = get_factors()
        weights = get_weights().copy()

        # Peso IA se maneja aparte (ya que depende de PlusvaliaService)
        ai_weight = 0.15
        weights['ai'] = ai_weight

        # Normalizar pesos si la suma != 1.0
        total_weight = sum(weights.values())
        if total_weight == 0:
            logger.error("No hay pesos definidos para calcular plusvalia_score")
            return decimal.Decimal('0')

        norm_weights = {k: v / total_weight for k, v in weights.items()}

        total_score = 0.0
        for name, func in factors.items():
            try:
                score_val = func(property)
            except Exception as e:
                logger.error(f"Factor '{name}' calculó error: {e}")
                score_val = 50  # neutral
            total_score += score_val * norm_weights.get(name, 0)

        # IA
        total_score += cls._ai_score(property) * norm_weights['ai']

        return decimal.Decimal(str(round(total_score, 2))) 