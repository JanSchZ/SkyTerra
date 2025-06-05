import requests
from django.conf import settings
import json
import logging
import time
import random
from django.db.models import Q
from .models import Property

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
            raise GeminiServiceError("API key for Gemini service is not configured.", details="Verifique la configuración de GOOGLE_GEMINI_API_KEY en el archivo .env")
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
        self.max_retries = 3
        self.retry_delay = 2  # segundos

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

    def _search_properties(self, filters):
        """Busca propiedades en la base de datos basado en los filtros."""
        try:
            queryset = Property.objects.all()
            
            # Filtrar por tipo de propiedad
            if filters.get('propertyTypes'):
                type_mapping = {
                    'granja': 'farm',
                    'farm': 'farm',
                    'rancho': 'ranch', 
                    'ranch': 'ranch',
                    'bosque': 'forest',
                    'forest': 'forest',
                    'lago': 'lake',
                    'lake': 'lake'
                }
                
                property_types = []
                for prop_type in filters['propertyTypes']:
                    mapped_type = type_mapping.get(prop_type.lower())
                    if mapped_type:
                        property_types.append(mapped_type)
                
                if property_types:
                    queryset = queryset.filter(type__in=property_types)
            
            # Filtrar por rango de precio
            if filters.get('priceRange') and len(filters['priceRange']) == 2:
                min_price, max_price = filters['priceRange']
                if min_price is not None:
                    queryset = queryset.filter(price__gte=min_price)
                if max_price is not None:
                    queryset = queryset.filter(price__lte=max_price)
            
            # Filtrar por características
            if filters.get('features'):
                for feature in filters['features']:
                    if feature.lower() in ['agua', 'water', 'haswater']:
                        queryset = queryset.filter(has_water=True)
                    elif feature.lower() in ['vistas', 'views', 'hasviews']:
                        queryset = queryset.filter(has_views=True)
            
            # Filtrar por tamaño si se especifica
            if filters.get('sizeRange') and len(filters['sizeRange']) == 2:
                min_size, max_size = filters['sizeRange']
                if min_size is not None:
                    queryset = queryset.filter(size__gte=min_size)
                if max_size is not None:
                    queryset = queryset.filter(size__lte=max_size)
            
            # Búsqueda por texto en nombre y descripción
            if filters.get('searchText'):
                search_text = filters['searchText']
                queryset = queryset.filter(
                    Q(name__icontains=search_text) | 
                    Q(description__icontains=search_text)
                )
            
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
    - Si la consulta es principalmente una ubicación (ej: "Villarrica", "terrenos en Santiago"), enfócate en devolver datos para `flyToLocation` (coordenadas, zoom apropiado) y establece `search_mode: "location"`.
    - Si la consulta describe características de una propiedad (ej: "casa con vista al lago y bosque nativo"), enfócate en generar `suggestedFilters` y hasta 5 `recommendations` a partir del contexto de propiedades proporcionado. Establece `search_mode: "property_recommendation"`.
3. Para `search_mode: "property_recommendation"`:
    - Identifica qué tipo de propiedad busca, rango de precio, características deseadas, etc.
    - Busca en las propiedades disponibles las que mejor coincidan.
    - Proporciona recomendaciones específicas basadas en las propiedades reales.
    - Sugiere filtros apropiados para refinar la búsqueda.
4. Para `search_mode: "location"`:
    - Intenta identificar coordenadas (longitud, latitud) y un nivel de zoom adecuado para la ubicación mencionada. `pitch` y `bearing` son opcionales pero buenos si se pueden inferir.
    - No generes `suggestedFilters` ni `recommendations` si el modo es "location".

