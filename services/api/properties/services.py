import json
import logging
import re
import time
import random

from django.conf import settings
from django.db.models import Q

from .models import Property

# Prefer centralized SamService for AI interactions and usage logging
try:
    from ai_management.gemini_service import SamService as SkyTerraSamService
    from ai_management.gemini_service import GeminiServiceError as SamServiceError
except Exception:
    SkyTerraSamService = None
    class SamServiceError(Exception):
        pass

logger = logging.getLogger(__name__)

class GeminiServiceError(Exception):
    """Custom exception for Gemini Service errors."""
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

class GeminiService:
    def __init__(self, api_key=None):
        # Mantener compatibilidad, pero usar SamService si está disponible
        self.api_key = api_key or getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if not self.api_key:
            logger.error("[GeminiService] GOOGLE_GEMINI_API_KEY no está configurada.")
            raise GeminiServiceError("API key for Gemini service is not configured.", details="Verifique la configuración de GOOGLE_GEMINI_API_KEY en el archivo .env")

        self.max_retries = 3
        self.retry_delay = 2  # segundos
        # No instanciar SamService aquí para evitar fallar temprano por falta de API key u otros
        self._sam_class = SkyTerraSamService

    def _get_property_context(self):
        """Obtiene información de las propiedades disponibles en la base de datos."""
        try:
            properties = Property.objects.all()[:20]  # Limitar a 20 propiedades para no sobrecargar el prompt
            
            if not properties.exists():
                return "No hay propiedades disponibles en la base de datos actualmente."
            
            property_list = []
            for prop in properties:
                property_info = {
                    'id': prop.id,
                    'name': prop.name,
                    'type': prop.type,
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

    def _search_properties(self, filters):
        """Busca propiedades en base a texto libre (sin filtros rígidos)."""
        try:
            queryset = Property.objects.all()

            # Búsqueda por texto en nombre y descripción (si se entrega)
            search_text = None
            if isinstance(filters, str):
                search_text = filters
            elif isinstance(filters, dict):
                search_text = filters.get('searchText')

            if search_text:
                queryset = queryset.filter(Q(name__icontains=search_text) | Q(description__icontains=search_text))

            return queryset[:10]  # Limitar a 10 resultados
            
        except Exception as e:
            logger.error(f"Error buscando propiedades: {e}")
            return Property.objects.none()

    def _create_enhanced_prompt(self, user_query, conversation_history=None):
        """Crea un prompt mejorado que incluye información de propiedades reales."""
        
        property_context = self._get_property_context()
        
        prompt = f"""
Eres un asistente especializado en propiedades rurales para la plataforma SkyTerra. Tu trabajo es ayudar a los usuarios a encontrar propiedades que se ajusten a sus necesidades.

PROPIEDADES DISPONIBLES EN LA PLATAFORMA:
{property_context}

INSTRUCCIONES:
1. Analiza la consulta del usuario: "{user_query}"
2. Determina el tipo de consulta:
    - Si la consulta es principalmente una ubicación (ej: "Villarrica", "terrenos en Santiago"), devuelve `flyToLocation` (coordenadas, zoom) y usa `search_mode: "location"`.
    - Si la consulta describe características con intención de ver propiedades (ej: "terrenos con agua cerca de Osorno"), genera hasta 5 `recommendations` basadas en el contexto real. Usa `search_mode: "property_recommendation"`.
    - Si la consulta es informativa o conversacional y NO hay intención explícita de ver propiedades, responde conversacionalmente y usa `search_mode: "chat"`.
3. No menciones ni generes filtros ni tipos predefinidos. No hables de "filtros".
4. Para `search_mode: "location"`:
    - Intenta identificar coordenadas (longitud, latitud) y un nivel de zoom adecuado para la ubicación mencionada. `pitch` y `bearing` son opcionales pero buenos si se pueden inferir.
    - No generes `recommendations` si el modo es "location".

FORMATO DE RESPUESTA (JSON):
{{
    "search_mode": "location" | "property_recommendation" | "chat",
    "assistant_message": "Respuesta amigable al usuario explicando tu acción o hallazgos.",
    "flyToLocation": {{ // Poblar solo si search_mode es 'location'. Asegúrate que center sea [longitud, latitud]
        "center": [-71.5, -33.0], // [longitud, latitud]
        "zoom": 10,
        "pitch": 0,  // Opcional, default 0
        "bearing": 0 // Opcional, default 0
    }},
    "suggestedFilters": null,
    "recommendations": [ // Poblar solo si search_mode es 'property_recommendation', máximo 5
        {{
            "id": 1, // ID de la propiedad real del contexto
            "name": "Nombre de la propiedad",
            "price": 120000,
            "size": 43.5,
            "type": "categoria",
            "reason": "Por qué recomiendas esta propiedad, basado en la consulta y los datos de la propiedad."
        }}
    ],
    "interpretation": "Resumen de lo que el usuario está buscando o de la ubicación identificada."
}}

EJEMPLOS DE CONSULTAS Y RESPUESTAS ESPERADAS:
- Usuario: "Busco una granja con agua cerca de Osorno"
  Respuesta (property_recommendation):
  {{
      "search_mode": "property_recommendation",
      "assistant_message": "Encontré algunas granjas con agua cerca de Osorno. Aquí tienes algunas opciones:",
      "flyToLocation": null,
      "suggestedFilters": {{"propertyTypes": ["farm"], "features": ["hasWater"], "priceRange": [null, null], "sizeRange": [null, null]}},
      "recommendations": [ /* ...propiedades de ejemplo... */ ],
      "interpretation": "El usuario busca una granja con agua, posiblemente cerca de Osorno."
  }}
- Usuario: "Muéstrame Villarrica"
  Respuesta (location):
  {{
      "search_mode": "location",
      "assistant_message": "Claro, llevándote a Villarrica.",
      "flyToLocation": {{"center": [-72.2297, -39.2839], "zoom": 12, "pitch": 0, "bearing": 0}},
      "suggestedFilters": null,
      "recommendations": [],
      "interpretation": "El usuario quiere ver la ubicación de Villarrica."
  }}
- Usuario: "Terrenos en la Patagonia con bosque nativo y buen precio"
  Respuesta (property_recommendation):
  {{
      "search_mode": "property_recommendation",
      "assistant_message": "Encontré estos terrenos en la Patagonia con bosque nativo que podrían interesarte:",
      "flyToLocation": null,
      "suggestedFilters": {{"features": ["hasForest"], "priceRange": [null, 100000] /* Asumiendo 'buen precio' como <100k */}},
      "recommendations": [ /* ...propiedades de ejemplo... */ ],
      "interpretation": "El usuario busca terrenos en la Patagonia con bosque nativo y un precio accesible."
  }}

Consulta del usuario: "{user_query}"

Responde SOLO con el JSON, sin texto adicional. Asegúrate que `flyToLocation.center` sea `[longitud, latitud]`.
"""
        
        return prompt

    def search_properties_with_ai(self, user_query, conversation_history=None):
        """Busca propiedades usando IA y datos reales de la base de datos."""

        for attempt in range(self.max_retries):
            try:
                logger.info(f"[GeminiService] Intento {attempt + 1} - Buscando propiedades para: '{user_query}'")

                # Crear prompt mejorado con contexto de propiedades reales
                prompt = self._create_enhanced_prompt(user_query, conversation_history)

                if not self._sam_class:
                    raise GeminiServiceError("SamService no disponible en este entorno")

                sam_instance = self._sam_class()

                sanitized_history = None
                if isinstance(conversation_history, list):
                    sanitized_history = []
                    for entry in conversation_history:
                        if not isinstance(entry, dict):
                            continue
                        content = (entry.get('content') or '').strip()
                        properties_meta = entry.get('properties')
                        property_summary = ''
                        if isinstance(properties_meta, list) and properties_meta:
                            summary_items = []
                            for prop in properties_meta[:5]:
                                if not isinstance(prop, dict):
                                    continue
                                name = (prop.get('name') or '').strip()
                                identifier = prop.get('id')
                                price = prop.get('price')
                                reason = (prop.get('reason') or '').strip()
                                lat = prop.get('latitude')
                                lng = prop.get('longitude')
                                details_parts = []
                                label = name if name else (f'Propiedad {identifier}' if identifier is not None else '')
                                if label:
                                    details_parts.append(label)
                                if identifier is not None and name:
                                    details_parts.append(f'ID {identifier}')
                                if price not in (None, ''):
                                    try:
                                        value = float(price)
                                        details_parts.append(f'precio aprox. ${value:,.0f}')
                                    except (TypeError, ValueError):
                                        pass
                                if lat is not None and lng is not None:
                                    details_parts.append(f'coords ({lat}, {lng})')
                                if reason:
                                    details_parts.append(reason)
                                if details_parts:
                                    summary_items.append(', '.join(details_parts))
                            if summary_items:
                                property_summary = 'Propiedades sugeridas previamente: ' + '; '.join(summary_items)
                        if property_summary:
                            content = content + '\n\n' + property_summary if content else property_summary
                        if not content:
                            continue
                        role = (entry.get('role') or 'user').lower()
                        if role in ('assistant', 'sam', 'bot', 'model'):
                            role = 'assistant'
                        elif role != 'user':
                            role = 'user'
                        sanitized_history.append({'role': role, 'content': content})
                    if not sanitized_history:
                        sanitized_history = None

                result = sam_instance.generate_response(
                    prompt,
                    conversation_history=sanitized_history,
                    request_type="ai_property_search"
                )
                content = (result or {}).get('response', '') if isinstance(result, dict) else str(result)

                try:
                    # Limpiar posibles bloques de código Markdown (```json ... ```)
                    clean_content = content.strip()
                    if clean_content.startswith('```'):
                        # Remove opening fence and optional language tag
                        clean_content = re.sub(r'^```[a-zA-Z]*\s*', '', clean_content)
                        # Remove trailing fence
                        if clean_content.endswith('```'):
                            clean_content = clean_content[:-3]
                        clean_content = clean_content.strip()

                    # Intentar parsear como JSON
                    ai_response = json.loads(clean_content)

                    # Asegurar que los campos básicos estén presentes
                    ai_response.setdefault('search_mode', 'property_recommendation')  # Default si Gemini no lo incluye
                    ai_response.setdefault('flyToLocation', None)
                    ai_response.setdefault('suggestedFilters', None)
                    ai_response.setdefault('recommendations', [])
                    ai_response.setdefault('assistant_message', "Tu búsqueda ha sido procesada.")
                    ai_response.setdefault('interpretation', user_query)

                    # Heurísticas: consultas conversacionales o informativas (sin intención explícita de listar propiedades)
                    user_text_lc = (user_query or '').lower().strip()
                    conv_cues = [
                        'hola', 'buenas', 'hello', 'hi', 'qué tal', 'que tal', 'hey',
                        'quién eres', 'quien eres', 'qué puedes hacer', 'que puedes hacer',
                        'ayuda', 'help', 'como funcionas', 'cómo funcionas', 'que haces', 'qué haces'
                    ]
                    property_cues = [
                        'propiedad', 'propiedades', 'terreno', 'terrenos', 'granja', 'finca', 'campo',
                        'casa', 'parcela', 'lote', 'rancho', 'ranch', 'farm', 'forest', 'bosque'
                    ]
                    intent_cues = ['muéstrame', 'muestrame', 'mostrar', 'enséñame', 'ensename', 'ver', 'buscar', 'encuéntrame', 'encontrar', 'recomienda', 'recomiéndame', 'sugiéreme', 'sugerir']
                    price_cues = ['precio', 'precios', 'rango', 'presupuesto', 'barato', 'caro', 'cuánto', 'cuanto', 'vale', 'cuesta']
                    question_cues = ['por qué', 'porque', 'por que', 'cómo', 'como', 'qué', 'que']

                    has_property_word = any(cue in user_text_lc for cue in property_cues)
                    has_intent_word = any(cue in user_text_lc for cue in intent_cues)
                    has_digit = any(ch.isdigit() for ch in user_text_lc)
                    asks_info = any(cue in user_text_lc for cue in (price_cues + question_cues))

                    # Intención explícita si hay verbo de acción o suficientes restricciones ligadas a propiedades
                    explicit_property_intent = has_intent_word or (has_property_word and (has_digit or any(w in user_text_lc for w in ['en ', 'cerca', 'zona', 'región', 'region', 'ciudad', 'comuna'])))

                    is_conversational = (any(cue in user_text_lc for cue in conv_cues) or asks_info) and not explicit_property_intent

                    if is_conversational:
                        ai_response['search_mode'] = 'chat'
                        ai_response['flyToLocation'] = None
                        ai_response['suggestedFilters'] = None
                        ai_response['recommendations'] = []
                        if not ai_response.get('assistant_message') or ai_response['assistant_message'] in [
                            'Tu búsqueda ha sido procesada.', 'Búsqueda procesada'
                        ]:
                            ai_response['assistant_message'] = (
                                'Soy Sam, tu asistente IA para explorar ubicaciones y encontrar propiedades. '
                                'Puedes preguntarme por lugares (por ejemplo: "Muéstrame Villarrica"), '
                                'o describir lo que buscas ("granja con agua cerca de Osorno"). '
                                '¿Sobre qué te gustaría que te ayude?'
                            )

                    # Si el modo es "property_recommendation", buscar propiedades reales
                    if ai_response['search_mode'] == 'property_recommendation':
                        # Primera prioridad: intentar enriquecer las recomendaciones sugeridas por la IA si tienen IDs válidos.
                        enriched_recommendations = []
                        valid_rec_ids = []

                        for rec in ai_response.get('recommendations', []):
                            prop_id = rec.get('id')
                            if prop_id and isinstance(prop_id, int):
                                try:
                                    prop = Property.objects.get(id=prop_id)
                                    valid_rec_ids.append(prop_id)
                                    enriched_recommendations.append({
                                        'id': prop.id,
                                        'name': prop.name,
                                        'price': float(prop.price),
                                        'size': prop.size,
                                        'type': prop.type,
                                        'plusvalia_score': float(prop.plusvalia_score) if prop.plusvalia_score is not None else None,
                                        'has_water': prop.has_water,
                                        'has_views': prop.has_views,
                                        'description': prop.description[:100] + "..." if len(prop.description) > 100 else prop.description,
                                        'latitude': prop.latitude,
                                        'longitude': prop.longitude,
                                        'reason': rec.get('reason') or "Recomendado por la IA"
                                    })
                                except Property.DoesNotExist:
                                    # ID no válido, continuar
                                    continue

                        # Si encontramos recomendaciones válidas a partir de la respuesta de la IA, las usamos tal cual
                        if enriched_recommendations:
                            ai_response['recommendations'] = enriched_recommendations
                        else:
                            # Si la IA no proporcionó recomendaciones válidas, construimos una lista basada en los filtros sugeridos (si existen)
                            if ai_response.get('suggestedFilters'):
                                real_properties = self._search_properties({'searchText': user_query})
                            else:
                                # Como último recurso, hacemos una búsqueda básica utilizando el texto del usuario
                                real_properties = self._search_properties({'searchText': user_query})

                            generated_recommendations = []
                            for prop in real_properties:
                                generated_recommendations.append({
                                    'id': prop.id,
                                    'name': prop.name,
                                    'price': float(prop.price),
                                    'size': prop.size,
                                    'type': prop.type,
                                    'plusvalia_score': float(prop.plusvalia_score) if prop.plusvalia_score is not None else None,
                                    'has_water': prop.has_water,
                                    'has_views': prop.has_views,
                                    'description': prop.description[:100] + "..." if len(prop.description) > 100 else prop.description,
                                    'latitude': prop.latitude,
                                    'longitude': prop.longitude,
                                    'reason': "Coincide con los filtros sugeridos."
                                })

                            ai_response['recommendations'] = generated_recommendations

                        # Si el usuario viene de un contexto conversacional (pregunta abierta) invita a clarificar antes de listar muchas
                        user_last = (conversation_history or [])[-1]['content'].lower() if conversation_history else ''
                        followup_phrases = [
                            'qué opinas', 'que opinas', 'te parece', 'cómo lo ves', 'como lo ves',
                            'qué te parece', 'que te parece', 'mis gustos', 'qué recomiendas', 'me conviene'
                        ]
                        if any(p in user_last for p in followup_phrases):
                            ai_response['assistant_message'] = "Entiendo. Antes de sugerir más, ¿qué te importa más: ubicación, agua, vistas o tamaño?"
                            # Fomentar conversación: no repetir mensajes de conteo y reducir resultados
                            ai_response['recommendations'] = ai_response['recommendations'][:2]
                        # Si el usuario hace una pregunta directa (por qué, cómo, etc.), evitar respuestas de conteo
                        question_cues = ['por qué', 'porque', 'por que', 'cómo', 'como', 'qué', 'que']
                        if any(q in user_last for q in question_cues):
                            ai_response['assistant_message'] = ai_response.get('assistant_message') or 'Puedo explicarte en detalle.'
                            # Evitar listas largas y centrarse en explicación
                            ai_response['recommendations'] = ai_response['recommendations'][:1]
                        else:
                            # Ajustar mensaje cuando el generado sea muy genérico
                            generic_msgs = [
                                "Tu búsqueda ha sido procesada.",
                                "Búsqueda procesada",
                            ]
                            if (not enriched_recommendations) or (ai_response.get('assistant_message') in generic_msgs):
                                rec_count = len(ai_response['recommendations'])
                                if rec_count == 0:
                                    ai_response['assistant_message'] = "No encontré coincidencias exactas. ¿Prefieres que priorice precio bajo, ubicación o características como agua/vistas?"
                                else:
                                    # Mensaje más conversacional, sin números
                                    ai_response['assistant_message'] = "Tengo algunas opciones que podrían encajar. Si me indicas presupuesto y zona preferida, afino aún más."

                    elif ai_response['search_mode'] == 'location':
                        # Para modo 'location', nos aseguramos que no haya recomendaciones de propiedades
                        # y que flyToLocation esté presente (aunque el prompt ya lo pide)
                        ai_response['recommendations'] = []
                        ai_response['suggestedFilters'] = None  # No se usan filtros de propiedad
                        if not ai_response.get('flyToLocation'):
                            logger.warning("[GeminiService] search_mode es 'location' pero no se encontró flyToLocation en la respuesta de la IA.")

                    return ai_response

                except json.JSONDecodeError as e:
                    logger.error(f"[GeminiService] Error parseando JSON: {e}")
                    logger.error(f"[GeminiService] Contenido recibido: {content}")

                    # Crear respuesta de fallback con búsqueda básica
                    fallback_filters = self._extract_basic_filters(user_query)
                    real_properties = self._search_properties({'searchText': user_query})

                    fallback_response = {
                        'assistant_message': f"Procesé tu búsqueda y encontré {real_properties.count()} propiedades relacionadas.",
                        'suggestedFilters': None,
                        'recommendations': [
                            {
                                'id': prop.id,
                                'name': prop.name,
                                'price': float(prop.price),
                                'size': prop.size,
                                'type': prop.type,
                                'plusvalia_score': float(prop.plusvalia_score) if prop.plusvalia_score is not None else None,
                                'latitude': prop.latitude,
                                'longitude': prop.longitude,
                                'has_water': prop.has_water,
                                'has_views': prop.has_views,
                                'reason': f"Relacionada con: {user_query}"
                            } for prop in real_properties[:5]
                        ],
                        'interpretation': f"Búsqueda procesada: {user_query}",
                        'fallback': True  # Ensure fallback flag is set for this path too
                    }

                    return fallback_response

            except SamServiceError as e:
                logger.error(f"[GeminiService] SamService error en intento {attempt + 1}: {e}")
                if attempt < self.max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait_time)
                    continue
                return self._create_fallback_response(user_query)
            except Exception as e:
                logger.error(f"[GeminiService] Error inesperado en intento {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    return self._create_fallback_response(user_query)
                time.sleep(self.retry_delay)
                continue

        # Si llegamos aquí, todos los intentos fallaron
        return self._create_fallback_response(user_query)

    def _extract_basic_filters(self, user_query):
        """Extrae filtros básicos de la consulta del usuario sin usar IA."""
        filters = {
            'propertyTypes': [],
            'priceRange': [None, None],
            'features': [],
            'sizeRange': [None, None],
            'searchText': user_query
        }
        
        query_lower = user_query.lower()
        
        # Detectar tipos de propiedad
        if any(word in query_lower for word in ['granja', 'farm']):
            filters['propertyTypes'].append('farm')
        if any(word in query_lower for word in ['rancho', 'ranch']):
            filters['propertyTypes'].append('ranch')
        if any(word in query_lower for word in ['bosque', 'forest']):
            filters['propertyTypes'].append('forest')
        if any(word in query_lower for word in ['lago', 'lake']):
            filters['propertyTypes'].append('lake')
        
        # Detectar características
        if any(word in query_lower for word in ['agua', 'water', 'río', 'river']):
            filters['features'].append('hasWater')
        if any(word in query_lower for word in ['vista', 'views', 'panorámica']):
            filters['features'].append('hasViews')
        
        # Detectar indicadores de precio
        if any(word in query_lower for word in ['barato', 'económico', 'cheap']):
            filters['priceRange'] = [None, 150000]
        elif any(word in query_lower for word in ['caro', 'premium', 'expensive']):
            filters['priceRange'] = [200000, None]
        
        return filters

    def _create_fallback_response(self, user_query):
        """Crea una respuesta de fallback cuando Gemini no está disponible."""
        logger.info(f"[GeminiService] Creando respuesta de fallback para: '{user_query}'")
        
        # Búsqueda simple basada en texto libre
        properties = self._search_properties({'searchText': user_query})
        
        recommendations = []
        for prop in properties[:5]:
            recommendations.append({
                'id': prop.id,
                'name': prop.name,
                'price': float(prop.price),
                'size': prop.size,
                'type': prop.type,
                'plusvalia_score': float(prop.plusvalia_score) if prop.plusvalia_score is not None else None,
                'latitude': prop.latitude, # Add latitude
                'longitude': prop.longitude, # Add longitude
                'has_water': prop.has_water,
                'has_views': prop.has_views,
                'reason': f"Coincide con tu búsqueda: {user_query}"
            })
        
        return {
            'search_mode': 'property_recommendation', # Fallback implies property recommendation
            'assistant_message': f"Encontré {len(recommendations)} propiedades relacionadas con tu búsqueda.",
            'flyToLocation': None,
            'suggestedFilters': None,
            'recommendations': recommendations,
            'interpretation': f"Búsqueda procesada: {user_query}",
            'fallback': True
        } 


# Fallback accesible sin necesidad de instanciar GeminiService (por ejemplo, cuando no hay API key)
def create_fallback_response_simple(user_query: str):
    try:
        qs = Property.objects.all()
        q = (user_query or '').strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
        props = list(qs[:5])
        recs = []
        for prop in props:
            recs.append({
                'id': prop.id,
                'name': prop.name,
                'price': float(prop.price),
                'size': prop.size,
                'type': getattr(prop, 'type', None),
                'plusvalia_score': float(prop.plusvalia_score) if getattr(prop, 'plusvalia_score', None) is not None else None,
                'latitude': getattr(prop, 'latitude', None),
                'longitude': getattr(prop, 'longitude', None),
                'has_water': getattr(prop, 'has_water', False),
                'has_views': getattr(prop, 'has_views', False),
                'reason': f"Coincide con tu búsqueda: {q}" if q else "Propiedad destacada"
            })
        return {
            'search_mode': 'property_recommendation',
            'assistant_message': f"Encontré {len(recs)} propiedades relacionadas con tu búsqueda.",
            'flyToLocation': None,
            'suggestedFilters': None,
            'recommendations': recs,
            'interpretation': f"Búsqueda procesada: {q}" if q else "Búsqueda procesada",
            'fallback': True
        }
    except Exception:
        # En caso de error inesperado, devolver estructura vacía válida
        return {
            'search_mode': 'chat',
            'assistant_message': 'No pude generar sugerencias ahora. Intenta con otra búsqueda.',
            'flyToLocation': None,
            'suggestedFilters': None,
            'recommendations': [],
            'interpretation': 'Búsqueda procesada',
            'fallback': True
        }


# ------------------------------
# Enriquecimiento por IA: Categorizar y resumir propiedades
# ------------------------------

def categorize_property_with_ai(property_instance):
    """Usa Sam para inferir una categoría y un resumen breve para una propiedad.
    Devuelve un dict con posibles claves: ai_category, ai_summary.
    """
    try:
        if SkyTerraSamService is None:
            raise SamServiceError("SamService no disponible")
        sam = SkyTerraSamService()
        prompt = (
            "Clasifica esta propiedad rural en UNA categoría corta y genera un resumen de 1-2 líneas. "
            "Responde SOLO en JSON con claves ai_category y ai_summary.\n\n"
            f"Nombre: {property_instance.name}\n"
            f"Tipo declarado: {property_instance.get_type_display()}\n"
            f"Precio: {float(property_instance.price)}\n"
            f"Tamaño (ha): {property_instance.size}\n"
            f"Agua: {'sí' if property_instance.has_water else 'no'}\n"
            f"Vistas: {'sí' if property_instance.has_views else 'no'}\n"
            f"Coordenadas: {property_instance.latitude}, {property_instance.longitude}\n"
            f"Descripción: {property_instance.description[:600]}\n\n"
            "Ejemplo exacto de salida: {\"ai_category\": \"forest\", \"ai_summary\": \"Campo con bosque nativo cercano a ríos...\"}"
        )
        result = sam.generate_response(prompt, request_type="ai_property_classification")
        text = (result or {}).get('response', '') if isinstance(result, dict) else str(result)
        # Limpia posibles fences
        cleaned = text.strip()
        if cleaned.startswith('```'):
            import re
            cleaned = re.sub(r'^```[a-zA-Z]*\s*', '', cleaned)
            if cleaned.endswith('```'):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        data = json.loads(cleaned)
        return {
            'ai_category': data.get('ai_category'),
            'ai_summary': data.get('ai_summary'),
        }
    except Exception as e:
        logger.error(f"[AI Categorization] Error clasificando propiedad {property_instance.id}: {e}")
        return {}
