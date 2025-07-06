import requests
from django.conf import settings
import json
import logging
import time
import random
from django.db.models import Q
from .models import SamConfiguration, AIModel, AIUsageLog
from properties.models import Property

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Custom exception for Gemini Service errors."""
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

class SamService:
    """Enhanced Gemini service that uses Sam configuration"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if not self.api_key:
            logger.error("[SamService] GOOGLE_GEMINI_API_KEY no está configurada.")
            raise GeminiServiceError("API key for Gemini service is not configured.", 
                                   details="Verifique la configuración de GOOGLE_GEMINI_API_KEY en el archivo .env")
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        self.max_retries = 3
        self.retry_delay = 2  # segundos
        
        # Get Sam configuration
        self.sam_config = SamConfiguration.get_config()
        
    def _get_current_model(self):
        """Get the currently configured model for Sam"""
        if not self.sam_config.current_model:
            # Fallback to first active model
            try:
                fallback_model = AIModel.objects.filter(is_active=True).first()
                if fallback_model:
                    self.sam_config.current_model = fallback_model
                    self.sam_config.save()
                else:
                    raise GeminiServiceError("No hay modelos activos configurados")
            except Exception as e:
                logger.error(f"Error getting fallback model: {e}")
                raise GeminiServiceError("No se pudo obtener un modelo activo")
        
        return self.sam_config.current_model
    
    def _get_system_prompt(self):
        """Get the system prompt for Sam"""
        base_prompt = self.sam_config.custom_instructions or "Eres Sam, el asistente de IA de SkyTerra. Ayudas a los usuarios a encontrar propiedades y responder preguntas sobre bienes raíces."
        
        # Add property context
        property_context = self._get_property_context()
        
        return f"""{base_prompt}

Contexto de propiedades disponibles:
{property_context}

Instrucciones específicas:
- Siempre responde en español
- Sé útil y profesional
- Proporciona información específica sobre propiedades cuando sea posible
- Si no encuentras propiedades que coincidan con los criterios, sugiere alternativas
- Mantén las respuestas concisas pero informativas
"""
    
    def _get_property_context(self):
        """Get property information for context"""
        try:
            properties = Property.objects.all()[:20]  # Limit to 20 properties
            
            if not properties.exists():
                return "No hay propiedades disponibles en la base de datos actualmente."
            
            property_list = []
            for prop in properties:
                property_info = {
                    'id': prop.id,
                    'name': prop.name,
                    'type': prop.get_type_display(),
                    'price': float(prop.price),
                    'size': prop.size,
                    'has_water': prop.has_water,
                    'has_views': prop.has_views,
                    'description': prop.description[:100] + "..." if len(prop.description) > 100 else prop.description,
                    'location': f"Lat: {prop.latitude}, Lng: {prop.longitude}" if prop.latitude and prop.longitude else "Ubicación no especificada"
                }
                property_list.append(property_info)
            
            return json.dumps(property_list, indent=2)
        except Exception as e:
            logger.error(f"Error obteniendo contexto de propiedades: {e}")
            return "Error al obtener información de propiedades."
    
    def _log_usage(self, model, tokens_input, tokens_output, cost, response_time_ms, success=True, error_message="", request_type="chat", user=None):
        """Log AI usage for monitoring"""
        try:
            AIUsageLog.objects.create(
                user=user,
                model_used=model,
                request_type=request_type,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                cost=cost,
                response_time_ms=response_time_ms,
                success=success,
                error_message=error_message
            )
        except Exception as e:
            logger.error(f"Error logging usage: {e}")
    
    def _estimate_tokens(self, text):
        """Estimate token count (rough approximation)"""
        return len(text.split()) * 1.3  # Rough estimation
    
    def _calculate_cost(self, model, tokens_input, tokens_output):
        """Calculate the cost of the request"""
        cost_input = (tokens_input / 1000) * float(model.price_per_1k_tokens_input)
        cost_output = (tokens_output / 1000) * float(model.price_per_1k_tokens_output)
        return cost_input + cost_output
    
    def generate_response(self, user_message, user=None, conversation_history=None, request_type="chat"):
        """Generate response using Sam configuration"""
        if not self.sam_config.is_enabled:
            raise GeminiServiceError("Sam está deshabilitado actualmente")
        
        model = self._get_current_model()
        system_prompt = self._get_system_prompt()
        
        # Build conversation
        messages = [{"role": "user", "parts": [{"text": system_prompt}]}]
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-self.sam_config.max_conversation_history:]:
                messages.append({"role": msg.get("role", "user"), "parts": [{"text": msg.get("content", "")}]})
        
        # Add current user message
        messages.append({"role": "user", "parts": [{"text": user_message}]})
        
        # Prepare the request
        url = self.base_url.format(model=model.api_name)
        
        request_data = {
            "contents": messages,
            "generationConfig": {
                "temperature": self.sam_config.response_temperature,
                "maxOutputTokens": model.max_tokens,
                "topK": 40,
                "topP": 0.95,
            }
        }
        
        # Add thinking config if supported
        if model.supports_thinking:
            request_data["generationConfig"]["thinking"] = True
        
        headers = {
            "Content-Type": "application/json",
        }
        
        params = {
            "key": self.api_key
        }
        
        start_time = time.time()
        
        # Make the request with retries
        for attempt in range(self.max_retries):
            try:
                logger.info(f"[SamService] Enviando solicitud a {model.get_name_display()}, intento {attempt + 1}/{self.max_retries}")
                
                response = requests.post(url, json=request_data, headers=headers, params=params, timeout=30)
                response_time_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extract the text response
                    if 'candidates' in response_data and response_data['candidates']:
                        candidate = response_data['candidates'][0]
                        if 'content' in candidate and 'parts' in candidate['content']:
                            generated_text = candidate['content']['parts'][0]['text']
                            
                            # Estimate tokens and calculate cost
                            tokens_input = self._estimate_tokens(system_prompt + user_message)
                            tokens_output = self._estimate_tokens(generated_text)
                            cost = self._calculate_cost(model, tokens_input, tokens_output)
                            
                            # Log usage
                            self._log_usage(
                                model=model,
                                tokens_input=int(tokens_input),
                                tokens_output=int(tokens_output),
                                cost=cost,
                                response_time_ms=response_time_ms,
                                success=True,
                                request_type=request_type,
                                user=user
                            )
                            
                            logger.info(f"[SamService] Respuesta generada exitosamente. Tokens: {int(tokens_input)}/{int(tokens_output)}, Costo: ${cost:.6f}")
                            
                            return {
                                'response': generated_text,
                                'model_used': model.get_name_display(),
                                'tokens_input': int(tokens_input),
                                'tokens_output': int(tokens_output),
                                'cost': cost,
                                'response_time_ms': response_time_ms
                            }
                    
                    # If we get here, the response format was unexpected
                    error_msg = f"Formato de respuesta inesperado: {response_data}"
                    self._log_usage(model, 0, 0, 0, response_time_ms, False, error_msg, request_type, user)
                    raise GeminiServiceError(error_msg, response.status_code, response_data)
                
                else:
                    error_msg = f"Error HTTP {response.status_code}: {response.text}"
                    self._log_usage(model, 0, 0, 0, response_time_ms, False, error_msg, request_type, user)
                    
                    if response.status_code == 429:  # Rate limit
                        if attempt < self.max_retries - 1:
                            wait_time = self.retry_delay * (2 ** attempt) + random.uniform(0, 1)
                            logger.warning(f"[SamService] Rate limit alcanzado, esperando {wait_time:.2f} segundos...")
                            time.sleep(wait_time)
                            continue
                    
                    raise GeminiServiceError(error_msg, response.status_code, response.text)
                    
            except requests.exceptions.RequestException as e:
                response_time_ms = int((time.time() - start_time) * 1000)
                error_msg = f"Error de conexión: {str(e)}"
                self._log_usage(model, 0, 0, 0, response_time_ms, False, error_msg, request_type, user)
                
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.warning(f"[SamService] Error de conexión, reintentando en {wait_time} segundos...")
                    time.sleep(wait_time)
                    continue
                
                raise GeminiServiceError(error_msg, details=str(e))
        
        # If we get here, all retries failed
        final_error = f"Falló después de {self.max_retries} intentos"
        logger.error(f"[SamService] {final_error}")
        raise GeminiServiceError(final_error)
    
    def search_properties(self, user_message, filters=None, user=None):
        """Search for properties using Sam"""
        search_prompt = f"""
        El usuario está buscando propiedades con estos criterios: {user_message}
        
        Filtros adicionales: {json.dumps(filters) if filters else 'Ninguno'}
        
        Por favor, ayuda al usuario a encontrar propiedades que coincidan con sus criterios.
        Si encuentras propiedades relevantes, menciona sus IDs para que el usuario pueda verlas en detalle.
        """
        
        return self.generate_response(search_prompt, user=user, request_type="search")