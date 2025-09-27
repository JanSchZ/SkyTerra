import logging
from math import radians, cos, sin, asin, sqrt

from django.conf import settings
from django.utils import timezone

from .plusvalia_factor_registry import get_factors, get_weights, register_factor

from datetime import timedelta

try:
    from .services import GeminiService, GeminiServiceError
except Exception:
    GeminiService = None
    GeminiServiceError = Exception

# Prefer SamService from ai_management for generic text evaluations
try:
    from ai_management.gemini_service import SamService as SkyTerraSamService
    from ai_management.gemini_service import GeminiServiceError as SamServiceError
except Exception:
    SkyTerraSamService = None
    SamServiceError = Exception

try:
    from .external_market_service import ExternalMarketDataService
except Exception:
    ExternalMarketDataService = None

from .models import PropertyVisit

logger = logging.getLogger(__name__)

class PlusvaliaService:
    """Servicio encargado de calcular el puntaje de plusvalía (0-100) de una Property.

    v2: Implementa fórmula basada en bloques P,C,Z,F,L,D con pesos y
    lógica de confianza. Además aplica penalización ambiental menor.
    """

    # Coordenadas aproximadas de Santiago de Chile, referencia para proximidad a grandes centros urbanos
    REFERENCE_LAT = -33.4489
    REFERENCE_LON = -70.6693

    # Pesos base para los bloques (suman 1.0)
    BLOCK_WEIGHTS = {
        "P": 0.30,  # Mercado / precios / tendencia
        "C": 0.20,  # Conectividad y accesibilidad
        "Z": 0.15,  # Zonificación / desarrollo (placeholder MVP)
        "F": 0.15,  # Atributos físicos del predio
        "L": 0.10,  # Liquidez local (proxy sencillo en MVP)
        "D": 0.10,  # Demanda digital (tráfico/visitas)
    }

    # Penalización máxima ambiental (restamos hasta 10 puntos)
    AMBIENTAL_PENALTY_MAX = 10.0

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
        """Solicita a Sam un puntaje 0-100. Si falla, lanza excepción.

        Requisito del negocio: no ocultar errores; no devolver valores neutrales.
        """
        if not SkyTerraSamService:
            raise SamServiceError("SamService no disponible")
        try:
            sam = SkyTerraSamService()
            prompt = (
                "Eres un modelo que evalúa el potencial de plusvalía de propiedades rurales. "
                "Responde SOLO con un número entero entre 0 y 100 (sin texto extra).\n\n"
                f"Nombre: {property.name}\n"
                f"Tipo: {property.type}\n"
                f"Precio: {property.price}\n"
                f"Tamaño (ha): {property.size}\n"
                f"Tiene agua: {property.has_water}\n"
                f"Tiene vistas: {property.has_views}\n"
                f"Descripción: {property.description[:500]}\n"
                "\nPuntaje (0-100):"
            )
            result = sam.generate_response(prompt, request_type="plusvalia_eval")
            text = (result or {}).get('response', '') if isinstance(result, dict) else str(result)
            import re
            match = re.search(r"\b(\d{1,3})\b", text)
            if not match:
                raise SamServiceError("Respuesta de Sam inválida para plusvalía")
            score = int(match.group(1))
            return max(0, min(100, score))
        except SamServiceError:
            raise
        except Exception as e:
            logger.error(f"Error llamando a SamService para plusvalía: {e}", exc_info=True)
            raise SamServiceError(str(e))

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
    def _price_trend_index(cls, property):
        """Bloque P: índice de precios/tendencia (0-100) y su confianza (0-1).

        Combina:
        - Valor relativo vs estimado de mercado (50%)
        - Tasa de apreciación histórica 3y (30%)
        - Precio por hectárea normalizado (20%)
        """
        svc = ExternalMarketDataService() if ExternalMarketDataService else None
        # Valor de mercado y apreciación
        est_value = None
        appr_rate = None
        try:
            if svc and property.latitude is not None and property.longitude is not None:
                est_value = svc.get_market_estimated_value(property.latitude, property.longitude)
                appr_rate = svc.get_historical_appreciation_rate(property.latitude, property.longitude, years=3)
        except Exception as e:
            logger.warning(f"Error obteniendo datos de mercado: {e}")

        # Sub-scores reutilizando las curvas de scoring existentes
        # 1) Relativo precio/mercado
        if est_value is None or est_value == 0:
            score_rel = 50
            conf_rel = 0.3
        else:
            try:
                ratio = float(property.price) / est_value
                if ratio <= 0.8:
                    score_rel = 100
                elif ratio >= 1.5:
                    score_rel = 0
                else:
                    score_rel = max(0, 100 - ((ratio - 0.8) * 100 / (1.5 - 0.8)))
            except Exception:
                score_rel = 50
            conf_rel = 0.9

        # 2) Apreciación histórica
        if appr_rate is None:
            score_app = 50
            conf_app = 0.4
        else:
            if appr_rate <= 0:
                score_app = 0
            elif appr_rate >= 10:
                score_app = 100
            else:
                score_app = appr_rate * 10
            conf_app = 0.9

        # 3) Precio por hectárea
        try:
            score_pph = cls._price_per_hectare_score(property)
            conf_pph = 0.9 if property.size else 0.3
        except Exception:
            score_pph = 50
            conf_pph = 0.3

        score = (0.50 * score_rel) + (0.30 * score_app) + (0.20 * score_pph)
        confidence = max(0.0, min(1.0, (conf_rel * 0.50 + conf_app * 0.30 + conf_pph * 0.20)))
        return score, confidence, {
            "relative_market_price": score_rel,
            "appreciation_rate": score_app,
            "price_per_hectare": score_pph,
        }

    @classmethod
    def _connectivity_index(cls, property):
        """Bloque C: conectividad/accesibilidad (0-100) y confianza.

        Combina proximidad a gran centro urbano (60%), tipo de acceso (25%) y
        disponibilidad de servicios como proxy (15%).
        """
        # Proximidad
        if property.latitude is None or property.longitude is None:
            score_prox = 50
            conf_prox = 0.3
        else:
            dist = cls._haversine(property.latitude, property.longitude, cls.REFERENCE_LAT, cls.REFERENCE_LON)
            if dist <= 50:
                score_prox = 100
            elif dist >= 500:
                score_prox = 0
            else:
                score_prox = max(0, 100 - ((dist - 50) * 100 / (500 - 50)))
            conf_prox = 0.9

        # Acceso
        access_map = {"paved": 100, "unpaved": 60}
        score_access = access_map.get(getattr(property, 'access', 'unpaved'), 60)
        conf_access = 0.8

        # Servicios (proxy de conectividad)
        utilities = getattr(property, 'utilities', []) or []
        has_internet = any(u.lower() in {"internet", "fiber", "fiber_optic", "broadband"} for u in utilities if isinstance(u, str))
        if has_internet:
            score_utils = 100
        elif any(u.lower() in {"electricity", "water"} for u in utilities if isinstance(u, str)):
            score_utils = 70
        else:
            score_utils = 40
        conf_utils = 0.6

        score = (0.60 * score_prox) + (0.25 * score_access) + (0.15 * score_utils)
        confidence = max(0.0, min(1.0, (0.60 * conf_prox + 0.25 * conf_access + 0.15 * conf_utils)))
        return score, confidence, {
            "proximity": score_prox,
            "access": score_access,
            "utilities": score_utils,
        }

    @classmethod
    def _zoning_index(cls, property):
        """Bloque Z: zonificación/desarrollo. MVP: proxy básico.

        Sin datos de planes reguladores aún: usamos un proxy leve basado en
        `legal_status` y `publication_status` para no inflar el peso.
        """
        legal = getattr(property, 'legal_status', 'clear')
        pub = getattr(property, 'publication_status', 'pending')
        base = 80 if legal == 'clear' else 40
        if pub == 'approved':
            base = min(100, base + 10)
        confidence = 0.4  # Declaradamente baja hasta integrar datos reales
        return base, confidence, {"legal_status": legal, "publication_status": pub}

    @classmethod
    def _physical_attributes_index(cls, property):
        """Bloque F: atributos físicos (agua, vistas, tamaño)."""
        water_s = 100 if getattr(property, 'has_water', False) else 0
        views_s = 100 if getattr(property, 'has_views', False) else 0
        try:
            size_s = cls._size_score(property)
        except Exception:
            size_s = 50
        score = 0.40 * water_s + 0.30 * views_s + 0.30 * size_s
        confidence = 0.8 if getattr(property, 'size', None) else 0.6
        return score, confidence, {"water": water_s, "views": views_s, "size": size_s}

    @classmethod
    def _liquidity_index(cls, property):
        """Bloque L: liquidez local. MVP: proxy por días en mercado.

        Nota: Cuando integremos absorción real, reemplazar por métrica robusta.
        """
        from django.utils import timezone
        created = getattr(property, 'created_at', None)
        if not created:
            return 50, 0.3, {"days_on_market": None}
        days = (timezone.now() - created).days
        if days <= 30:
            score_dom = 80
        elif days <= 90:
            score_dom = 60
        elif days <= 180:
            score_dom = 50
        elif days <= 365:
            score_dom = 40
        else:
            score_dom = 35
        confidence = 0.5
        return score_dom, confidence, {"days_on_market": days}

    @classmethod
    def _digital_demand_index(cls, property):
        """Bloque D: demanda digital (visitas relativas 30 días)."""
        score = cls._demand_score(property)
        # Confianza: depende del tamaño de muestra global
        try:
            since = timezone.now() - timedelta(days=30)
            total_visits = PropertyVisit.objects.filter(visited_at__gte=since).count()
            confidence = max(0.3, min(1.0, total_visits / 200.0))
        except Exception:
            confidence = 0.4
        return score, confidence, {"window_days": 30}

    @classmethod
    def _environmental_risk_index(cls, property):
        """Índice ambiental (0-1). MVP: placeholder 0 hasta integrar fuentes.

        En el MVP, si no hay datos, no penalizamos (devuelve 0.0). Cuando se
        integre SENAPRED/otras fuentes, mapear 0-1 y mantener penalización max 10.
        """
        # Placeholder: sin datos → 0 riesgo percibido
        return 0.0

    @classmethod
    def calculate_with_breakdown(cls, property, confidence_threshold: float | None = None):
        """Calcula el score usando la fórmula v2 y devuelve también un desglose.

        confidence_threshold: si la confianza de un bloque es menor al umbral,
        se excluye del promedio y se renormalizan los pesos.
        """
        import decimal
        threshold = confidence_threshold
        if threshold is None:
            try:
                threshold = float(getattr(settings, 'PLUSVALIA_CONFIDENCE_THRESHOLD', 0.4))
            except Exception:
                threshold = 0.4

        # Calcular bloques
        P_s, P_c, P_d = cls._price_trend_index(property)
        C_s, C_c, C_d = cls._connectivity_index(property)
        Z_s, Z_c, Z_d = cls._zoning_index(property)
        F_s, F_c, F_d = cls._physical_attributes_index(property)
        L_s, L_c, L_d = cls._liquidity_index(property)
        D_s, D_c, D_d = cls._digital_demand_index(property)

        blocks = {
            "P": {"score": P_s, "conf": P_c, "weight": cls.BLOCK_WEIGHTS["P"], "details": P_d},
            "C": {"score": C_s, "conf": C_c, "weight": cls.BLOCK_WEIGHTS["C"], "details": C_d},
            "Z": {"score": Z_s, "conf": Z_c, "weight": cls.BLOCK_WEIGHTS["Z"], "details": Z_d},
            "F": {"score": F_s, "conf": F_c, "weight": cls.BLOCK_WEIGHTS["F"], "details": F_d},
            "L": {"score": L_s, "conf": L_c, "weight": cls.BLOCK_WEIGHTS["L"], "details": L_d},
            "D": {"score": D_s, "conf": D_c, "weight": cls.BLOCK_WEIGHTS["D"], "details": D_d},
        }

        # Seleccionar bloques según confianza
        included = {k: v for k, v in blocks.items() if v["conf"] >= threshold}
        if not included:
            included = blocks  # fallback: no excluir nada si todo tiene baja confianza

        # Renormalizar pesos
        total_w = sum(v["weight"] for v in included.values()) or 1.0
        norm_weights = {k: v["weight"] / total_w for k, v in included.items()}

        base_score = 0.0
        contributions = {}
        for k, v in blocks.items():
            nw = norm_weights.get(k, 0.0)
            contrib = v["score"] * nw
            contributions[k] = {
                "included": k in included,
                "score": round(v["score"], 2),
                "confidence": round(v["conf"], 2),
                "weight": v["weight"],
                "normalized_weight": round(nw, 4),
                "contribution": round(contrib, 2),
                "details": v["details"],
            }
            base_score += contrib

        # Integrar IA (15% del total final)
        ai_weight = 0.15
        blocks_weight_share = 1.0 - ai_weight
        try:
            ai_score = cls._ai_score(property)
            ai_info = {"score": ai_score, "weight": ai_weight}
        except SamServiceError as e:
            # Propagar el error hacia arriba: no ocultar fallas de IA
            raise

        combined_score = (blocks_weight_share * base_score) + (ai_weight * ai_score)

        # Penalización ambiental leve
        env_risk = cls._environmental_risk_index(property)  # 0-1
        penalty = cls.AMBIENTAL_PENALTY_MAX * max(0.0, min(1.0, env_risk))
        final_score = max(0.0, min(100.0, combined_score - penalty))

        breakdown = {
            "version": "v2",
            "threshold": threshold,
            "base_score_blocks": round(base_score, 2),
            "ai": ai_info,
            "combined_before_penalty": round(combined_score, 2),
            "final_score": round(final_score, 2),
            "environmental_risk_index": round(env_risk, 3),
            "penalty": round(penalty, 2),
            "weights_normalized": {k: round(v, 4) for k, v in norm_weights.items()},
            "blocks": contributions,
            "excluded_blocks": [k for k in blocks.keys() if k not in included],
        }

        return decimal.Decimal(str(round(final_score, 2))), breakdown

    @classmethod
    def calculate(cls, property):
        """Calcula y devuelve solo el puntaje (Decimal) usando la fórmula v2."""
        score, _ = cls.calculate_with_breakdown(property)
        return score