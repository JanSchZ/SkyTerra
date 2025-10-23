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
import MapIcon from '@mui/icons-material/Map';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useParams, useNavigate } from 'react-router-dom';
import { tourService, propertyService, favoritesService } from '../../services/api';
import SamPropertyAssistant from './SamPropertyAssistant';

const TourViewer = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tourData, setTourData] = useState(null);
  const [propertyData, setPropertyData] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
                }
              }}
              className={showInfo ? 'active' : ''}
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
            open={showInfo && Boolean(propertyData)}
            sx={{
              '& .MuiDrawer-paper': {
                width: { xs: '100%', sm: 360, md: 380 },
                boxSizing: 'border-box',
                top: isFullScreen ? 0 : 80,
                height: isFullScreen ? '100%' : 'calc(100% - 80px)',
                background: 'linear-gradient(160deg, rgba(18,27,33,0.78), rgba(18,27,33,0.55))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: 'white',
                borderRight: '1px solid rgba(255,255,255,0.25)',
                borderRadius: { xs: 0, sm: '0 20px 20px 0' },
                boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                px: { xs: 2, md: 2.5 },
                py: 2
              }}
            >
              <SamPropertyAssistant property={propertyData} />

              <Divider sx={{ my: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  pr: 1,
                  pb: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.3) transparent',
                  '&::-webkit-scrollbar': {
                    width: 6
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    borderRadius: 8
                  }
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {propertyData?.name || 'Propiedad'}
                  </Typography>
                  {propertyData?.type && (
                    <Chip
                      size="small"
                      label={propertyData.type}
                      sx={{
                        mt: 0.5,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.92)',
                        textTransform: 'capitalize'
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <LocalOfferIcon sx={{ opacity: 0.85 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.75 }}>
                        Precio
                      </Typography>
                      <Typography variant="subtitle2">
                        {(() => {
                          const priceValue = Number(propertyData?.price);
                          return Number.isFinite(priceValue)
                            ? `$${priceValue.toLocaleString()}`
                            : '---';
                        })()}
                      </Typography>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <AspectRatioIcon sx={{ opacity: 0.85 }} />
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.75 }}>
                        Superficie
                      </Typography>
                      <Typography variant="subtitle2">
                        {(() => {
                          const sizeValue = Number(propertyData?.size);
                          return Number.isFinite(sizeValue)
                            ? `${sizeValue.toFixed(1)} ha`
                            : '---';
                        })()}
                      </Typography>
                    </Box>
                  </Paper>

                  {typeof propertyData?.plusvalia_score === 'number' && (
                    <Paper
                      elevation={0}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <LocalOfferIcon sx={{ opacity: 0.85 }} />
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Plusvalía
                        </Typography>
                        <Typography variant="subtitle2">
                          {propertyData.plusvalia_score}%
                        </Typography>
                      </Box>
                    </Paper>
                  )}

                  {propertyData?.bedrooms != null && (
                    <Paper
                      elevation={0}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <HomeIcon sx={{ opacity: 0.85 }} />
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Dormitorios
                        </Typography>
                        <Typography variant="subtitle2">{propertyData.bedrooms}</Typography>
                      </Box>
                    </Paper>
                  )}

                  {propertyData?.bathrooms != null && (
                    <Paper
                      elevation={0}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <HomeIcon sx={{ opacity: 0.85 }} />
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Baños
                        </Typography>
                        <Typography variant="subtitle2">{propertyData.bathrooms}</Typography>
                      </Box>
                    </Paper>
                  )}

                  {propertyData?.parking_spaces != null && (
                    <Paper
                      elevation={0}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <HomeIcon sx={{ opacity: 0.85 }} />
                      <Box>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Estac.
                        </Typography>
                        <Typography variant="subtitle2">{propertyData.parking_spaces}</Typography>
                      </Box>
                    </Paper>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <RoomIcon sx={{ mt: 0.5, opacity: 0.85 }} />
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    {propertyData?.address || 'Ubicación no disponible'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                    Descripción
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85, lineHeight: 1.6 }}>
                    {propertyData?.description || 'Sin descripción disponible'}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<HomeIcon />}
                  fullWidth
                  onClick={() => {
                    localStorage.setItem('skipAutoFlight', 'true');
                    navigate(`/property/${propertyData?.id}`);
                  }}
                  sx={{ mt: 'auto' }}
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
