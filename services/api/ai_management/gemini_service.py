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
        # Cache basic model lookup to minimize DB hits
        self._cached_models = None
        
    def _extract_user_text(self, candidate, prefer_json=False):
        """Extract the user-facing text from a Gemini candidate.
        - If prefer_json=True, try to return the part that looks like JSON (used for tool-like outputs).
        - Otherwise, pick the most likely final user message, avoiding chain-of-thought style text.
        """
        try:
            parts = (candidate or {}).get('content', {}).get('parts', []) or []
            texts = []
            for part in parts:
                t = part.get('text') if isinstance(part, dict) else None
                if isinstance(t, str) and t.strip():
                    texts.append(t.strip())

            if not texts:
                return ''

            def looks_like_json(s: str) -> bool:
                s2 = s.strip()
                # Handle fenced blocks: ```json ... ``` or ``` ... ```
                if s2.startswith('```') and s2.endswith('```'):
                    inner = s2.strip('`').strip()
                    # drop potential language hint at start (e.g., json)
                    inner = inner.split('\n', 1)[-1] if '\n' in inner else inner
                    s2 = inner.strip()
                # Basic JSON detection
                return (s2.startswith('{') and s2.endswith('}')) or (s2.startswith('[') and s2.endswith(']'))

            if prefer_json:
                for s in texts:
                    if looks_like_json(s):
                        return s
                # fallback: pick the latest part that contains braces
                for s in reversed(texts):
                    if '{' in s and '}' in s:
                        return s

            # Avoid exposing deliberate/thinking content; prefer later parts
            cot_markers = (
                'razonamiento', 'pensamiento', 'chain of thought', 'rationale',
                '<thinking', 'thinking:', 'analysis:', 'plan:'
            )
            for s in reversed(texts):
                s_l = s.lower().strip()
                if not any(m in s_l[:64] for m in cot_markers):
                    return s

            # If everything looks like analysis, return the last part
            return texts[-1]
        except Exception:
            # Conservative fallback: best-effort extraction
            try:
                return candidate['content']['parts'][-1]['text']
            except Exception:
                return ''

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
        # Ensure api_name defaults to Gemini 2.5 Flash-Lite if missing
        if not getattr(self.sam_config.current_model, 'api_name', None):
            self.sam_config.current_model.api_name = 'gemini-2.5-flash-lite'
            try:
                self.sam_config.current_model.save(update_fields=['api_name'])
            except Exception:
                pass
        return self.sam_config.current_model

    # -----------------------------
    # Model router helpers
    # -----------------------------
    def _list_active_models(self):
        if self._cached_models is None:
            try:
                self._cached_models = list(AIModel.objects.filter(is_active=True))
            except Exception:
                self._cached_models = []
        return self._cached_models

    def _find_model_by_keyword(self, keyword_candidates):
        """Find first active 2.5 model whose api_name contains any keyword (case-insensitive)."""
        api_candidates = [k.lower() for k in (keyword_candidates if isinstance(keyword_candidates, (list, tuple)) else [keyword_candidates])]
        # Prefer 2.5 family strictly
        for m in self._list_active_models():
            api = (m.api_name or '').lower()
            if '2.5' in api and any(k in api for k in api_candidates):
                return m
        return None

    def _get_router_model(self):
        """Use a fastest 2.5 model for routing (flash-lite > flash). Fallback to current."""
        return self._find_model_by_keyword(['flash-lite', 'lite']) or self._find_model_by_keyword(['flash']) or self._get_current_model()

    def _pick_target_model(self, route_label):
        """Map route label to best available model among active ones."""
        label = (route_label or '').lower()
        if label in ('pro', 'reasoning', 'deep', 'complex'):
            return self._find_model_by_keyword(['pro']) or self._get_current_model()
        if label in ('lite', 'cheap', 'fastest'):
            return self._find_model_by_keyword(['flash-lite', 'lite']) or self._find_model_by_keyword(['flash']) or self._get_current_model()
        # default: 2.5 flash
        return self._find_model_by_keyword(['flash']) or self._get_current_model()

    def _simple_request(self, model, messages, request_type="chat", user=None):
        """Send a minimal request to a specific model. Returns text and usage info."""
        url = self.base_url.format(model=model.api_name)
        request_data = {
            "contents": messages,
            "generationConfig": {
                "temperature": min(max(self.sam_config.response_temperature, 0.0), 1.5),
                "maxOutputTokens": model.max_tokens,
                "topK": 40,
                "topP": 0.95,
            }
        }
        # Older Gemini APIs accepted an explicit "thinking" flag. The v1beta endpoint
        # backing Gemini 2.5 models rejects it, so avoid sending the key altogether.

        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}

        start_time = time.time()
        response = requests.post(url, json=request_data, headers=headers, params=params, timeout=18)
        response_time_ms = int((time.time() - start_time) * 1000)

        if response.status_code != 200:
            error_msg = f"Error HTTP {response.status_code}: {response.text}"
            self._log_usage(model, 0, 0, 0, response_time_ms, False, error_msg, request_type, user)
            raise GeminiServiceError(error_msg, response.status_code, response.text)

        data = response.json()
        if not data.get('candidates'):
            error_msg = f"Formato de respuesta inesperado: {data}"
            self._log_usage(model, 0, 0, 0, response_time_ms, False, error_msg, request_type, user)
            raise GeminiServiceError(error_msg)
        # Prefer JSON-like output for router/search/classification tasks
        prefer_json = str(request_type).lower() in {
            'router', 'search', 'ai_property_search', 'ai_property_classification'
        }
        text = self._extract_user_text(data['candidates'][0], prefer_json=prefer_json)

        # Estimate and log
        tokens_input = int(self._estimate_tokens(' '.join([p['parts'][0]['text'] for p in messages if p.get('parts')])))
        tokens_output = int(self._estimate_tokens(text))
        cost = self._calculate_cost(model, tokens_input, tokens_output)
        self._log_usage(model, tokens_input, tokens_output, cost, response_time_ms, True, request_type=request_type, user=user)
        return text, {
            'model_used': model.name,
            'tokens_input': tokens_input,
            'tokens_output': tokens_output,
            'cost': cost,
            'response_time_ms': response_time_ms,
        }

    def _route_model(self, user_message, request_type="chat"):
        """Classify task complexity using a fast router model and return target model instance."""
        router_model = self._get_router_model()
        system = (
            "Eres un enrutador de modelos. Clasifica la petición en JSON: {\n"
            "  \"route\": \"lite|flash|pro\",\n"
            "  \"reason\": \"breve\",\n"
            "  \"complexity\": \"low|medium|high\"\n}"
            "Criterios: low=saludo/pregunta breve; medium=resumen simple, extracción ligera; high=razonamiento, instrucciones largas, datos múltiples o alta precisión."
        )
        messages = [
            {"role": "user", "parts": [{"text": system}]},
            {"role": "user", "parts": [{"text": f"Tarea ({request_type}): {user_message}"}]},
        ]
        try:
            text, _ = self._simple_request(router_model, messages, request_type="router")
            # Expect strict JSON; if parse fails, default to flash (no heuristics)
            obj = json.loads(text.strip().strip('`'))
            route = (obj.get('route') or 'flash').lower()
            return self._pick_target_model(route)
        except Exception:
            # conservative fallback
            return self._get_current_model()
    
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
- No muestres tu razonamiento ni pensamientos internos; entrega solo la respuesta final dirigida al usuario
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
                    'type': getattr(prop, 'type', None),
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
        """Generate response using Sam configuration with dynamic model routing"""
        if not self.sam_config.is_enabled:
            raise GeminiServiceError("Sam está deshabilitado actualmente")
        
        # Select target model via router (fast classification)
        user_message_clean = (user_message or "").strip()

        model = self._route_model(user_message_clean, request_type=request_type)
        system_prompt = self._get_system_prompt()
        
        # Build conversation
        messages = [{"role": "user", "parts": [{"text": system_prompt}]}]

        # Add conversation history if provided
        if conversation_history:
            configured_history = getattr(self.sam_config, 'max_history_messages', None)
            try:
                configured_history = int(configured_history)
            except (TypeError, ValueError):
                configured_history = None

            if not configured_history or configured_history <= 0:
                # Si la configuración está vacía o se estableció en 0/negativo por error,
                # mantenemos al menos un pequeño historial para preservar el contexto.
                configured_history = 10

            trimmed_history = conversation_history[-configured_history:]
            for msg in trimmed_history:
                content = (msg.get("content") or "").strip()
                if not content:
                    continue
                role = (msg.get("role") or "user").lower()
                if role in ("assistant", "sam", "bot", "model"):
                    role = "model"
                elif role != "user":
                    role = "user"
                # Gemini expects model replies to arrive as role="model", so normalise stored history.
                messages.append({"role": role, "parts": [{"text": content}]})

        # Add current user message
        messages.append({"role": "user", "parts": [{"text": user_message_clean}]})
        
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
        
        # Legacy "thinking" flag removed because Gemini 2.5 rejects it; rely on defaults.
        
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
                logger.info(f"[SamService] Enviando solicitud a {model.name}, intento {attempt + 1}/{self.max_retries}")
                
                response = requests.post(url, json=request_data, headers=headers, params=params, timeout=30)
                response_time_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extract the text response
                    if 'candidates' in response_data and response_data['candidates']:
                        candidate = response_data['candidates'][0]
                        if 'content' in candidate and 'parts' in candidate['content']:
                            # Prefer JSON for search/classification; otherwise user-facing chat text
                            prefer_json = str(request_type).lower() in {
                                'search', 'ai_property_search', 'ai_property_classification'
                            }
                            generated_text = self._extract_user_text(candidate, prefer_json=prefer_json)
                            
                            # Estimate tokens and calculate cost
                            tokens_input = self._estimate_tokens(system_prompt + user_message_clean)
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
                                'model_used': model.name,
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
