from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import requests
import json
import datetime
from django.db.models import Count

class AISearchView(APIView):
    permission_classes = [permissions.AllowAny]  # Permitir acceso sin autenticación
    
    def post(self, request, *args, **kwargs):
        # Configuración para depuración
        DEBUG_MODE = True  # Establecer en True para ver detalles completos de errores
        
        # Intentar obtener la consulta del usuario
        try:
            search_query = request.data.get('query', '')
            if not search_query:
                return Response({'error': 'Query parameter is missing.', 'details': 'Se requiere una consulta para buscar propiedades.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Registrar la consulta para debugging
            print(f"[AI-SEARCH] Consulta recibida: '{search_query}'")
            
            # Obtener la API key
            api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
            if not api_key:
                error_message = 'GOOGLE_GEMINI_API_KEY no está configurada en las variables de entorno.'
                print(f"[AI-SEARCH ERROR] {error_message}")
                return Response({
                    'error': 'API key missing', 
                    'details': error_message,
                    'solution': 'Configure GOOGLE_GEMINI_API_KEY en el archivo .env o en las variables de entorno del sistema.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Si tenemos una API key parcial (para debugging), mostrarla parcialmente
            if DEBUG_MODE and api_key:
                masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
                print(f"[AI-SEARCH] Usando API key: {masked_key}")

            # URL de la API - Gemini 2.0 Flash (última versión estable)
            gemini_api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            
            # Configuración actualizada para Gemini 2.0 Flash según documentación
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"Interpretar esta búsqueda de propiedades rurales: \"{search_query}\"."}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.8,
                    "topK": 40,
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                },
                "systemInstruction": {
                    "parts": [
                        {"text": "Eres un asistente especializado en propiedades rurales para SkyTerra. Tu tarea es interpretar consultas en lenguaje natural y convertirlas a filtros estructurados. Responde ÚNICAMENTE en formato JSON con esta estructura exacta:\n\n{\n  \"suggestedFilters\": {\n    \"propertyTypes\": [], // Valores posibles: ['farm', 'ranch', 'forest', 'lake']\n    \"priceRange\": [min, max], // Rango de precios como [minPrice, maxPrice]\n    \"features\": [], // Valores posibles: ['hasWater', 'hasViews', 'has360Tour']\n    \"locations\": [] // Nombres de lugares o regiones\n  },\n  \"interpretation\": \"Resumen de la búsqueda que entendiste\",\n  \"recommendations\": [] // Un array de objetos vacío por ahora\n}\n\nEl JSON debe ser válido. Extrae solo filtros mencionados explícita o implícitamente. No inventes filtros no mencionados."}
                    ]
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }

            if DEBUG_MODE:
                print(f"[AI-SEARCH] Enviando payload a Gemini: {json.dumps(payload, indent=2, ensure_ascii=False)[:500]}...")

            try:
                print(f"[AI-SEARCH] Llamando a la API de Gemini...")
                # Configuramos headers explícitos y timeout más largo
                headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
                response = requests.post(gemini_api_url, json=payload, headers=headers, timeout=45)
                
                if DEBUG_MODE:
                    print(f"[AI-SEARCH] Respuesta HTTP: {response.status_code}")
                    # Mostrar los primeros 500 caracteres de la respuesta para no sobrecargar los logs
                    print(f"[AI-SEARCH] Respuesta: {response.text[:500]}...")
                
                response.raise_for_status()
                gemini_data = response.json()

                # Verificar la estructura de la respuesta
                if not gemini_data.get("candidates"):
                    return Response({
                        'error': 'Estructura de respuesta inválida de Gemini API', 
                        'details': 'No se encontró "candidates" en la respuesta',
                        'raw_response': gemini_data if DEBUG_MODE else None
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                if not gemini_data["candidates"][0].get("content"):
                    return Response({
                        'error': 'Estructura de respuesta inválida de Gemini API', 
                        'details': 'No se encontró "content" en el primer candidato',
                        'raw_response': gemini_data["candidates"][0] if DEBUG_MODE else None
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                if not gemini_data["candidates"][0]["content"].get("parts"):
                    return Response({
                        'error': 'Estructura de respuesta inválida de Gemini API', 
                        'details': 'No se encontró "parts" en el contenido',
                        'raw_response': gemini_data["candidates"][0]["content"] if DEBUG_MODE else None
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                if not gemini_data["candidates"][0]["content"]["parts"][0].get("text"):
                    return Response({
                        'error': 'Estructura de respuesta inválida de Gemini API', 
                        'details': 'No se encontró "text" en la primera parte',
                        'raw_response': gemini_data["candidates"][0]["content"]["parts"] if DEBUG_MODE else None
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # Extraer el texto JSON de la respuesta
                json_response_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
                
                if DEBUG_MODE:
                    print(f"[AI-SEARCH] Respuesta JSON de Gemini: {json_response_text[:500]}...")
                
                try:
                    # Intentar parsear la respuesta como JSON
                    ai_response = json.loads(json_response_text)
                    
                    # Ahora vamos a buscar propiedades reales que coincidan con los filtros sugeridos
                    suggested_filters = ai_response.get('suggestedFilters', {})
                    
                    print(f"[AI-SEARCH] Filtros sugeridos: {json.dumps(suggested_filters, ensure_ascii=False)}")
                    
                    # Consulta base de propiedades
                    properties_query = Property.objects.all()
                    
                    # Aplicar filtros según lo que vino de la IA
                    if suggested_filters.get('propertyTypes') and len(suggested_filters['propertyTypes']) > 0:
                        property_type = suggested_filters['propertyTypes'][0]
                        print(f"[AI-SEARCH] Intentando filtrar por tipo de propiedad: {property_type}")
                        try:
                            properties_query = properties_query.filter(type=property_type)
                            print(f"[AI-SEARCH] Filtrado por tipo de propiedad: {property_type}")
                        except Exception as e:
                            print(f"[AI-SEARCH ERROR] Error al filtrar por tipo: {str(e)}")
                    
                    if suggested_filters.get('priceRange') and len(suggested_filters['priceRange']) == 2:
                        min_price, max_price = suggested_filters['priceRange']
                        print(f"[AI-SEARCH] Intentando filtrar por rango de precio: {min_price} - {max_price}")
                        try:
                            properties_query = properties_query.filter(price__gte=min_price, price__lte=max_price)
                            print(f"[AI-SEARCH] Filtrado por rango de precio: {min_price} - {max_price}")
                        except Exception as e:
                            print(f"[AI-SEARCH ERROR] Error al filtrar por precio: {str(e)}")
                    
                    if suggested_filters.get('features'):
                        for feature in suggested_filters['features']:
                            if feature == 'hasWater':
                                print(f"[AI-SEARCH] Intentando filtrar por característica: agua")
                                try:
                                    properties_query = properties_query.filter(has_water=True)
                                    print(f"[AI-SEARCH] Filtrado por característica: agua")
                                except Exception as e:
                                    print(f"[AI-SEARCH ERROR] Error al filtrar por agua: {str(e)}")
                            elif feature == 'hasViews':
                                print(f"[AI-SEARCH] Intentando filtrar por característica: vistas")
                                try:
                                    properties_query = properties_query.filter(has_views=True)
                                    print(f"[AI-SEARCH] Filtrado por característica: vistas")
                                except Exception as e:
                                    print(f"[AI-SEARCH ERROR] Error al filtrar por vistas: {str(e)}")
                            elif feature == 'has360Tour':
                                print(f"[AI-SEARCH] Intentando filtrar por característica: tour 360")
                                try:
                                    properties_query = properties_query.annotate(tour_count=Count('tours')).filter(tour_count__gt=0)
                                    print(f"[AI-SEARCH] Filtrado por característica: tour 360")
                                except Exception as e:
                                    print(f"[AI-SEARCH ERROR] Error al filtrar por tour 360: {str(e)}")
                    
                    # Limitar a máximo 5 propiedades
                    try:
                        matching_properties = properties_query.order_by('-created_at')[:5]
                        
                        # Log del número de propiedades encontradas
                        property_count = matching_properties.count()
                        print(f"[AI-SEARCH] Se encontraron {property_count} propiedades que coinciden")
                        
                        # Serializar y agregar a la respuesta
                        serializer = PropertyListSerializer(matching_properties, many=True)
                        
                        # Agregar propiedades reales a las recomendaciones
                        ai_response['recommendations'] = serializer.data
                    except Exception as e:
                        print(f"[AI-SEARCH ERROR] Error al obtener o serializar propiedades: {str(e)}")
                        ai_response['recommendations'] = []
                        ai_response['error'] = f"Error al procesar propiedades: {str(e)}"
                    
                    # Agregar información de debug si está activado
                    if DEBUG_MODE:
                        ai_response['_debug'] = {
                            'query': search_query,
                            'timestamp': str(datetime.datetime.now()),
                            'model': 'gemini-2.0-flash',
                            'matching_properties_count': property_count if 'property_count' in locals() else 0
                        }
                    
                    print(f"[AI-SEARCH] Respuesta final: {json.dumps(ai_response, ensure_ascii=False)[:500]}...")
                    
                    return Response(ai_response, status=status.HTTP_200_OK)
                except json.JSONDecodeError as e:
                    error_message = f"Error al decodificar JSON de la respuesta de Gemini: {str(e)}"
                    print(f"[AI-SEARCH ERROR] {error_message}")
                    print(f"[AI-SEARCH ERROR] Texto recibido: {json_response_text}")
                    
                    return Response({
                        'error': 'JSON decode error', 
                        'details': error_message,
                        'raw_text': json_response_text if DEBUG_MODE else "Respuesta no válida"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            except requests.exceptions.Timeout:
                error_message = "Timeout al llamar a la API de Gemini (45s)"
                print(f"[AI-SEARCH ERROR] {error_message}")
                return Response({
                    'error': 'API timeout', 
                    'details': error_message,
                    'suggestions': "Intente con una consulta más simple o vuelva a intentarlo más tarde."
                }, status=status.HTTP_504_GATEWAY_TIMEOUT)
                
            except requests.exceptions.ConnectionError as e:
                error_message = f"Error de conexión: {str(e)}"
                print(f"[AI-SEARCH ERROR] {error_message}")
                return Response({
                    'error': 'Connection error', 
                    'details': error_message,
                    'suggestions': "Verifique su conexión a internet y que la API de Gemini esté accesible."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
            except requests.exceptions.HTTPError as e:
                error_message = f"Error HTTP: {str(e)}"
                error_response = e.response.text if hasattr(e, 'response') and hasattr(e.response, 'text') else "No response data"
                print(f"[AI-SEARCH ERROR] {error_message}")
                print(f"[AI-SEARCH ERROR] Respuesta de error: {error_response}")
                
                return Response({
                    'error': 'HTTP error', 
                    'details': error_message,
                    'response': error_response if DEBUG_MODE else "Error en la respuesta del servidor",
                    'status_code': e.response.status_code if hasattr(e, 'response') else "Unknown"
                }, status=status.HTTP_502_BAD_GATEWAY)
                
            except requests.exceptions.RequestException as e:
                error_message = f"Error de solicitud: {str(e)}"
                print(f"[AI-SEARCH ERROR] {error_message}")
                return Response({
                    'error': 'Request exception', 
                    'details': error_message
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        except Exception as e:
            error_message = f"Error inesperado: {str(e)}"
            print(f"[AI-SEARCH ERROR] {error_message}")
            import traceback
            traceback_str = traceback.format_exc()
            print(f"[AI-SEARCH TRACEBACK] {traceback_str}")
            
            return Response({
                'error': 'Unexpected error', 
                'details': error_message,
                'traceback': traceback_str if DEBUG_MODE else "Contacte al administrador del sistema."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 