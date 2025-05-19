import React, { useState, useEffect, useCallback } from 'react';
// Reemplazar la importación de react-map-gl por alternativas más simples
// import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { useSpring, animated } from 'react-spring';
// import 'mapbox-gl/dist/mapbox-gl.css';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { propertyService } from '../../services/api';

// Token de Mapbox (en producción debería ir en variables de entorno)
const MAPBOX_TOKEN = 'pk.eyJ1IjoiamFuc2NoeiIsImEiOiJjbWF0MWRtbDgwcm16Mm5weTl5c3ZkZzNzIn0.w-NSmbFWBz1P6gIz2xCDlg';

const MapView = () => {
  // Estado para propiedades y selección
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar propiedades
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const data = await propertyService.getProperties();
        setProperties(data.results || []);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar propiedades:', err);
        setError('No se pudieron cargar las propiedades. Intente nuevamente más tarde.');
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#f0f0f0', padding: 2 }}>
      <Box sx={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          backgroundColor: 'white', 
          borderRadius: 2,
          padding: 3,
          boxShadow: 1
      }}>
        <Typography variant="h4" gutterBottom>
          SkyTerra - Propiedades
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, backgroundColor: '#ffebee', borderRadius: 1 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Listado de Propiedades
            </Typography>
            
            {properties.length === 0 ? (
              <Typography>No se encontraron propiedades</Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                {properties.map(property => (
                  <Paper key={property.id} elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {property.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ${property.price.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {property.size.toFixed(1)} hectáreas
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Box sx={{ 
                        backgroundColor: property.has_water ? '#e3f2fd' : '#f5f5f5',
                        color: property.has_water ? '#1565c0' : '#757575',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}>
                        Agua: {property.has_water ? 'Sí' : 'No'}
                      </Box>
                      <Box sx={{ 
                        backgroundColor: property.has_views ? '#e8f5e9' : '#f5f5f5',
                        color: property.has_views ? '#2e7d32' : '#757575',
                        p: 0.5,
                        px: 1,
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}>
                        Vistas: {property.has_views ? 'Sí' : 'No'}
                      </Box>
                    </Box>
                    <Button 
                      variant="contained" 
                      color="primary"
                      fullWidth
                      onClick={() => window.location.href = `/property/${property.id}`}
                    >
                      Ver detalles
                    </Button>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MapView; 