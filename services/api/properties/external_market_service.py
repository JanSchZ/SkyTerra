import logging
import os
from typing import Optional

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

class ExternalMarketDataServiceError(Exception):
    pass

class ExternalMarketDataService:
    """Wrapper para servicios externos de datos de mercado inmobiliario.
    Busca obtener valoraciones automáticas (AVM) y tasas de apreciación histórica.
    Actualmente implementa un stub para Clear Capital Property Valuation API.
    Requiere configurar CLEARCAPITAL_API_KEY en variables de entorno.
    """

    CLEARCAPITAL_BASE_URL = "https://api.clearcapital.com/v4/valuation"  # Ejemplo, puede cambiar

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("CLEARCAPITAL_API_KEY")
        if not self.api_key:
            logger.warning("ExternalMarketDataService: CLEARCAPITAL_API_KEY no configurada. Se usarán valores por defecto.")

    # ------------------------------------------------------------------
    # API methods
    # ------------------------------------------------------------------

    def _call_clearcapital(self, endpoint: str, params: dict) -> Optional[dict]:
        if not self.api_key:
            return None
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            response = requests.get(
                f"{self.CLEARCAPITAL_BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
                timeout=5,
            )
            if response.status_code != 200:
                logger.warning(f"ClearCapital API error {response.status_code}: {response.text[:200]}")
                return None
            return response.json()
        except Exception as e:
            logger.error(f"Error calling ClearCapital API: {e}")
            return None

    # Public helpers ----------------------------------------------------

    def get_market_estimated_value(self, latitude: float, longitude: float) -> Optional[float]:
        """Devuelve un valor estimado de mercado en USD para la ubicación dada."""
        if latitude is None or longitude is None:
            return None
        cache_key = f"ext:clearcapital:avm:{latitude}:{longitude}"
        data = cache.get(cache_key)
        if data is None:
            data = self._call_clearcapital("avm", {"lat": latitude, "lon": longitude})
            if data is not None:
                cache.set(cache_key, data, timeout=60 * 60 * 24)  # 24h
        if data and "estimated_value" in data:
            return float(data["estimated_value"])
        return None

    def get_historical_appreciation_rate(self, latitude: float, longitude: float, years: int = 3) -> Optional[float]:
        """Devuelve la tasa anual compuesta de apreciación (%) para los últimos N años en la zona."""
        cache_key = f"ext:clearcapital:appreciation:{latitude}:{longitude}:{years}"
        data = cache.get(cache_key)
        if data is None:
            data = self._call_clearcapital("appreciation", {"lat": latitude, "lon": longitude, "years": years})
            if data is not None:
                cache.set(cache_key, data, timeout=60 * 60 * 24)  # 24h
        if data and "annual_appreciation" in data:
            return float(data["annual_appreciation"])
        return None 