import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Fade,
  useTheme,
  useMediaQuery,
  Fab,
  Snackbar,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeIcon from '@mui/icons-material/Home';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TerrainIcon from '@mui/icons-material/Terrain';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { propertyService, tourService, imageService, authService, favoritesService } from '../../services/api';
import config from '../../config/environment';
import MapView from '../map/MapView';
import axios from 'axios';
import Pano2VRViewer from '../tours/Pano2VRViewer';
import UploadTourDialog from '../tours/UploadTourDialog';
import { AuthContext } from '../../App';
import { formatPrice, formatRentPrice } from '../../utils/formatters';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estados
  const [property, setProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [activeTourUrl, setActiveTourUrl] = useState(null);
  const [mapViewState, setMapViewState] = useState(null); // Será definido tras cargar propiedad
  const mapRef = useRef(null);
  const { currentUser, isAuthenticated, loading: authLoading } = useContext(AuthContext);

  const initialSkipAutoFly = (()=>{
    const flag = localStorage.getItem('skipAutoFlight');
    if (flag) localStorage.removeItem('skipAutoFlight');
    return flag === 'true';
  })();
  const [autoFlyCompleted, setAutoFlyCompleted] = useState(initialSkipAutoFly);

  const [uploadOpen, setUploadOpen] = useState(false);

  const [isFavorited, setIsFavorited] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Mantener el estado del mapa alineado con la propiedad cargada para evitar el "zoom-out" inicial.
  useEffect(() => {
    const center = getPropertyCenter();
    if (center && !center.some((v) => isNaN(v))) {
      setMapViewState((prev) => ({
        ...prev,
        longitude: center[0],
        latitude: center[1],
        zoom: autoFlyCompleted ? 14 : 11.5,
        pitch: autoFlyCompleted ? 0 : 45,
      }));
    }
  }, [property, autoFlyCompleted]);

  // Si llegamos con skipAutoFlight activo (autoFlyCompleted=true), centra el mapa
  // directamente en la propiedad una vez que los datos estén disponibles. Evitamos
  // alterar la vista si el tour ya está activo, y usamos un pitch intermedio para
  // que la transición sea menos brusca.
  useEffect(() => {
    const center = getPropertyCenter();
    if (autoFlyCompleted && !activeTourUrl && center && mapRef.current) {
      const mapInstance = mapRef.current.getMap ? mapRef.current.getMap() : mapRef.current;
      if (mapInstance && typeof mapInstance.jumpTo === 'function') {
        mapInstance.jumpTo({
          center,
          zoom: 14,
          pitch: 45,
          bearing: 0,
        });
      }
    }
  }, [autoFlyCompleted, property, activeTourUrl]);

  // Si el vuelo automático fue omitido (skipAutoFlight) pero existen tours válidos,
  // abrimos automáticamente el primero para evitar requerir un clic adicional.
  useEffect(() => {
    if (autoFlyCompleted && tours && tours.length > 0 && !activeTourUrl) {
      setActiveTourUrl(tours[0].url);
      setShowDetails(false);
    }
  }, [autoFlyCompleted, tours, activeTourUrl]);

  // Helper para obtener centro de la propiedad: usa lat/lng o calcula a partir del boundary polygon
  const getPropertyCenter = () => {
    // Convertir a número y validar
    const rawLon = property?.longitude;
    const rawLat = property?.latitude;
    const lon = rawLon !== undefined && rawLon !== null ? parseFloat(rawLon) : null;
    const lat = rawLat !== undefined && rawLat !== null ? parseFloat(rawLat) : null;

    if (!isNaN(lon) && !isNaN(lat)) {
      return [lon, lat];
    }
    // Si no hay lat/lng, intentar calcular a partir del polygon GeoJSON
    const coords = property?.boundary_polygon?.geometry?.coordinates?.[0];
    if (Array.isArray(coords) && coords.length > 2) {
      let sumX = 0, sumY = 0;
      coords.forEach(([x, y]) => {
        const numX = typeof x === 'string' ? parseFloat(x) : x;
        const numY = typeof y === 'string' ? parseFloat(y) : y;
        if (!isNaN(numX) && !isNaN(numY)) {
          sumX += numX;
          sumY += numY;
        }
      });
      const avgX = sumX / coords.length;
      const avgY = sumY / coords.length;
      if (!isNaN(avgX) && !isNaN(avgY)) {
        return [avgX, avgY];
      }
    }
    return null; // fallback
  };

  // Cargar datos de la propiedad
  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        
        // Cargar propiedad
        const propertyData = await propertyService.getProperty(id);
        setProperty(propertyData);
        
        // Cargar tours reales
        try {
          const actualTours = await tourService.getPropertyTours(id);
          setTours(actualTours.results || actualTours || []);
        } catch (tourError) {
          console.warn('No se pudieron cargar los tours para la propiedad:', tourError);
          setTours([]);
        }
        
        // Cargar imágenes reales
        try {
          const actualImages = await imageService.getImages(id);
          setImages(actualImages.results || actualImages || []);
        } catch (imageError) {
          console.warn('No se pudieron cargar las imágenes para la propiedad:', imageError);
          setImages([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar los datos de la propiedad:', err);
        setError('No se pudo cargar la información de la propiedad.');
        setLoading(false);
      }
    };
    
    fetchPropertyData();
  }, [id]);

  // Detectar ubicación del usuario y comenzar vuelo automático SOLO en PropertyDetails
  useEffect(() => {
    // Solo ejecutar animación si estamos realmente en PropertyDetails y no en otras páginas
    const isPropertyDetailsPage = window.location.pathname.includes('/property/') && 
                                   !window.location.pathname.includes('/create') && 
                                   !window.location.pathname.includes('/edit');
    
    if (!autoFlyCompleted && property && tours && mapRef.current && isPropertyDetailsPage) {
      // Esperar un poco para asegurar que el mapa esté completamente inicializado
      const timer = setTimeout(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              console.log(`🌍 Ubicación detectada: ${latitude}, ${longitude}`);
              console.log('🚁 Iniciando vuelo automático a la propiedad...');
              performAutoFlight(tours);
            },
            (error) => {
              console.log('📍 No se pudo obtener ubicación, usando Chile como país por defecto');
              performAutoFlight(tours);
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000
            }
          );
        } else {
          console.log('🌐 Geolocalización no disponible, usando Chile como país por defecto');
          performAutoFlight(tours);
        }
      }, 2000); // Revertido a 2000ms

      return () => clearTimeout(timer);
    }
  }, [property, tours, autoFlyCompleted]);

  // Función para realizar vuelo automático inicial simplificado
  const performAutoFlight = (availableTours) => {
    const center = getPropertyCenter();
    if (!mapRef.current || autoFlyCompleted || !center) {
      if (!center) setAutoFlyCompleted(true);
      return;
    }
    
    console.log('🚁 Iniciando vuelo directo a la propiedad...');

    // Primer tramo: vuelo cinematográfico directo al área de la propiedad
    mapRef.current.flyTo({
      center,
      zoom: 11.5,
      pitch: 45,
      bearing: 0,
      duration: 4500,
      essential: true,
    });

    // Segundo tramo: acercamiento final
    setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center,
        zoom: 16,
        pitch: 0,
        bearing: 0,
        duration: 2200,
        essential: true,
      });

      // Si hay tours disponibles, abrir automáticamente
      if (availableTours && availableTours.length > 0 && availableTours[0]?.url) {
        setTimeout(() => {
          if (!mapRef.current) return;
          setActiveTourUrl(availableTours[0].url);
          setShowDetails(false);
        }, 2300);
      }
      setAutoFlyCompleted(true);
    }, 4800);
  };

  // Calcular texto de precio según modalidad
  const getPriceDisplay = () => {
    if (!property) return '';
    switch (property.listing_type) {
      case 'rent':
        return formatRentPrice(property.rent_price);
      case 'both':
        return `${formatPrice(property.price)} o ${formatRentPrice(property.rent_price)}`;
      default:
        return formatPrice(property.price);
    }
  };

  // Botón regresar
  const handleGoBack = () => {
    navigate('/');
  };

  // Manejar cambio de tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Helper: check if logged user is owner or admin
  const isOwnerOrAdmin = currentUser && (currentUser.is_staff || (property?.owner_details && currentUser.id === property.owner_details.id));

  // Función para manejar la carga del mapa
  const handleMapLoad = () => {
    console.log('🗺️ Mapa de PropertyDetails cargado');
    // El vuelo automático se iniciará desde el useEffect cuando la propiedad esté cargada
  };

  useEffect(() => {
    if (property) {
      // registrar visita
      axios.post(`${config.api.baseURL}/property-visits/`, { property: property.id })
        .catch(err => console.warn('Error registrando visita', err));
    }
  }, [property]);

  useEffect(() => {
    if (isAuthenticated && currentUser && property?.id) {
      favoritesService.list()
        .then(favs => {
          setIsFavorited(favs.some(fav => fav.property === property.id));
        })
        .catch(err => console.error('Error fetching favorites:', err));
    }
  }, [isAuthenticated, currentUser, property?.id]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: 'Por favor, inicia sesión para guardar propiedades.',
        severity: 'warning'
      });
      return;
    }

    try {
      if (isFavorited) {
        // Encontrar y eliminar el favorito
        const favs = await favoritesService.list();
        const fav = favs.find(f => f.property === property.id);
        if (fav) {
          await favoritesService.remove(fav.id);
          setIsFavorited(false);
          setSnackbar({
            open: true,
            message: 'Propiedad eliminada de favoritos.',
            severity: 'info'
          });
        }
      } else {
        // Añadir a favoritos
        await favoritesService.add(property.id);
        setIsFavorited(true);
        setSnackbar({
          open: true,
          message: 'Propiedad guardada en favoritos!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error al alternar favorito:', error);
      setSnackbar({
        open: true,
        message: 'Error al guardar/eliminar propiedad. Intenta de nuevo.',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0d1117'
      }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0d1117',
        color: 'white',
        textAlign: 'center',
        p: 3
      }}>
        <Box>
          <Typography variant="h6" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={handleGoBack} sx={{ mt: 2 }}>
            Volver al mapa
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Mapa de fondo: Solo se muestra si no hay un tour activo */}
      {mapViewState && !activeTourUrl && (
        <MapView 
          ref={mapRef}
          initialViewState={mapViewState}
          editable={false}
          filters={{ propertyId: id }}
          onLoad={handleMapLoad}
          disableIntroAnimation={true}
        />
      )}

      {/* Iframe para el Tour 360° */}
      {activeTourUrl && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          zIndex: 20 // Encima del mapa y otros elementos que no sean de cierre del tour
        }}>
          <iframe
            src={activeTourUrl}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            allowFullScreen
            title="Tour Virtual 360°"
          />
          {/* Botón para cerrar el tour y volver al mapa/detalles */}
          <Fab
            onClick={() => {
              setActiveTourUrl(null);
              setShowDetails(true); // Volver a mostrar el panel de detalles
            }}
            size="medium"
            sx={{ 
              position: 'absolute', 
              top: isMobile ? '20px' : '30px', 
              right: isMobile ? '20px' : '30px', 
              zIndex: 21, // Encima del iframe
              backgroundColor: 'rgba(22, 27, 34, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              color: '#c9d1d9',
              '&:hover': {
                backgroundColor: 'rgba(22, 27, 34, 0.95)',
              }
            }}
            aria-label="Cerrar Tour"
          >
            <CloseIcon />
          </Fab>
        </Box>
      )}

      {/* Botón flotante para volver (si no hay tour activo) */}
      {!activeTourUrl && (
        <Fab
          onClick={handleGoBack}
          sx={{
            position: 'absolute',
            top: isMobile ? '20px' : '30px',
            right: isMobile ? '20px' : '30px',
            zIndex: 10,
            backgroundColor: 'rgba(22, 27, 34, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(30, 41, 59, 0.3)',
            color: '#c9d1d9',
            '&:hover': {
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              borderColor: 'rgba(30, 58, 138, 0.5)',
            }
          }}
        >
          <ArrowBackIcon />
        </Fab>
      )}

      {/* Panel de detalles flotante (si no hay tour activo y showDetails es true) */}
      {showDetails && !activeTourUrl && (
        <Fade in={showDetails && !activeTourUrl}>
          <Paper
            elevation={16}
            sx={{
              position: 'absolute',
              top: isMobile ? '80px' : '30px',
              left: isMobile ? '20px' : '30px',
              width: isMobile ? 'calc(100vw - 40px)' : '420px',
              maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 60px)',
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              borderRadius: '20px',
              overflow: 'hidden',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header del panel */}
            <Box sx={{ 
              p: 3, 
              borderBottom: '1px solid rgba(30, 41, 59, 0.2)',
              position: 'relative'
            }}>
              <IconButton
                onClick={() => setShowDetails(false)}
                sx={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  color: '#8b949e',
                  '&:hover': { color: '#c9d1d9' }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 300, 
                  color: '#c9d1d9',
                  mb: 1,
                  pr: 5 // Espacio para el botón cerrar
                }}
              >
                {property?.name}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 400, 
                    color: '#3b82f6' 
                  }}
                >
                  {getPriceDisplay()}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#8b949e',
                    fontWeight: 300
                  }}
                >
                  {property?.size?.toFixed(1)} ha
                </Typography>
              </Box>
              {/* Botón de favoritos */}
              {!authLoading && isAuthenticated && (
                <IconButton
                  onClick={handleFavoriteToggle}
                  sx={{
                    position: 'absolute',
                    top: '12px',
                    right: '50px',
                    color: isFavorited ? '#ef4444' : '#8b949e', // Rojo si es favorito, gris si no
                    '&:hover': { color: isFavorited ? '#dc2626' : '#c9d1d9' }
                  }}
                >
                  {isFavorited ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
              )}

              {/* Características rápidas */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={property?.type || 'Propiedad'} 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(30, 58, 138, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(30, 58, 138, 0.3)',
                    fontWeight: 300
                  }}
                />
                {property?.has_water && (
                  <Chip 
                    icon={<WaterDropIcon sx={{ fontSize: '16px !important' }} />}
                    label="Agua" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(30, 58, 138, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(30, 58, 138, 0.3)',
                      fontWeight: 300
                    }}
                  />
                )}
                {property?.has_views && (
                  <Chip 
                    icon={<VisibilityIcon sx={{ fontSize: '16px !important' }} />}
                    label="Vistas" 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(30, 58, 138, 0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(30, 58, 138, 0.3)',
                      fontWeight: 300
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderBottom: '1px solid rgba(30, 41, 59, 0.2)',
                '& .MuiTab-root': {
                  color: '#8b949e',
                  fontWeight: 300,
                  textTransform: 'none',
                  minHeight: '48px',
                  '&.Mui-selected': {
                    color: '#3b82f6'
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#3b82f6'
                }
              }}
            >
              <Tab label="Detalles" />
              <Tab label="Tours 360°" />
              <Tab label="Ubicación" />
              {isOwnerOrAdmin && (
                <Tab label="Documentos" />
              )}
            </Tabs>

            {/* Contenido scrolleable */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {activeTab === 0 && (
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#8b949e', 
                      mb: 3, 
                      lineHeight: 1.6,
                      fontWeight: 300
                    }}
                  >
                    {property?.description || 'Hermosa propiedad con excelente ubicación y características únicas.'}
                  </Typography>

                  <List sx={{ p: 0 }}>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <LocationOnIcon sx={{ color: '#3b82f6', fontSize: '20px' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Coordenadas"
                        secondary={property?.latitude ? `${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}` : 'No disponible'}
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 300, 
                          color: '#c9d1d9' 
                        }}
                        secondaryTypographyProps={{ 
                          fontSize: '0.8rem', 
                          color: '#8b949e' 
                        }}
                      />
                    </ListItem>
                    
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <SquareFootIcon sx={{ color: '#3b82f6', fontSize: '20px' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Superficie"
                        secondary={`${property?.size?.toFixed(1)} hectáreas`}
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 300, 
                          color: '#c9d1d9' 
                        }}
                        secondaryTypographyProps={{ 
                          fontSize: '0.8rem', 
                          color: '#8b949e' 
                        }}
                      />
                    </ListItem>
                    
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <AttachMoneyIcon sx={{ color: '#3b82f6', fontSize: '20px' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={property?.listing_type === 'rent' ? 'Precio mensual de arriendo' : (property?.listing_type === 'both' ? 'Precio de venta / arriendo' : 'Precio de venta')}
                        secondary={property?.listing_type === 'rent' ? formatRentPrice(property?.rent_price) : (property?.listing_type === 'both' ? `${formatPrice(property?.price)} / ${formatRentPrice(property?.rent_price)}` : formatPrice(property?.price))}
                        primaryTypographyProps={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 300, 
                          color: '#c9d1d9' 
                        }}
                        secondaryTypographyProps={{ 
                          fontSize: '0.8rem', 
                          color: '#8b949e' 
                        }}
                      />
                    </ListItem>

                    {property?.plusvalia_score !== null && currentUser?.is_staff && (
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                          <TrendingUpIcon sx={{ color: '#3b82f6', fontSize: '20px' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Plusvalía (IA)"
                          secondary={`${Number(property.plusvalia_score).toFixed(2)} / 100`}
                          primaryTypographyProps={{
                            fontSize: '0.9rem',
                            fontWeight: 300,
                            color: '#c9d1d9'
                          }}
                          secondaryTypographyProps={{ fontSize: '0.8rem', color: '#8b949e' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  {isOwnerOrAdmin ? (
                    <Box sx={{ mb:2 }}>
                      <Button variant="outlined" size="small" onClick={()=>setUploadOpen(true)}>Subir nuevo tour</Button>
                    </Box>
                  ):null}

                  {tours.length === 0 ? (
                    <Typography 
                      variant="body2" 
                      sx={{ color: '#8b949e', textAlign: 'center', py: 4 }}
                    >
                      No hay tours 360° disponibles para esta propiedad.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {tours.filter(t => t && t.url && (['package', '360'].includes(t.type) || !t.type)).map(tour => (
                        <Box key={tour.id} sx={{ height: 400, borderRadius: '12px', overflow: 'hidden' }}>
                           <Pano2VRViewer src={tour.url} title={tour.name || property.name} />
                        </Box>
                      ))}
                      {/* Lógica para otros tipos de tour (video, etc) podría ir aquí */}
                    </Box>
                  )}
                  <UploadTourDialog open={uploadOpen} onClose={()=>setUploadOpen(false)} propertyId={property.id} onUploaded={async()=>{
                       try{
                          const data = await tourService.getPropertyTours ? tourService.getPropertyTours(property.id) : tourService.getTours(property.id);
                          setTours(data.results || data);
                        }catch(e){console.error(e);}  }}/>
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#8b949e', 
                      mb: 2,
                      fontWeight: 300
                    }}
                  >
                    La propiedad está ubicada en las coordenadas mostradas en el mapa. 
                    Puedes explorar el área usando los controles del mapa.
                  </Typography>
                  
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(13, 17, 23, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid rgba(30, 41, 59, 0.2)'
                  }}>
                    <Typography 
                      variant="caption" 
                      sx={{ color: '#8b949e', display: 'block', mb: 1 }}
                    >
                      Coordenadas GPS
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ color: '#c9d1d9', fontWeight: 300 }}
                    >
                      {property?.latitude?.toFixed(6)}, {property?.longitude?.toFixed(6)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Documentos Tab (index depends on isOwnerOrAdmin) */}
              {isOwnerOrAdmin && activeTab === 3 && (
                <Box>
                  {(!property?.documents || property.documents.length === 0) ? (
                    <Typography variant="body2" sx={{ color: '#8b949e', textAlign: 'center', py: 4 }}>
                      No hay documentos cargados aún.
                    </Typography>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {property.documents.map((doc) => (
                        <ListItem key={doc.id} sx={{ px: 0, py: 1, display:'flex', alignItems:'center', gap:1 }}>
                          <ListItemIcon sx={{ minWidth: '40px' }}>
                            <ViewInArIcon sx={{ color: '#3b82f6', fontSize: '20px' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={doc.doc_type ? doc.doc_type.toUpperCase() : 'Documento'}
                            secondary={doc.description || ''}
                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 300, color: '#c9d1d9' }}
                            secondaryTypographyProps={{ fontSize: '0.8rem', color: '#8b949e' }}
                          />
                          <Chip
                            label={
                              doc.status === 'approved' ? 'Aprobado' : (doc.status === 'rejected' ? 'Rechazado' : 'Pendiente')
                            }
                            size="small"
                            sx={(theme) => ({
                              backgroundColor: doc.status === 'approved' ? theme.palette.success.light : (doc.status === 'rejected' ? theme.palette.error.light : 'rgba(255,255,255,0.1)'),
                              color: doc.status === 'approved' ? theme.palette.success.contrastText : (doc.status === 'rejected' ? theme.palette.error.contrastText : theme.palette.text.secondary),
                              fontWeight: 400,
                            })}
                          />
                          <Button
                            href={doc.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            sx={{ ml: 1, textTransform: 'none', borderColor:'rgba(30, 58, 138, 0.4)', color:'#60a5fa', '&:hover':{ borderColor:'rgba(30, 58, 138, 0.6)', backgroundColor:'rgba(30, 58, 138, 0.1)' } }}
                          >
                            Ver
                          </Button>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}
            </Box>

            {/* Botón de contacto */}
            <Box sx={{ p: 3, borderTop: '1px solid rgba(30, 41, 59, 0.2)' }}>
              <Button 
                variant="contained" 
                fullWidth
                sx={{ 
                  backgroundColor: 'rgba(30, 58, 138, 0.9)',
                  color: 'white',
                  fontWeight: 400,
                  textTransform: 'none',
                  borderRadius: '12px',
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'rgba(30, 58, 138, 1)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                Contactar agente
              </Button>
            </Box>
          </Paper>
        </Fade>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', bgcolor: snackbar.severity === 'success' ? '#28a745' : snackbar.severity === 'error' ? '#dc3545' : '#ffc107' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PropertyDetails; 