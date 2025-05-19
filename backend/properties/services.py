import requests
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Custom exception for Gemini Service errors."""
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

class GeminiService:
    def __init__(self, api_key=None):
        self.api_key = api_key or getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if not self.api_key:
            logger.error("[GeminiService] GOOGLE_GEMINI_API_KEY no está configurada.")
            raise GeminiServiceError("API key for Gemini service is not configured.", details="Missing GOOGLE_GEMINI_API_KEY")
        
        # Updated to use v1beta and specific model as in AISearchView
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.api_key}"
        self.DEBUG_MODE = getattr(settings, 'DEBUG', False) # Use Django's DEBUG setting

    def _log_debug(self, message, data=None):
        if self.DEBUG_MODE:
            log_message = f"[GeminiService DEBUG] {message}"
            if data:
                # Limit data size for logging to avoid overly verbose logs
                log_message += f": {json.dumps(data, indent=2, ensure_ascii=False)[:1000]}"
                if len(json.dumps(data)) > 1000:
                    log_message += "..."
            logger.debug(log_message)

    def generate_content(self, system_instruction_text, gemini_contents, generation_config, safety_settings):
        payload = {
            "contents": gemini_contents,
            "generationConfig": generation_config,
            "systemInstruction": {"parts": [{"text": system_instruction_text}]},
            "safetySettings": safety_settings
        }
        self._log_debug("Enviando payload a Gemini", payload)

        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        try:
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=45)
            self._log_debug(f"Respuesta HTTP de Gemini: {response.status_code}", {"raw_text": response.text[:500]})
            response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
            
            gemini_data = response.json()

            if not gemini_data.get("candidates") or \
               not gemini_data["candidates"][0].get("content") or \
               not gemini_data["candidates"][0]["content"].get("parts") or \
               not gemini_data["candidates"][0]["content"]["parts"][0].get("text"):
                logger.error("[GeminiService ERROR] Estructura de respuesta de Gemini inesperada.", extra={'gemini_response': gemini_data})
                raise GeminiServiceError("Estructura de respuesta inválida de Gemini API", details=gemini_data)

            json_response_text_from_gemini = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
            self._log_debug("Texto JSON de Gemini (esperado)", {"text": json_response_text_from_gemini[:500]})
            
            try:
                parsed_gemini_response = json.loads(json_response_text_from_gemini)
                return parsed_gemini_response, json_response_text_from_gemini # Return both parsed and raw text for debugging if needed
            except json.JSONDecodeError as e:
                logger.error(f"[GeminiService ERROR] Error al decodificar JSON de Gemini: {e}", extra={'raw_text': json_response_text_from_gemini})
                raise GeminiServiceError("Error al decodificar JSON de la respuesta de Gemini", details=str(e), status_code=500)

        except requests.exceptions.Timeout as e:
            logger.error(f"[GeminiService ERROR] Timeout al llamar a Gemini: {e}")
            raise GeminiServiceError("Timeout al llamar a la API de Gemini (45s)", status_code=504, details=str(e))
        except requests.exceptions.ConnectionError as e:
            logger.error(f"[GeminiService ERROR] Error de conexión con Gemini: {e}")
            raise GeminiServiceError("Error de conexión con la API de Gemini", status_code=503, details=str(e))
        except requests.exceptions.HTTPError as e:
            error_text = e.response.text if hasattr(e.response, 'text') else 'No response text'
            status_code = e.response.status_code if hasattr(e.response, 'status_code') else 500
            logger.error(f"[GeminiService ERROR] HTTPError de Gemini ({status_code}): {e}", extra={'response_text': error_text})
            
            error_detail = f"Error HTTP {status_code} con el servicio Gemini."
            if self.DEBUG_MODE and error_text != 'No response text':
                try:
                    parsed_error = json.loads(error_text)
                    google_error_message = parsed_error.get("error", {}).get("message", "No specific message.")
                    error_detail = f"Gemini Service Error ({status_code}): {google_error_message}"
                except json.JSONDecodeError:
                    error_detail += f" Raw service message: {error_text[:250]}..."
            elif not self.DEBUG_MODE:
                 error_detail = "Ocurrió un error con el servicio de IA."

            raise GeminiServiceError(error_detail, status_code=status_code, details=error_text if self.DEBUG_MODE else "Error details suppressed.")
        except requests.exceptions.RequestException as e:
            logger.error(f"[GeminiService ERROR] Error de solicitud genérico con Gemini: {e}")
            raise GeminiServiceError("Error de solicitud al llamar a la API de Gemini", status_code=503, details=str(e))
        except Exception as e: # Catch-all for unexpected errors within the service
            logger.error(f"[GeminiService ERROR] Error inesperado en GeminiService: {e}", exc_info=True)
            raise GeminiServiceError("Error inesperado en el servicio Gemini.", details=str(e)) 