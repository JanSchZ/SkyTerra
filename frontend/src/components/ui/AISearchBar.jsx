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
  const theme = useTheme();

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (showResults) setShowResults(false);
    if (error) setError(null);
  };

  const searchLocation = async (locationQuery) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationQuery)}.json?` +
        `access_token=${config.mapbox.accessToken}&` +
        `types=country,region,district,place,locality,neighborhood,address&` +
        `limit=5`
      );
      if (!response.ok) throw new Error('Error en la búsqueda geográfica');
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
      const predefinedLocation = PREDEFINED_LOCATIONS[searchTerm];
      if (predefinedLocation) {
        if (onLocationSearch) {
          onLocationSearch({
            center: predefinedLocation.center,
            zoom: predefinedLocation.zoom,
            locationName: predefinedLocation.name
          });
        }
        setSearchResult({ type: 'location', locationName: predefinedLocation.name, coordinates: predefinedLocation.center, interpretation: `Volando a ${predefinedLocation.name}...` });
        setShowResults(true); setLoading(false); return;
      }

      const geoResults = await searchLocation(searchTerm);
      if (geoResults.length > 0) {
        const firstResult = geoResults[0];
        const center = firstResult.center;
        const placeName = firstResult.place_name || firstResult.text;
        let zoom = 12;
        if (firstResult.place_type?.includes('country')) zoom = 5;
        else if (firstResult.place_type?.includes('region')) zoom = 8;
        else if (firstResult.place_type?.includes('district')) zoom = 10;
        else if (firstResult.place_type?.includes('place')) zoom = 11;
        
        if (onLocationSearch) onLocationSearch({ center, zoom, locationName: placeName });
        setSearchResult({ type: 'location', locationName: placeName, coordinates: center, interpretation: `Volando a ${placeName}...`, allResults: geoResults.map(r => ({ name: r.place_name || r.text, center: r.center, type: r.place_type?.[0] || 'place' })) });
        setShowResults(true); setLoading(false); return;
      }

      const response = await api.post('ai-search/', { current_query: searchTerm, conversation_history: [] });
      if (response.data && typeof response.data === 'object') {
        const hasValidAssistantMessage = response.data.assistant_message && typeof response.data.assistant_message === 'string';
        const hasValidFilters = response.data.suggestedFilters && typeof response.data.suggestedFilters === 'object';
        
        if (hasValidAssistantMessage || hasValidFilters) {
          const processedResult = {
            type: 'properties',
            assistant_message: response.data.assistant_message || "Búsqueda procesada",
            suggestedFilters: response.data.suggestedFilters || { propertyTypes: [], priceRange: [null, null], features: [], locations: [] },
            interpretation: response.data.assistant_message || response.data.interpretation || "Búsqueda de propiedades procesada",
            recommendations: response.data.recommendations || []
          };
          setSearchResult(processedResult);
          if (onSearch) onSearch(processedResult);
          setShowResults(true);
        } else {
          if (response.data.error) throw new Error(response.data.error + (response.data.details ? `: ${response.data.details}` : ''));
          const fallbackMsg = "No se encontraron ubicaciones ni propiedades específicas para esta búsqueda.";
          setSearchResult({ type: 'properties', assistant_message: fallbackMsg, suggestedFilters: { propertyTypes: [], priceRange: [null, null], features: [], locations: [] }, interpretation: fallbackMsg, recommendations: [] });
          if (onSearch) onSearch(searchResult);
          setShowResults(true);
          setError(fallbackMsg);
        }
      } else {
        throw new Error('El servidor devolvió una respuesta con formato inválido');
      }
    } catch (err) {
      console.error('Error en la búsqueda:', err);
      let errorMsg = 'Error al realizar la búsqueda. Intente de nuevo.';
      if (err.response?.data) {
        const errorData = err.response.data;
        errorMsg = errorData.error ? (errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error) : (typeof errorData === 'string' ? errorData : errorMsg);
        if (errorMsg.includes('Gemini') || errorMsg.includes('API key')) errorMsg += ' Verifique la configuración de la API de Gemini.';
        if (errorData.suggestions) errorMsg += ` ${errorData.suggestions}`;
      } else if (err.message) {
        errorMsg = err.message.includes('Network Error') ? 'Error de conexión. Verifique que el servidor esté funcionando.' : `Error: ${err.message}`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };
  const handleCloseResults = () => { setShowResults(false); };

  const handleLocationClick = (location) => {
    if (onLocationSearch) onLocationSearch({ center: location.center, zoom: 12, locationName: location.name });
    setShowResults(false);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Buscar ubicación o propiedades..."
        value={query}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ ml: 0.5 }}>
              <TravelExploreIcon sx={{ color: theme.palette.text.secondary, fontSize: '20px' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={22} sx={{color: theme.palette.text.secondary, mr: 0.5}} />
              ) : (
                <IconButton onClick={handleSearch} disabled={!query.trim()} color="primary" sx={{mr: -0.5}}>
                  <SearchIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
          sx: {
            backgroundColor: 'transparent',
            borderRadius: '50px',
            fontSize: '0.95rem',
            paddingLeft: '12px',
            paddingRight: '12px',
            color: theme.palette.text.primary,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            '&.MuiOutlinedInput-root': {
                '& fieldset': { 
                  border: 'none', // Quitar el borde por defecto
                  borderRadius: '50px',
                },
                '&:hover fieldset': { 
                  border: 'none',
                },
                '&.Mui-focused fieldset': { 
                  border: 'none',
                },
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                },
                '&.Mui-focused': {
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.1)',
                },
            },
            '& .MuiInputBase-input': {
                paddingTop: '12px',
                paddingBottom: '12px',
                paddingLeft: '8px',
                paddingRight: '8px',
                 '&::placeholder': {
                    color: theme.palette.text.secondary,
                    opacity: 0.9,
                    fontWeight: 300,
                },
            },
          }
        }}
      />
      
      {error && (
        <Box sx={{ mt: 1, px: 1 }}>
          <Typography color="error" variant="body2" sx={{ fontSize: '0.8rem' }}>
            {error}
          </Typography>
        </Box>
      )}
      
      <Collapse in={showResults} timeout={300}>
        <Paper
          elevation={0}
          sx={{
            position: 'absolute', 
            width: '100%',
            mt: 0.5,
            backgroundColor: 'rgba(22, 27, 34, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: `1px solid ${theme.palette.divider}`,
            zIndex: 10,
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            boxShadow: theme.shadows[5]
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', pt: 1, pb:0.5, px: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle2" fontWeight="300" color="text.secondary">
              {searchResult?.type === 'location' ? 'Ubicación Encontrada' : 'Resultados de Búsqueda IA'}
            </Typography>
            <IconButton size="small" onClick={handleCloseResults} sx={{color: theme.palette.text.secondary}}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
          
          <Box sx={{p:1.5}}>
            {searchResult && searchResult.type === 'location' && (
              <>
                <Typography variant="body2" color="text.primary" gutterBottom sx={{fontWeight: 300}}>
                  {searchResult.interpretation}
                </Typography>
                <Box sx={{ mb: 1.5, mt: 0.5 }}>
                  <Chip 
                    icon={<TravelExploreIcon fontSize="small"/>}
                    label={`${searchResult.locationName}`}
                    size="medium" 
                    color="primary"
                    sx={{ fontWeight: 400, borderRadius: '8px'}}
                  />
                </Box>
                {searchResult.allResults && searchResult.allResults.length > 1 && (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 0.5 }}>
                      Otras ubicaciones:
                    </Typography>
                    <List dense sx={{ maxHeight: '180px', overflowY: 'auto', p:0 }}>
                      {searchResult.allResults.slice(1, 5).map((location, index) => (
                        <ListItem 
                          key={index} 
                          button 
                          onClick={() => handleLocationClick(location)}
                          sx={{ py: 0.2, px: 1, borderRadius: 1, mb: 0.5, '&:hover': {backgroundColor: theme.palette.action.hover} }}
                        >
                          <ListItemText 
                            primary={location.name}
                            secondary={location.type}
                            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
                            secondaryTypographyProps={{ fontSize: '0.75rem' }}
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
                <Typography variant="body2" color="text.primary" gutterBottom sx={{fontWeight: 300, mb: 1.5}}>
                  {searchResult.assistant_message || searchResult.interpretation}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5, maxHeight: '150px', overflowY: 'auto' }}>
                  {searchResult.suggestedFilters?.propertyTypes?.map(type => (
                    <Chip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} size="small" variant="outlined" sx={{borderRadius: '6px'}}/>
                  ))}
                  {searchResult.suggestedFilters?.priceRange?.[0] !== null && searchResult.suggestedFilters?.priceRange?.[1] !== null && (
                    <Chip label={`$${searchResult.suggestedFilters.priceRange[0]?.toLocaleString()} - $${searchResult.suggestedFilters.priceRange[1]?.toLocaleString()}`} size="small" variant="outlined" sx={{borderRadius: '6px'}}/>
                  )}
                  {searchResult.suggestedFilters?.features?.map(feature => (
                    <Chip key={feature} label={feature} size="small" variant="outlined" sx={{borderRadius: '6px'}}/>
                  ))}
                  {searchResult.suggestedFilters?.locations?.map(loc => (
                    <Chip key={loc} label={loc} icon={<TravelExploreIcon fontSize='small'/>} size="small" variant="outlined" sx={{borderRadius: '6px'}}/>
                  ))}
                </Box>
                
                {searchResult.recommendations && searchResult.recommendations.length > 0 && (
                    <>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb: 0.5 }}>Recomendaciones:</Typography>
                        <List dense sx={{ maxHeight: '150px', overflowY: 'auto', p:0}}>
                            {searchResult.recommendations.map((rec, index) => (
                                <ListItem key={index} sx={{ py: 0.2, px: 1, borderRadius: 1, mb: 0.5}}>
                                    <ListItemText primary={rec.name || rec} primaryTypographyProps={{ fontSize: '0.85rem'}} />
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
                <Button 
                    variant="contained" 
                    size="small" 
                    onClick={() => { 
                        if(onSearch) onSearch(searchResult); 
                        setShowResults(false); 
                    }}
                    sx={{mt:1.5, width:'100%', fontWeight: 400, borderRadius: '12px', textTransform: 'none'}}
                >
                    Aplicar Filtros de IA
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AISearchBar; 