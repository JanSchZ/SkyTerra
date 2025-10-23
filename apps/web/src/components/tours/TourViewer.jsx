import React, { useState, useEffect, useMemo } from 'react';
import { Box, IconButton, Typography, CircularProgress, Drawer, Divider, Chip, Button, Stack } from '@mui/material';
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
import { formatPrice, formatRentPrice } from '../../utils/formatters';
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

  const topOffset = isFullScreen ? 24 : 96;
  const bottomOffset = isFullScreen ? 24 : 40;
  const panelHeight = `calc(100vh - ${topOffset + bottomOffset}px)`;

  const formattedPrice = useMemo(() => {
    if (!propertyData) return 'Precio no disponible';
    if (propertyData.listing_type === 'rent') {
      return propertyData.rent_price ? `${formatRentPrice(propertyData.rent_price)} /mes` : 'Arriendo no disponible';
    }
    if (propertyData.listing_type === 'both') {
      const sale = propertyData.price ? formatPrice(propertyData.price) : 'Venta N/D';
      const rent = propertyData.rent_price ? formatRentPrice(propertyData.rent_price) : 'Arriendo N/D';
      return `${sale} · ${rent}`;
    }
    return propertyData.price ? formatPrice(propertyData.price) : 'Precio no disponible';
  }, [propertyData]);

  const formattedSize = useMemo(() => {
    if (!propertyData) return '---';
    const sizeValue = Number(propertyData.size);
    if (Number.isNaN(sizeValue) || sizeValue <= 0) return '---';
    return `${sizeValue.toLocaleString('es-ES', { minimumFractionDigits: sizeValue < 10 ? 2 : 1, maximumFractionDigits: 2 })} hectáreas`;
  }, [propertyData]);

  const propertyTags = useMemo(() => {
    if (!propertyData) return [];
    const tags = [];
    if (propertyData.type) tags.push({ label: propertyData.type, color: 'primary' });
    if (propertyData.listing_type) tags.push({ label: propertyData.listing_type === 'both' ? 'Venta y arriendo' : propertyData.listing_type, color: 'secondary' });
    if (propertyData.status) tags.push({ label: propertyData.status, color: 'default' });
    return tags;
  }, [propertyData]);

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
                width: 360,
                boxSizing: 'border-box',
                top: topOffset,
                height: panelHeight,
                marginLeft: 16,
                marginBottom: bottomOffset,
                padding: '24px 24px 28px',
                background: 'linear-gradient(160deg, rgba(15,23,42,0.78), rgba(30,41,59,0.72))',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                color: 'white',
                borderRight: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '24px',
                boxShadow: '0 18px 60px rgba(15,23,42,0.45)',
                overflow: 'hidden',
              },
            }}
          >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <SamPropertyAssistant property={propertyData} />

              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.12)' }} />

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  pr: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(148,163,184,0.35) transparent',
                  '&::-webkit-scrollbar': {
                    width: 6,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(148,163,184,0.38)',
                    borderRadius: 999,
                  },
                }}
              >
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {propertyData?.name || 'Propiedad sin nombre'}
                  </Typography>
                  {propertyTags.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      {propertyTags.map(({ label, color }) => (
                        <Chip
                          key={label}
                          label={label}
                          size="small"
                          color={color === 'default' ? 'default' : color}
                          variant={color === 'default' ? 'outlined' : 'filled'}
                          sx={{
                            textTransform: 'capitalize',
                            backgroundColor: color === 'default' ? 'transparent' : undefined,
                            borderColor: 'rgba(255,255,255,0.28)',
                            color: 'rgba(255,255,255,0.85)',
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalOfferIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {formattedPrice}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AspectRatioIcon />
                    <Typography variant="body1">{formattedSize}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <RoomIcon sx={{ mt: 0.2 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.9)' }}>
                      {propertyData?.address || 'Ubicación no disponible'}
                    </Typography>
                  </Box>

                  {propertyData?.plusvalia_score !== undefined && propertyData?.plusvalia_score !== null && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Plusvalía estimada
                      </Typography>
                      <Chip
                        size="small"
                        label={`${propertyData.plusvalia_score}%`}
                        sx={{ backgroundColor: 'rgba(59,130,246,0.25)', color: 'rgba(255,255,255,0.9)', borderRadius: 1 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
                    {propertyData?.bedrooms && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                          Dormitorios
                        </Typography>
                        <Typography variant="body1">{propertyData.bedrooms}</Typography>
                      </Box>
                    )}
                    {propertyData?.bathrooms && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                          Baños
                        </Typography>
                        <Typography variant="body1">{propertyData.bathrooms}</Typography>
                      </Box>
                    )}
                    {propertyData?.parking_spaces && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                          Estacionamientos
                        </Typography>
                        <Typography variant="body1">{propertyData.parking_spaces}</Typography>
                      </Box>
                    )}
                    {propertyData?.year_built && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
                          Año construcción
                        </Typography>
                        <Typography variant="body1">{propertyData.year_built}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'rgba(226,232,240,0.88)' }}>
                  {propertyData?.description || 'Sin descripción disponible'}
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<HomeIcon />}
                  onClick={() => {
                    localStorage.setItem('skipAutoFlight', 'true');
                    navigate(`/property/${propertyData?.id}`);
                  }}
                  sx={{
                    mt: 'auto',
                    alignSelf: 'stretch',
                    borderRadius: 2,
                    borderColor: 'rgba(148,163,184,0.35)',
                    color: 'rgba(226,232,240,0.95)',
                    '&:hover': {
                      borderColor: 'rgba(148,163,184,0.6)',
                      backgroundColor: 'rgba(148,163,184,0.08)',
                    },
                  }}
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
