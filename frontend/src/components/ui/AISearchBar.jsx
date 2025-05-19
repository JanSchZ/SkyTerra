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
import { api } from '../../services/api'; // Corregido: Importar api como named export

const AISearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const theme = useTheme();

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    // Ocultar resultados cuando el usuario empieza a escribir de nuevo
    if (showResults) setShowResults(false);
    if (error) setError(null);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log("Enviando consulta a la API:", query.trim());
      
      // Llamada a la API del backend que maneja la consulta a Gemini
      // Usamos ruta relativa sin slash inicial para evitar doble /api/ en la URL
      const response = await api.post('ai-search/', {
        query: query.trim()
      });
      
      console.log("Respuesta completa de la API:", response.data);
      
      // Verificación más robusta de la estructura de respuesta
      if (response.data && typeof response.data === 'object') {
        // Si tenemos datos pero no hay suggestedFilters, podría ser un error del backend
        if (!response.data.suggestedFilters) {
          console.warn('La respuesta no contiene filtros sugeridos:', response.data);
          
          // Si hay un mensaje de error explícito, mostrarlo
          if (response.data.error) {
            throw new Error(response.data.error + (response.data.details ? `: ${response.data.details}` : ''));
          }
          
          // Intentamos crear una estructura válida para el frontend
          // Esto evita errores si la IA devuelve una estructura incorrecta pero que contiene datos
          setSearchResult({
            suggestedFilters: {
              propertyTypes: [],
              priceRange: [0, 1000000],
              features: [],
              locations: []
            },
            interpretation: response.data.interpretation || "No se pudo interpretar la consulta",
            recommendations: response.data.recommendations || []
          });
          
          if (onSearch && typeof onSearch === 'function') {
            onSearch(response.data);
          }
          
          setShowResults(true);
          
          // Mostrar advertencia al usuario
          setError('La búsqueda produjo resultados parciales. Intente con una consulta más específica.');
        } else {
          // Respuesta válida con suggestedFilters
          setSearchResult(response.data);
          if (onSearch && typeof onSearch === 'function') {
            onSearch(response.data);
          }
          setShowResults(true);
        }
      } else {
        // Respuesta no es un objeto o está vacía
        console.error('Respuesta con formato inválido:', response.data);
        throw new Error(`Formato de respuesta inválido: ${JSON.stringify(response.data)}`);
      }
    } catch (err) {
      console.error('Error en la búsqueda AI:', err);
      
      // Crear un objeto de error limpio para el log (evitando circular references)
      const errorLog = {
        message: err.message,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'), // Solo las primeras líneas del stack
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : 'No response data',
        request: err.request ? 'Request present but not logged' : 'No request data',
        config: err.config ? {
          url: err.config.url,
          method: err.config.method,
          baseURL: err.config.baseURL,
          headers: { ...err.config.headers, Authorization: '[REDACTED]' } // Ocultar datos sensibles
        } : 'No config data'
      };
      
      console.error('Error detallado:', errorLog);
      
      // Manejar errores con información más detallada
      let errorMsg = 'Error al realizar la búsqueda. Intente de nuevo.';
      
      // Si tenemos una respuesta del servidor con detalles de error
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Construir un mensaje de error más específico
        if (errorData.error && errorData.details) {
          errorMsg = `${errorData.error}: ${errorData.details}`;
        } else if (errorData.error) {
          errorMsg = errorData.error;
        }
        
        // Si hay sugerencias, mostrarlas
        if (errorData.suggestions) {
          errorMsg += ` ${errorData.suggestions}`;
        }
        
        // Si es un error de API key, dar instrucciones
        if (errorData.error === 'API key missing' && errorData.solution) {
          errorMsg = `${errorData.details} ${errorData.solution}`;
        }
      } else if (err.message) {
        // Si no hay respuesta detallada pero sí un mensaje de error
        errorMsg = `Error: ${err.message}`;
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

  // Manejar el cierre de los resultados
  const handleCloseResults = () => {
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
        placeholder="Describe qué propiedad buscas..."
        value={query}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        InputProps={{
          startAdornment: null,
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
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            sx={{ mt: 1, fontSize: '0.7rem' }}
            onClick={() => {
              console.error("Detalles completos del error:", {
                query, 
                errorMessage: error,
                timestamp: new Date().toISOString()
              });
              alert("Detalles del error impresos en la consola (F12)");
            }}
          >
            Ver detalles (Debug)
          </Button>
        </Box>
      )}
      
      {/* Resultados de la IA */}
      <Collapse in={showResults}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute', 
            width: '100%',
            mt: 1,
            p: 2,
            zIndex: 1000
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Resultados de IA
            </Typography>
            <IconButton size="small" onClick={handleCloseResults}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {searchResult && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                He identificado estos criterios en tu búsqueda:
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
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
                  typeof searchResult.suggestedFilters.priceRange[0] === 'number' && 
                  typeof searchResult.suggestedFilters.priceRange[1] === 'number' ? (
                  <Chip 
                    label={`$${searchResult.suggestedFilters.priceRange[0].toLocaleString()} - $${searchResult.suggestedFilters.priceRange[1].toLocaleString()}`} 
                    size="small" 
                    color="secondary"
                    variant="outlined"
                  />
                ) : searchResult.suggestedFilters?.priceRange ? (
                  <Chip 
                    label="Rango de precio no especificado"
                    size="small" 
                    color="default" // Or some other appropriate color
                    variant="outlined"
                  />
                ) : null}
                
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
            </>
          )}
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AISearchBar; 