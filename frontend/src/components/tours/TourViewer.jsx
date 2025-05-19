import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, CircularProgress, Paper, Drawer, Divider, Chip, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import InfoIcon from '@mui/icons-material/Info';
import RoomIcon from '@mui/icons-material/Room';
import HomeIcon from '@mui/icons-material/Home';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { useParams, useNavigate } from 'react-router-dom';
import { tourService, propertyService } from '../../services/api';

const TourViewer = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tourData, setTourData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTourData = async () => {
      try {
        // Verificar si venimos directamente desde un marcador en el mapa
        const isDirectNavigation = localStorage.getItem('directTourNavigation') === 'true';
        
        // Si es navegación directa, iniciar con loading=false para evitar pantalla de carga
        if (isDirectNavigation) {
          setLoading(false);
          // Limpiar el flag
          localStorage.removeItem('directTourNavigation');
        } else {
          setLoading(true);
        }
        
        const tour = await tourService.getTour(tourId);
        setTourData(tour);
        
        // También cargar los datos de la propiedad relacionada
        if (tour && tour.property_id) {
          const property = await propertyService.getProperty(tour.property_id);
          setPropertyData(property);
        }
        
        // Solo cambiar a false si no era navegación directa
        if (!isDirectNavigation) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar tour:', err);
        setError('No se pudo cargar el tour 360°. Intente nuevamente más tarde.');
        setLoading(false);
      }
    };
    
    fetchTourData();
  }, [tourId]);

  // Función para ir a pantalla completa
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error(`Error al intentar pantalla completa: ${e.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Función para manejar el estado de carga del iframe
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Función para gestionar errores del iframe
  const handleIframeError = () => {
    setLoading(false);
    setError('No se pudo cargar el tour 360°. Verifique la conexión.');
  };

  // Función para volver a la página anterior
  const handleBack = () => {
    navigate(-1);
  };

  // Construir la URL del tour con autoLoad=true y parámetros adicionales
  const getModifiedTourUrl = () => {
    if (!tourData || !tourData.url) return '';
    
    // Crear URL base
    let baseUrl = tourData.url;
    
    // Asegurar que autoLoad=true esté presente y correcto.
    // 1. Si autoLoad=false está, cambiarlo a autoLoad=true.
    if (baseUrl.includes('autoLoad=false')) {
      baseUrl = baseUrl.replace('autoLoad=false', 'autoLoad=true');
    } 
    // 2. Si 'autoLoad=' no está presente en absoluto, añadir autoLoad=true.
    else if (!baseUrl.includes('autoLoad=')) { 
      const separator = baseUrl.includes('?') ? '&' : '?';
      baseUrl = `${baseUrl}${separator}autoLoad=true`;
    }
    // Si ya estaba autoLoad=true, o autoLoad con algún otro valor (que no sea false), se deja como está.
    // La lógica anterior cubre los casos más importantes para forzar el autoLoad.

    // Añadir autoRotate=0 si no está especificado, para prevenir rotaciones inesperadas al inicio.
    if (!baseUrl.includes('autoRotate=')) {
      const separator = baseUrl.includes('?') ? '&' : '?'; // Usa separador correcto
      baseUrl = `${baseUrl}${separator}autoRotate=0`;
    }
    
    return baseUrl;
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#000',
      position: 'relative'
    }}>
      {loading && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 10
        }}>
          <CircularProgress color="primary" />
          <Typography variant="h6" color="white" sx={{ ml: 2 }}>
            Cargando tour 360°...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mt: 2 }}
          >
            Volver
          </Button>
        </Box>
      )}
      
      {!error && (
        <>
          {/* Controles */}
          <Box sx={{ 
            position: 'absolute', 
            top: 16, 
            left: 16, 
            zIndex: 5,
            display: 'flex',
            gap: 1
          }}>
            <IconButton 
              onClick={handleBack}
              sx={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <IconButton 
              onClick={toggleFullScreen}
              sx={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            
            <IconButton 
              onClick={() => setShowInfo(!showInfo)}
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                color: 'white',
                '&.active': {
                  backgroundColor: 'primary.main'
                }
              }}
              className={showInfo ? 'active' : ''}
            >
              <InfoIcon />
            </IconButton>
          </Box>
          
          {/* Panel lateral con info */}
          <Drawer
            anchor="left"
            variant="persistent"
            open={showInfo && propertyData}
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
                top: 80,
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: 'white',
                borderRight: 'none'
              },
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
                {propertyData?.name || 'Propiedad'}
              </Typography>
              
              <Divider sx={{ my: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalOfferIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  ${propertyData?.price?.toLocaleString() || '---'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AspectRatioIcon sx={{ mr: 1 }} />
                <Typography variant="body1">
                  {propertyData?.size?.toFixed(1) || '---'} hectáreas
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <RoomIcon sx={{ mr: 1, mt: 0.5 }} />
                <Typography variant="body2">
                  {propertyData?.address || 'Ubicación no disponible'}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                {propertyData?.description || 'Sin descripción disponible'}
              </Typography>
              
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<HomeIcon />}
                fullWidth
                onClick={() => navigate(`/property/${propertyData?.id}`)}
                sx={{ mt: 2 }}
              >
                Ver detalles completos
              </Button>
            </Box>
          </Drawer>
          
          {/* Tour 360° */}
          {tourData && (
            <iframe
              src={getModifiedTourUrl()}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Tour Virtual 360°"
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%', 
                height: '100%',
                backgroundColor: '#000',
                border: 'none'
              }}
            />
          )}
        </>
      )}
    </Box>
  );
};

export default TourViewer; 