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
  Button,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
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

const AISearchBar = ({ onSearch, onLocationSearch, onQuerySubmit, onSearchStart, onSearchComplete }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const theme = useTheme();

  const chipSx = {
    borderRadius: '6px',
    fontWeight: 400,
    backgroundColor: alpha(theme.palette.primary.main, 0.25),
    color: theme.palette.primary.light,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
    '& .MuiChip-icon': {
      color: theme.palette.primary.light,
      fontSize: '1rem',
      marginLeft: '5px',
      marginRight: '-4px'
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.35),
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (showResults) setShowResults(false);
    if (error) setError(null);
    setIsInitialLoad(false);
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
    const searchTerm = query.trim(); // Using original case for query submission

    if (onQuerySubmit) {
      onQuerySubmit(searchTerm);
    }

    setLoading(true);
    setError(null);
    setShowResults(false);
    // Normalize lowercase for heuristics and quick checks
    const searchTermLowerCase = searchTerm.toLowerCase();

    // Inform parent that a search has started
    if (onSearchStart) {
      onSearchStart(searchTerm);
    }
    
    // Add smooth loading state transition
    setIsInitialLoad(false);

    // QUICK HEURISTICS -------------------------------------------------
    const greetingRegex = /^(hola|buenas|hello|hi|qué tal|que tal|hey)(\s+.*)?$/i;
    if(greetingRegex.test(searchTermLowerCase.trim())){
        const chatResponse = {
          type:'chat',
          search_mode:'chat',
          assistant_message:'¡Hola! ¿En qué puedo ayudarte a buscar propiedades o ubicaciones?',
          suggestedFilters:null,
          recommendations:[],
        };
        setSearchResult(chatResponse);
        if(onSearch) onSearch(chatResponse);
        setShowResults(false);
        if(onSearchComplete) onSearchComplete(chatResponse);
        setLoading(false);
        return;
    }

    // 1) If the query is very short (≤3 words) *and* doesn't mention property-related keywords,
    //    we assume it is likely a place name and try geocoding first.
    // 2) Otherwise we go straight to the AI service.

    const wordCount = searchTermLowerCase.split(/\s+/).filter(Boolean).length;
    const propertyKeywordsRegex = /(propiedad|propiedades|terreno|terrenos|granja|finca|campo|casa|parcela|parcel|lote|rancho|ranch|farm|forest|bosque)/;
    const isLikelyLocationQuery = wordCount <= 3 && !propertyKeywordsRegex.test(searchTermLowerCase);

    try {
      // ---------------------------------------------------------------
      // LOCATION SHORT-CIRCUIT
      // ---------------------------------------------------------------
      if (isLikelyLocationQuery) {
        const predefinedLocation = PREDEFINED_LOCATIONS[searchTermLowerCase];
        if (predefinedLocation) {
          if (onLocationSearch) {
            onLocationSearch({
              center: predefinedLocation.center,
              zoom: predefinedLocation.zoom,
              locationName: predefinedLocation.name
            });
          }
          setSearchResult({ type: 'location', locationName: predefinedLocation.name, coordinates: predefinedLocation.center, interpretation: `Volando a ${predefinedLocation.name}...` });
          setShowResults(true); setLoading(false);
          if (onSearchComplete) onSearchComplete({ type: 'location_result', data: { locationName: predefinedLocation.name, center: predefinedLocation.center } });
          return;
        }

        // If not predefined, use Mapbox geocoding. We'll only accept high-confidence results.
        const geoResults = await searchLocation(searchTermLowerCase);
        if (geoResults.length > 0 && (geoResults[0].relevance ?? 1) >= 0.8) {
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
          setShowResults(true); setLoading(false);
          if (onSearchComplete) onSearchComplete({ type: 'location_result', data: { locationName: placeName, center } });
          return;
        }
        // If geocoder didn't return confident result, fall through to AI search.
      }

      // ---------------------------------------------------------------
      // AI SEARCH FALLBACK / PROPERTY QUERY
      // ---------------------------------------------------------------

      const response = await api.post('ai-search/', { query: searchTerm, conversation_history: [] });
      if (response.data && typeof response.data === 'object') {
        const { assistant_message, suggestedFilters, interpretation, recommendations, flyToLocation, search_mode } = response.data;
        const hasContentForPropertyList = (suggestedFilters && Object.values(suggestedFilters).some(v => (Array.isArray(v) ? v.length > 0 : v !== null && (Array.isArray(v) ? v.some(subVal => subVal !== null) : true )))) || (recommendations && recommendations.length > 0);

        if (flyToLocation && onLocationSearch) {
          onLocationSearch({
            center: flyToLocation.center,
            zoom: flyToLocation.zoom || 12,
            locationName: flyToLocation.name || searchTerm, // Use original searchTerm
            pitch: flyToLocation.pitch,
            bearing: flyToLocation.bearing,
          });
          setSearchResult({ type: 'location', locationName: flyToLocation.name || searchTerm, coordinates: flyToLocation.center, interpretation: interpretation || `Volando a ${flyToLocation.name || searchTerm}...` }); // Use original searchTerm
          setShowResults(true); setLoading(false);
          if (onSearchComplete) onSearchComplete({ type: 'location_result', data: { locationName: flyToLocation.name || searchTerm, center: flyToLocation.center } });
          return;
        }

        const hasRecs = recommendations && recommendations.length > 0;
        let resultType = hasRecs ? 'properties' : 'ai_response';

        const processedResult = {
          type: resultType,
          search_mode: search_mode || (resultType === 'properties' ? 'property_recommendation' : 'location'),
          assistant_message: assistant_message || (resultType === 'properties' ? 'Resultados de búsqueda:' : 'Respuesta de IA:'),
          suggestedFilters: hasRecs ? (suggestedFilters || { propertyTypes: [], priceRange: [null, null], features: [], locations: [], listingType: null }) : null,
          interpretation: interpretation || assistant_message,
          recommendations: hasRecs ? (recommendations || []) : [],
          flyToLocation
        };
        setSearchResult(processedResult);
        if (onSearch) {
          onSearch(processedResult);
        }
        if (resultType === 'properties') {
          setShowResults(false);
        } else {
          setShowResults(false); // hide for location/chat minimalism
        }
        if (onSearchComplete) onSearchComplete(processedResult);

      } else {
        const errorMsg = response.data?.error || response.data?.detail || 'Respuesta inesperada del servidor de IA.';
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error en la búsqueda AISearchBar:', err);
      let errorMsg = 'Error al procesar la búsqueda. Intente de nuevo.';
      if (err.response?.data) {
        const errorData = err.response.data;
        errorMsg = errorData.error ? (errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error) : (typeof errorData === 'string' ? errorData : errorMsg);
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setSearchResult({
        type: 'error',
        assistant_message: errorMsg,
        interpretation: "Error en la Búsqueda"
      });
      setShowResults(true);
      if (onSearchComplete) onSearchComplete({ type: 'error', error: err });
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
        autoComplete="off"
        inputProps={{ autoComplete: 'off', name: 'ai-search-input' }}
        InputProps={{
          endAdornment: loading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.7)' }} />
            </InputAdornment>
          ) : (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSearch}
                disabled={!query.trim()}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { color: 'rgba(255,255,255,0.9)' },
                  '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                }}
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#ffffff',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': { borderColor: 'transparent' },
            '&:hover fieldset': { borderColor: 'transparent' },
            '&.Mui-focused fieldset': { borderColor: 'transparent' },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255,255,255,0.22)',
              boxShadow: '0 0 12px rgba(255,255,255,0.4)',
              transform: 'translateY(-1px)',
            },
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              transform: 'translateY(-0.5px)',
            }
          },
          input: { color: '#ffffff', '::placeholder': { color: 'rgba(255,255,255,0.75)' } },
        }}
      />
      
      {error && !showResults && (
        <Box sx={{ mt: 1, px: 1 }}>
          <Typography color="error" variant="body2" sx={{ fontSize: '0.8rem' }}>
            {error}
          </Typography>
        </Box>
      )}
      
      {/* Show detailed results only for non-location types */}
      <AnimatePresence>
        {showResults && searchResult && searchResult.type !== 'location' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', width: '100%', marginTop: '4px', zIndex: 10 }}
          >
            <Paper
              elevation={0}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.3)',
                maxHeight: 'calc(100vh - 200px)',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.1)', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(255,255,255,0.4)' }
              }}
            >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems:'center', pt: 1, pb:0.5, px: 2, borderBottom: '1px solid rgba(30, 41, 59, 0.2)' }}>
            <Typography variant="subtitle2" fontWeight="300" sx={{ color: '#c9d1d9' }}>
              {searchResult?.type === 'location' ? 'Ubicación Encontrada' :
               searchResult?.type === 'properties' ? 'Sugerencias de Búsqueda IA' :
               searchResult?.type === 'ai_response' ? 'Respuesta de IA' :
               searchResult?.type === 'error' ? 'Error en la Búsqueda' :
               'Resultados'}
            </Typography>
            <IconButton size="small" onClick={handleCloseResults} sx={{color: '#8b949e'}}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
          
          <Box sx={{p:1.5}}>
            {searchResult && searchResult.type === 'error' && (
              <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 300 }} gutterBottom>
                {searchResult.assistant_message || "Ocurrió un error."}
              </Typography>
            )}

            {searchResult && searchResult.type === 'location' && (
              <Typography variant="body2" sx={{ color:'#ffffff', fontWeight:300, textAlign:'center', py:1 }}>
                 Volando<span style={{ animation: 'dots 1.4s infinite steps(3)', display:'inline-block', width:'1.2em'}}></span>
                 <style>{`@keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}`}</style>
              </Typography>
            )}

            {(searchResult && (searchResult.type === 'properties' || searchResult.type === 'ai_response')) && (() => {
              const isPropertiesSearch = searchResult.type === 'properties';
              const suggestedFilters = searchResult.suggestedFilters || {};
              const recommendations = searchResult.recommendations || [];

              const hasSuggestedFilters = isPropertiesSearch && (
                (suggestedFilters.propertyTypes && suggestedFilters.propertyTypes.length > 0) ||
                (suggestedFilters.priceRange && suggestedFilters.priceRange[0] !== null && suggestedFilters.priceRange[1] !== null) ||
                (suggestedFilters.features && suggestedFilters.features.length > 0) ||
                (suggestedFilters.locations && suggestedFilters.locations.length > 0) ||
                (suggestedFilters.listingType !== undefined && suggestedFilters.listingType !== null)
              );
              const hasRecommendations = isPropertiesSearch && recommendations.length > 0;

              return (
                <>
                  <Typography variant="body2" sx={{ color: '#c9d1d9', fontWeight: 300, mb: 1.5 }} gutterBottom>
                    {searchResult.assistant_message || (isPropertiesSearch ? "Aquí hay algunas sugerencias basadas en tu búsqueda:" : "Respuesta de IA:")}
                  </Typography>
                  
                  {isPropertiesSearch && (
                    <>
                      {hasSuggestedFilters && (
                        <Box mb={2.5}>
                          <Typography variant="overline" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>
                            Filtros Sugeridos
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                            {suggestedFilters.propertyTypes?.map(type => (
                              <Chip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} size="small" sx={chipSx}/>
                            ))}
                            {suggestedFilters.priceRange?.[0] !== null && suggestedFilters.priceRange?.[1] !== null && (
                              <Chip label={`$${suggestedFilters.priceRange[0]?.toLocaleString()} - $${suggestedFilters.priceRange[1]?.toLocaleString()}`} size="small" sx={chipSx}/>
                            )}
                            {suggestedFilters.features?.map(feature => (
                              <Chip key={feature} label={feature} size="small" sx={chipSx}/>
                            ))}
                            {suggestedFilters.locations?.map(loc => (
                              <Chip key={loc} label={`${loc}`} icon={<TravelExploreIcon />} size="small" sx={chipSx}/>
                            ))}
                            {suggestedFilters.listingType && (
                              <Chip label={suggestedFilters.listingType === 'rent' ? 'Arriendo' : (suggestedFilters.listingType === 'both' ? 'Venta/Arriendo' : 'Venta')} size="small" sx={chipSx} />
                            )}
                          </Box>
                        </Box>
                      )}
                      
                      {hasRecommendations && (
                          <Box mb={2.5}>
                              <Typography variant="overline" sx={{ color: theme.palette.text.secondary, display:'block', mb: 1 }}>
                                Recomendaciones de Propiedades
                              </Typography>
                              <List dense sx={{ maxHeight: '180px', overflowY: 'auto', p:0, backgroundColor: alpha(theme.palette.common.white, 0.03), borderRadius: '8px'}}>
                                  {recommendations.map((rec, index) => (
                                      <ListItem 
                                        key={index} 
                                        sx={{ 
                                          py: 0.75, px: 1.5, 
                                          borderRadius: '6px', 
                                          mb: 0.5, 
                                          '&:hover': {backgroundColor: alpha(theme.palette.common.white, 0.07)}
                                        }}
                                      >
                                          <ListItemText 
                                            primary={rec.name || rec} 
                                            primaryTypographyProps={{ fontSize: '0.85rem', color: '#c9d1d9', fontWeight: 300}} 
                                          />
                                      </ListItem>
                                  ))}
                              </List>
                          </Box>
                      )}

                      {(hasSuggestedFilters || hasRecommendations) && (
                          <Button 
                              variant="contained" 
                              size="small" 
                              onClick={() => { 
                                  if(onSearch) onSearch(searchResult); 
                                  setShowResults(false); 
                              }}
                              sx={{
                                mt:0.5, 
                                width:'100%', 
                                fontWeight: 400, 
                                borderRadius: '12px', 
                                textTransform: 'none',
                                color: theme.palette.common.white,
                                backgroundColor: theme.palette.primary.main,
                                '&:hover': {
                                  backgroundColor: theme.palette.primary.dark,
                                }
                              }}
                          >
                              Aplicar Filtros y Ver Propiedades
                          </Button>
                      )}
                    </>
                  )}
                </>
              );
            })()}
            </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default AISearchBar;
