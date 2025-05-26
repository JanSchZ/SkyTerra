import React, { useState } from 'react';
import {
  Box,
  TextField,
  CircularProgress,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  useTheme,
  InputAdornment,
  IconButton,
  Collapse,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import config from '../../config/environment';

// Coordenadas predefinidas para lugares comunes en todo el mundo
const PREDEFINED_LOCATIONS = {
  // Chile (mantener los existentes)
  'chile': { center: [-71.5430, -35.6751], zoom: 5, name: 'Chile' },
  'santiago': { center: [-70.6693, -33.4489], zoom: 10, name: 'Santiago' },
  'valparaiso': { center: [-71.6278, -33.0472], zoom: 11, name: 'Valparaíso' },
  'concepcion': { center: [-73.0444, -36.8270], zoom: 11, name: 'Concepción' },
  'valdivia': { center: [-73.2456, -39.8142], zoom: 11, name: 'Valdivia' },
  'puerto montt': { center: [-72.9344, -41.4693], zoom: 11, name: 'Puerto Montt' },
  'temuco': { center: [-72.5904, -38.7359], zoom: 11, name: 'Temuco' },
  'la serena': { center: [-71.2500, -29.9027], zoom: 11, name: 'La Serena' },
  'antofagasta': { center: [-70.4126, -23.6509], zoom: 11, name: 'Antofagasta' },
  'iquique': { center: [-70.1404, -20.2208], zoom: 11, name: 'Iquique' },
  'arica': { center: [-70.3051, -18.4783], zoom: 11, name: 'Arica' },
  'punta arenas': { center: [-70.9171, -53.1638], zoom: 11, name: 'Punta Arenas' },
  'chiloe': { center: [-73.8991, -42.6306], zoom: 10, name: 'Chiloé' },
  'atacama': { center: [-69.5723, -27.3668], zoom: 8, name: 'Desierto de Atacama' },
  'patagonia': { center: [-72.0000, -49.0000], zoom: 6, name: 'Patagonia' },
  'andes': { center: [-70.0000, -33.0000], zoom: 7, name: 'Cordillera de los Andes' },
  'torres del paine': { center: [-73.0000, -50.9423], zoom: 9, name: 'Torres del Paine' },
  'san pedro de atacama': { center: [-68.2023, -22.9098], zoom: 12, name: 'San Pedro de Atacama' },
  'puerto varas': { center: [-72.9898, -41.3317], zoom: 12, name: 'Puerto Varas' },
  'pucon': { center: [-71.9589, -39.2831], zoom: 12, name: 'Pucón' },
  
  // Ciudades principales del mundo
  'new york': { center: [-74.0060, 40.7128], zoom: 10, name: 'New York' },
  'london': { center: [-0.1276, 51.5074], zoom: 10, name: 'London' },
  'paris': { center: [2.3522, 48.8566], zoom: 10, name: 'Paris' },
  'tokyo': { center: [139.6917, 35.6895], zoom: 10, name: 'Tokyo' },
  'madrid': { center: [-3.7038, 40.4168], zoom: 10, name: 'Madrid' },
  'rome': { center: [12.4964, 41.9028], zoom: 10, name: 'Rome' },
  'berlin': { center: [13.4050, 52.5200], zoom: 10, name: 'Berlin' },
  'moscow': { center: [37.6173, 55.7558], zoom: 10, name: 'Moscow' },
  'beijing': { center: [116.4074, 39.9042], zoom: 10, name: 'Beijing' },
  'sydney': { center: [151.2093, -33.8688], zoom: 10, name: 'Sydney' },
  'los angeles': { center: [-118.2437, 34.0522], zoom: 10, name: 'Los Angeles' },
  'miami': { center: [-80.1918, 25.7617], zoom: 10, name: 'Miami' },
  'dubai': { center: [55.2708, 25.2048], zoom: 10, name: 'Dubai' },
  'singapore': { center: [103.8198, 1.3521], zoom: 10, name: 'Singapore' },
  'hong kong': { center: [114.1694, 22.3193], zoom: 10, name: 'Hong Kong' },
  'mumbai': { center: [72.8777, 19.0760], zoom: 10, name: 'Mumbai' },
  'cairo': { center: [31.2357, 30.0444], zoom: 10, name: 'Cairo' },
  'cape town': { center: [18.4241, -33.9249], zoom: 10, name: 'Cape Town' },
  'rio de janeiro': { center: [-43.1729, -22.9068], zoom: 10, name: 'Rio de Janeiro' },
  'buenos aires': { center: [-58.3816, -34.6037], zoom: 10, name: 'Buenos Aires' },
  'mexico city': { center: [-99.1332, 19.4326], zoom: 10, name: 'Mexico City' },
  'toronto': { center: [-79.3832, 43.6532], zoom: 10, name: 'Toronto' },
  'vancouver': { center: [-123.1207, 49.2827], zoom: 10, name: 'Vancouver' },
  
  // Países principales
  'usa': { center: [-95.7129, 37.0902], zoom: 4, name: 'United States' },
  'united states': { center: [-95.7129, 37.0902], zoom: 4, name: 'United States' },
  'canada': { center: [-106.3468, 56.1304], zoom: 4, name: 'Canada' },
  'mexico': { center: [-102.5528, 23.6345], zoom: 5, name: 'Mexico' },
  'brazil': { center: [-51.9253, -14.2350], zoom: 4, name: 'Brazil' },
  'argentina': { center: [-63.6167, -38.4161], zoom: 4, name: 'Argentina' },
  'france': { center: [2.2137, 46.2276], zoom: 6, name: 'France' },
  'germany': { center: [10.4515, 51.1657], zoom: 6, name: 'Germany' },
  'italy': { center: [12.5674, 41.8719], zoom: 6, name: 'Italy' },
  'spain': { center: [-3.7492, 40.4637], zoom: 6, name: 'Spain' },
  'uk': { center: [-3.4360, 55.3781], zoom: 6, name: 'United Kingdom' },
  'united kingdom': { center: [-3.4360, 55.3781], zoom: 6, name: 'United Kingdom' },
  'russia': { center: [105.3188, 61.5240], zoom: 3, name: 'Russia' },
  'china': { center: [104.1954, 35.8617], zoom: 4, name: 'China' },
  'japan': { center: [138.2529, 36.2048], zoom: 6, name: 'Japan' },
  'australia': { center: [133.7751, -25.2744], zoom: 4, name: 'Australia' },
  'india': { center: [78.9629, 20.5937], zoom: 5, name: 'India' },
};

const AISearchBar = ({ onSearch, onLocationSearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchType, setSearchType] = useState('mixed'); // 'location', 'properties', 'mixed'
  const theme = useTheme();

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    // Ocultar resultados cuando el usuario empieza a escribir de nuevo
    if (showResults) setShowResults(false);
    if (error) setError(null);
  };

  // Función para buscar coordenadas usando Mapbox Geocoding API
  const searchLocation = async (locationQuery) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json?` +
        `access_token=${config.mapbox.accessToken}&` +
        `types=country,region,district,place,locality,neighborhood,address&` +
        `limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Error en la búsqueda geográfica');
      }
      
      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error('Error en búsqueda geográfica:', error);
      return [];
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setShowResults(false);
    
    const searchTerm = query.trim().toLowerCase();
    
    try {
      // 1. Primero verificar ubicaciones predefinidas
      const predefinedLocation = PREDEFINED_LOCATIONS[searchTerm];
      if (predefinedLocation) {
        // Volar a la ubicación predefinida
        if (onLocationSearch) {
          onLocationSearch({
            center: predefinedLocation.center,
            zoom: predefinedLocation.zoom,
            locationName: predefinedLocation.name
          });
        }
        
        setSearchResult({
          type: 'location',
          locationName: predefinedLocation.name,
          coordinates: predefinedLocation.center,
          interpretation: `Volando a ${predefinedLocation.name}...`
        });
        setShowResults(true);
        setLoading(false);
        return;
      }

      // 2. Buscar usando Mapbox Geocoding API
      const geoResults = await searchLocation(searchTerm);
      if (geoResults.length > 0) {
        const firstResult = geoResults[0];
        const center = firstResult.center;
        const placeName = firstResult.place_name || firstResult.text;
        
        // Determinar el zoom basado en el tipo de lugar
        let zoom = 12;
        if (firstResult.place_type?.includes('country')) zoom = 5;
        else if (firstResult.place_type?.includes('region')) zoom = 8;
        else if (firstResult.place_type?.includes('district')) zoom = 10;
        else if (firstResult.place_type?.includes('place')) zoom = 11;
        
        if (onLocationSearch) {
          onLocationSearch({
            center: center,
            zoom: zoom,
            locationName: placeName
          });
        }
        
        setSearchResult({
          type: 'location',
          locationName: placeName,
          coordinates: center,
          interpretation: `Volando a ${placeName}...`,
          allResults: geoResults.map(result => ({
            name: result.place_name || result.text,
            center: result.center,
            type: result.place_type?.[0] || 'place'
          }))
        });
        setShowResults(true);
        setLoading(false);
        return;
      }

      // 3. Si no es una ubicación, buscar propiedades con IA
      console.log("Buscando propiedades con IA para:", searchTerm);
      
      // Mejorar la llamada a la API para ser más robusta con Gemini
      const response = await api.post('ai-search/', {
        current_query: searchTerm, // Usar current_query en lugar de query
        conversation_history: [] // Historial vacío para búsquedas simples
      });
      
      console.log("Respuesta completa de la API:", response.data);
      
      if (response.data && typeof response.data === 'object') {
        // Verificar si tenemos una respuesta válida del asistente
        const hasValidAssistantMessage = response.data.assistant_message && 
                                       typeof response.data.assistant_message === 'string';
        
        const hasValidFilters = response.data.suggestedFilters && 
                              typeof response.data.suggestedFilters === 'object';
        
        if (hasValidAssistantMessage || hasValidFilters) {
          const processedResult = {
            type: 'properties',
            assistant_message: response.data.assistant_message || "Búsqueda procesada",
            suggestedFilters: response.data.suggestedFilters || {
              propertyTypes: [],
              priceRange: [null, null],
              features: [],
              locations: []
            },
            interpretation: response.data.assistant_message || 
                          response.data.interpretation || 
                          "Búsqueda de propiedades procesada",
            recommendations: response.data.recommendations || []
          };
          
          setSearchResult(processedResult);
          
          // Pasar los filtros al componente padre si existe
          if (onSearch && typeof onSearch === 'function') {
            onSearch({
              suggestedFilters: processedResult.suggestedFilters,
              interpretation: processedResult.interpretation,
              recommendations: processedResult.recommendations
            });
          }
          
          setShowResults(true);
        } else {
          // Si hay un mensaje de error explícito, mostrarlo
          if (response.data.error) {
            throw new Error(response.data.error + (response.data.details ? `: ${response.data.details}` : ''));
          }
          
          // Crear una estructura de fallback para evitar crashes
          const fallbackResult = {
            type: 'properties',
            assistant_message: "No se encontraron resultados específicos para tu búsqueda.",
            suggestedFilters: {
              propertyTypes: [],
              priceRange: [null, null],
              features: [],
              locations: []
            },
            interpretation: "Búsqueda procesada sin resultados específicos",
            recommendations: []
          };
          
          setSearchResult(fallbackResult);
          if (onSearch && typeof onSearch === 'function') {
            onSearch(fallbackResult);
          }
          setShowResults(true);
          setError('No se encontraron ubicaciones ni propiedades específicas para esta búsqueda.');
        }
      } else {
        throw new Error('El servidor devolvió una respuesta con formato inválido');
      }
    } catch (err) {
      console.error('Error en la búsqueda:', err);
      
      let errorMsg = 'Error al realizar la búsqueda. Intente de nuevo.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.error && errorData.details) {
          errorMsg = `${errorData.error}: ${errorData.details}`;
        } else if (errorData.error) {
          errorMsg = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
        
        // Agregar sugerencias específicas para errores de Gemini
        if (errorMsg.includes('Gemini') || errorMsg.includes('API key')) {
          errorMsg += ' Verifique la configuración de la API de Gemini.';
        }
        
        if (errorData.suggestions) {
          errorMsg += ` ${errorData.suggestions}`;
        }
      } else if (err.message) {
        errorMsg = err.message.includes('Network Error') 
          ? 'Error de conexión. Verifique que el servidor esté funcionando.'
          : `Error: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  const handleLocationClick = (location) => {
    if (onLocationSearch) {
      onLocationSearch({
        center: location.center,
        zoom: 12,
        locationName: location.name
      });
    }
    setShowResults(false);
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        position: 'relative'
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Buscar lugares en todo el mundo (ej: New York, Tokyo) o propiedades (ej: granja con agua, rancho barato)..."
        value={query}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <TravelExploreIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <IconButton 
                  onClick={handleSearch}
                  disabled={!query.trim()}
                  color="primary"
                >
                  <SearchIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            '&:hover': {
              backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
            pr: 1
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            }
          }
        }}
      />
      
      {/* Mensaje de error */}
      {error && (
        <Box sx={{ mt: 1 }}>
          <Typography color="error" variant="body2" sx={{ fontSize: '0.8rem' }}>
            {error}
          </Typography>
        </Box>
      )}
      
      {/* Resultados de la búsqueda - LIMITADO EN ALTURA */}
      <Collapse in={showResults}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute', 
            width: '100%',
            mt: 1,
            p: 2,
            zIndex: 1000,
            maxHeight: '400px', // LÍMITE DE ALTURA
            overflowY: 'auto', // SCROLL VERTICAL
            maxWidth: '600px' // LÍMITE DE ANCHO TAMBIÉN
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {searchResult?.type === 'location' ? '📍 Ubicación encontrada' : '🤖 Búsqueda IA'}
            </Typography>
            <IconButton size="small" onClick={handleCloseResults}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {searchResult && searchResult.type === 'location' && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {searchResult.interpretation}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={`📍 ${searchResult.locationName}`}
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              {/* Mostrar ubicaciones alternativas si las hay - CON LÍMITE */}
              {searchResult.allResults && searchResult.allResults.length > 1 && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Otras ubicaciones encontradas:
                  </Typography>
                  <List dense sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResult.allResults.slice(1, 4).map((location, index) => (
                      <ListItem 
                        key={index} 
                        button
                        onClick={() => handleLocationClick(location)}
                        sx={{ py: 0.5, px: 1, borderRadius: 1, mb: 0.5 }}
                      >
                        <ListItemText 
                          primary={location.name}
                          secondary={location.type}
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}

          {searchResult && searchResult.type === 'properties' && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {searchResult.assistant_message || searchResult.interpretation}
              </Typography>
              
              {/* Mostrar filtros identificados - CON LÍMITE */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, maxHeight: '120px', overflowY: 'auto' }}>
                {searchResult.suggestedFilters?.propertyTypes?.map(type => (
                  <Chip 
                    key={type} 
                    label={type === 'farm' ? 'Granja' : 
                           type === 'ranch' ? 'Rancho' : 
                           type === 'forest' ? 'Bosque' : 
                           type === 'lake' ? 'Con lago' : type} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                ))}
                
                {searchResult.suggestedFilters?.priceRange && 
                  searchResult.suggestedFilters.priceRange[0] !== null && 
                  searchResult.suggestedFilters.priceRange[1] !== null && (
                  <Chip 
                    label={`$${searchResult.suggestedFilters.priceRange[0]?.toLocaleString()} - $${searchResult.suggestedFilters.priceRange[1]?.toLocaleString()}`} 
                    size="small" 
                    color="secondary"
                    variant="outlined"
                  />
                )}
                
                {searchResult.suggestedFilters?.features?.map(feature => (
                  <Chip 
                    key={feature} 
                    label={feature === 'hasWater' ? 'Agua' : 
                           feature === 'hasViews' ? 'Vistas' : 
                           feature === 'has360Tour' ? 'Tour 360°' : feature} 
                    size="small" 
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
              
              {/* Mostrar recomendaciones si las hay - CON LÍMITE */}
              {searchResult.recommendations && searchResult.recommendations.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    🏡 Propiedades encontradas ({searchResult.recommendations.length}):
                  </Typography>
                  <List dense sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResult.recommendations.slice(0, 5).map((property, index) => (
                      <ListItem 
                        key={property.id || index} 
                        sx={{ 
                          py: 1, 
                          px: 1, 
                          borderRadius: 1, 
                          mb: 1,
                          border: '1px solid rgba(0,0,0,0.1)',
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {property.name}
                              </Typography>
                              <Chip 
                                label={property.type === 'farm' ? 'Granja' : 
                                       property.type === 'ranch' ? 'Rancho' : 
                                       property.type === 'forest' ? 'Bosque' : 
                                       property.type === 'lake' ? 'Lago' : property.type} 
                                size="small" 
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                💰 ${property.price?.toLocaleString()} • 📏 {property.size} ha
                              </Typography>
                              {property.has_water && (
                                <Chip label="💧 Agua" size="small" sx={{ mr: 0.5, mt: 0.5 }} />
                              )}
                              {property.has_views && (
                                <Chip label="🏔️ Vistas" size="small" sx={{ mr: 0.5, mt: 0.5 }} />
                              )}
                              {property.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  {property.description}
                                </Typography>
                              )}
                              {property.reason && (
                                <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                  ✨ {property.reason}
                                </Typography>
                              )}
                            </Box>
                          }
                          primaryTypographyProps={{ fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  {searchResult.fallback && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                      ⚠️ Búsqueda básica activada (IA temporalmente no disponible)
                    </Typography>
                  )}
                </>
              )}
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AISearchBar; 