FORMATO DE RESPUESTA (JSON):
{{
    "search_mode": "location" | "property_recommendation",
    "assistant_message": "Respuesta amigable al usuario explicando tu acción o hallazgos.",
    "flyToLocation": {{ // Poblar solo si search_mode es 'location'. Asegúrate que center sea [longitud, latitud]
        "center": [-71.5, -33.0], // [longitud, latitud]
        "zoom": 10,
        "pitch": 0,  // Opcional, default 0
        "bearing": 0 // Opcional, default 0
    }},
    "suggestedFilters": {{ // Poblar solo si search_mode es 'property_recommendation'
        "propertyTypes": ["farm", "ranch", "forest", "lake"],
        "priceRange": [null, null], // [min_precio, max_precio] - usa null si no se especifica
        "features": [], // ej: ["hasWater", "hasViews"]
        "sizeRange": [null, null] // [min_hectareas, max_hectareas] - usa null si no se especifica
    }},
    "recommendations": [ // Poblar solo si search_mode es 'property_recommendation', máximo 5
        {{
            "id": 1, // ID de la propiedad real del contexto
            "name": "Nombre de la propiedad",
            "price": 120000,
            "size": 43.5,
            "type": "farm", // Tipo de la propiedad real
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
                
                # Preparar la solicitud a Gemini
                headers = {
                    'Content-Type': 'application/json',
                }
                
                data = {
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.3,  # Menos creatividad, más precisión
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 2048,
                    }
                }
                
                # Realizar la solicitud
                response = requests.post(
                    f"{self.base_url}?key={self.api_key}",
                    headers=headers,
                    json=data,
                    timeout=30
                )
                
                logger.info(f"[GeminiService] Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    response_data = response.json()
                    
                    if 'candidates' in response_data and len(response_data['candidates']) > 0:
                        content = response_data['candidates'][0]['content']['parts'][0]['text']
                        logger.info(f"[GeminiService] Respuesta de Gemini: {content[:200]}...")
                        
                        try:
                            # Intentar parsear como JSON
                            ai_response = json.loads(content)
                            
                            # Asegurar que los campos básicos estén presentes
                            ai_response.setdefault('search_mode', 'property_recommendation') # Default si Gemini no lo incluye
                            ai_response.setdefault('flyToLocation', None)
                            ai_response.setdefault('suggestedFilters', None)
                            ai_response.setdefault('recommendations', [])
                            ai_response.setdefault('assistant_message', "Tu búsqueda ha sido procesada.")
                            ai_response.setdefault('interpretation', user_query)

                            # Si el modo es "property_recommendation", buscar propiedades reales
                            if ai_response['search_mode'] == 'property_recommendation' and ai_response.get('suggestedFilters'):
                                search_filters = ai_response['suggestedFilters'].copy()
                                # Considerar si 'searchText' debe ser parte del filtro o si la IA ya lo usó
                                # search_filters['searchText'] = user_query
                                
                                real_properties = self._search_properties(search_filters)
                                
                                if real_properties.exists():
                                    real_recommendations = []
                                    # Usar las razones de la IA si existen y coinciden los IDs, sino generar una genérica
                                    # Esto es complejo de mapear directamente si la IA inventa IDs.
                                    # Por ahora, simplemente reemplazaremos las recomendaciones.

                                    for prop in real_properties:
                                        real_recommendations.append({
                                            'id': prop.id,
                                            'name': prop.name,
                                            'price': float(prop.price),
                                            'size': prop.size,
                                            'type': prop.get_type_display(), # Usar display name
                                            'has_water': prop.has_water,
                                            'has_views': prop.has_views,
                                            'description': prop.description[:100] + "..." if len(prop.description) > 100 else prop.description,
                                            'latitude': prop.latitude, # Ensure this is being added
                                            'longitude': prop.longitude, # Ensure this is being added
                                            # 'reason': "Coincide con los filtros sugeridos." # Podríamos mejorar esto. If AI gives a reason, we should try to use it.
                                        })
                                    
                                    ai_response['recommendations'] = real_recommendations
                                    # Actualizar mensaje del asistente si se encontraron propiedades
                                    if not ai_response.get('assistant_message') or "Encontré" not in ai_response['assistant_message']:
                                         ai_response['assistant_message'] = f"Encontré {len(real_recommendations)} propiedades que podrían interesarte. {ai_response.get('assistant_message', '')}".strip()

                            elif ai_response['search_mode'] == 'location':
                                # Para modo 'location', nos aseguramos que no haya recomendaciones de propiedades
                                # y que flyToLocation esté presente (aunque el prompt ya lo pide)
                                ai_response['recommendations'] = []
                                ai_response['suggestedFilters'] = None # No se usan filtros de propiedad
                                if not ai_response.get('flyToLocation'):
                                    logger.warning("[GeminiService] search_mode es 'location' pero no se encontró flyToLocation en la respuesta de Gemini.")
                                    # Podríamos intentar un geocoding aquí como fallback si fuera necesario
                            
                            return ai_response
                            
                        except json.JSONDecodeError as e:
                            logger.error(f"[GeminiService] Error parseando JSON: {e}")
                            logger.error(f"[GeminiService] Contenido recibido: {content}")
                            
                            # Crear respuesta de fallback con búsqueda básica
                            fallback_filters = self._extract_basic_filters(user_query)
                            real_properties = self._search_properties(fallback_filters)
                            
                            fallback_response = {
                                'assistant_message': f"Procesé tu búsqueda y encontré {real_properties.count()} propiedades relacionadas.",
                                'suggestedFilters': fallback_filters,
                                'recommendations': [
                                    {
                                        'id': prop.id,
                                        'name': prop.name,
                                        'price': float(prop.price),
                                        'size': prop.size,
                                        'type': prop.get_type_display(), # Use display name for consistency
                                        'latitude': prop.latitude, # Add latitude
                                        'longitude': prop.longitude, # Add longitude
                                        'has_water': prop.has_water, # Add has_water
                                        'has_views': prop.has_views, # Add has_views
                                        'reason': f"Relacionada con: {user_query}"
                                    } for prop in real_properties[:5]
                                ],
                                'interpretation': f"Búsqueda procesada: {user_query}",
                                'fallback': True # Ensure fallback flag is set for this path too
                            }
                            
                            return fallback_response
                    
                    else:
                        raise GeminiServiceError("No se recibieron candidatos en la respuesta de Gemini")
                
                elif response.status_code == 429:
                    wait_time = self.retry_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"[GeminiService] Rate limit alcanzado. Esperando {wait_time:.2f} segundos...")
                    time.sleep(wait_time)
                    continue
                
                else:
                    error_msg = f"Error HTTP {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f": {error_detail}"
                    except:
                        error_msg += f": {response.text}"
                    
                    raise GeminiServiceError(error_msg, status_code=response.status_code)
            
            except requests.exceptions.RequestException as e:
                logger.error(f"[GeminiService] Error de conexión en intento {attempt + 1}: {e}")
                if attempt == self.max_retries - 1:
                    # Último intento fallido, devolver búsqueda básica
                    return self._create_fallback_response(user_query)
                
                time.sleep(self.retry_delay)
                continue
            
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
        
        # Usar filtros básicos para buscar propiedades
        basic_filters = self._extract_basic_filters(user_query)
        properties = self._search_properties(basic_filters)
        
        recommendations = []
        for prop in properties[:5]:
            recommendations.append({
                'id': prop.id,
                'name': prop.name,
                'price': float(prop.price),
                'size': prop.size,
                'type': prop.get_type_display(), # Use display name for consistency
                'latitude': prop.latitude, # Add latitude
                'longitude': prop.longitude, # Add longitude
                'has_water': prop.has_water,
                'has_views': prop.has_views,
                'reason': f"Coincide con tu búsqueda: {user_query}"
            })
        
        return {
            'search_mode': 'property_recommendation', # Fallback implies property recommendation
            'assistant_message': f"Encontré {len(recommendations)} propiedades relacionadas con tu búsqueda. (Servicio de IA con funcionalidad limitada)",
            'flyToLocation': None,
            'suggestedFilters': basic_filters,
            'recommendations': recommendations,
            'interpretation': f"Búsqueda procesada: {user_query}",
            'fallback': True
        } 