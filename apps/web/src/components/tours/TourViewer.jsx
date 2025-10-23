import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, CircularProgress, Drawer, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import InfoIcon from '@mui/icons-material/Info';
import RoomIcon from '@mui/icons-material/Room';
import HomeIcon from '@mui/icons-material/Home';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import MapIcon from '@mui/icons-material/Map';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useParams, useNavigate } from 'react-router-dom';
import { tourService, propertyService, favoritesService } from '../../services/api';
import PropertySamAssistant from './PropertySamAssistant';

const TourViewer = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tourData, setTourData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

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

        // Validación adicional de seguridad y compatibilidad
        const urlStr = tour?.url || '';
        const looksMedia = typeof urlStr === 'string' && (
          urlStr.includes('/media/tours/') ||
          urlStr.includes('/api/tours/content/') ||
          urlStr.includes('/media\\tours\\')
        );
        const isInvalid = !tour || !urlStr || !looksMedia || urlStr.includes('placeholder');
        if (isInvalid) {
          const propId = tour?.property || tour?.property_id;
          if (propId) {
            navigate(`/property/${propId}`);
            return;
          } else {
            setError('No se encontró el tour solicitado.');
            setLoading(false);
            return;
          }
        }
        
        setTourData(tour);
        
        // También cargar los datos de la propiedad relacionada
        const relatedPropId = tour?.property || tour?.property_id;
        if (tour && relatedPropId) {
          const propId = relatedPropId;
          const property = await propertyService.getProperty(propId);
          setPropertyData(property);
          // Check if property is a favorite
          try {
            const favorites = await favoritesService.list();
            setIsFavorite(favorites.some(fav => fav.property === property.id));
          } catch (favError) {
            console.error('Error fetching favorites:', favError);
          }
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
  }, [tourId, navigate]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullScreen(active);
      setShowInfo(active);
    };
    handleFullScreenChange();
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    if (isFullScreen && propertyData) {
      setShowInfo(true);
    }
  }, [isFullScreen, propertyData]);

  // Función para ir a pantalla completa
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error(`Error al intentar pantalla completa: ${e.message}`);
      });
      setIsFullScreen(true);
      setShowInfo(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
        setShowInfo(false);
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
    let original = tourData.url;

    // Separar parte base y hash para tratar ambos
    const [basePart, hashPart] = original.split('#');
    let paramsObj = {};

    // Parse querystring (?a=b) de basePart
    if (basePart.includes('?')) {
      const urlObj = new URL(basePart);
      urlObj.searchParams.forEach((val, key) => {
        paramsObj[key] = val;
      });
    }

    // Parse parámetros dentro del hash estilo key=value&key2=val2
    if (hashPart) {
      hashPart.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) paramsObj[k] = v ?? '';
      });
    }

    // Forzar parámetros deseados
    paramsObj['autoLoad'] = 'true';
    if (!('autoRotate' in paramsObj)) paramsObj['autoRotate'] = '0';

    // Reconstruir hash con los parámetros
    const newHash = Object.entries(paramsObj)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');

    // Si la url original tenía hash, mantenemos la estructura
    if (hashPart !== undefined) {
      return `${basePart.split('?')[0]}#${newHash}`;
    }

    // Si no tenía hash, usar querystring
    return `${basePart.split('?')[0]}?${newHash}`;
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
              onClick={() => navigate('/')}
              sx={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
              title="Volver al mapa"
            >
              <MapIcon />
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
                },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.4)'
                }
              }}
              className={showInfo ? 'active' : ''}
              disabled={!isFullScreen}
            >
              <InfoIcon />
            </IconButton>
            
            {propertyData && (
              <IconButton 
                onClick={async () => {
                  try {
                    if (isFavorite) {
                      const favorites = await favoritesService.list();
                      const favToRemove = favorites.find(fav => fav.property === propertyData.id);
                      if (favToRemove) {
                        await favoritesService.remove(favToRemove.id);
                      }
                    } else {
                      await favoritesService.add(propertyData.id);
                    }
                    setIsFavorite(!isFavorite);
                  } catch (err) {
                    console.error('Error toggling favorite:', err);
                  }
                }}
                sx={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white' }}
                title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
            )}
          </Box>
          
          {/* Panel lateral con info */}
          <Drawer
            anchor="left"
            variant="persistent"
            open={Boolean(propertyData) && isFullScreen && showInfo}
            hideBackdrop
            sx={{
              '& .MuiDrawer-paper': {
                width: { xs: 'calc(100% - 32px)', sm: 360, md: 420 },
                maxWidth: 420,
                boxSizing: 'border-box',
                top: { xs: 72, sm: 64 },
                left: { xs: 16, sm: 24 },
                bottom: { xs: 16, sm: 24 },
                borderRadius: '24px',
                backgroundColor: 'transparent',
                borderRight: 'none',
                boxShadow: 'none',
                overflow: 'visible',
              },
            }}
          >
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(140deg, rgba(18,24,38,0.78) 0%, rgba(32,42,62,0.72) 100%)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                color: 'white',
                boxShadow: '0 24px 55px rgba(0,0,0,0.38)',
                p: { xs: 2.5, md: 3 },
                gap: 2,
                overflow: 'hidden',
              }}
            >
              <PropertySamAssistant property={propertyData} />
              <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {propertyData?.name || 'Propiedad'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    ID #{propertyData?.id}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.12)' }} />
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    pr: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    '&::-webkit-scrollbar': {
                      width: 6,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      borderRadius: 3,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalOfferIcon sx={{ color: 'rgba(255,255,255,0.85)' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      ${propertyData?.price?.toLocaleString() || '---'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AspectRatioIcon sx={{ color: 'rgba(255,255,255,0.85)' }} />
                    <Typography variant="body1">
                      {propertyData?.size ? `${propertyData.size.toFixed(1)} hectáreas` : 'Superficie no disponible'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <RoomIcon sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }} />
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {propertyData?.address || 'Ubicación no disponible'}
                    </Typography>
                  </Box>
                  {propertyData?.plusvalia_score !== null && propertyData?.plusvalia_score !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Plusvalía estimada:
                      </Typography>
                      <Typography variant="body1">{propertyData.plusvalia_score}%</Typography>
                    </Box>
                  )}
                  {propertyData?.bedrooms && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Dormitorios:
                      </Typography>
                      <Typography variant="body1">{propertyData.bedrooms}</Typography>
                    </Box>
                  )}
                  {propertyData?.bathrooms && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Baños:
                      </Typography>
                      <Typography variant="body1">{propertyData.bathrooms}</Typography>
                    </Box>
                  )}
                  {propertyData?.parking_spaces && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Estacionamientos:
                      </Typography>
                      <Typography variant="body1">{propertyData.parking_spaces}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.88)' }}>
                    {propertyData?.description || 'Sin descripción disponible'}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<HomeIcon />}
                  onClick={() => {
                    localStorage.setItem('skipAutoFlight', 'true');
                    navigate(`/property/${propertyData?.id}`);
                  }}
                  sx={{
                    mt: 3,
                    borderRadius: '14px',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.2,
                  }}
                  fullWidth
                >
                  Ver detalles completos
                </Button>
              </Box>
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
              allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
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
