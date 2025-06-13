import React, { useState, useEffect, useRef } from 'react';
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
  Fab
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
import { propertyService, tourService, imageService } from '../../services/api';
import MapView from '../map/MapView';

// Países y sus recorridos de vuelo
const countryFlightPaths = {
  chile: [
    { center: [-70.6693, -33.4489], zoom: 6, pitch: 45, bearing: 0 }, // Santiago
    { center: [-72.6927, -45.4023], zoom: 7, pitch: 50, bearing: 30 }, // Aysén
    { center: [-72.9895, -41.3139], zoom: 8, pitch: 55, bearing: 60 }, // Puerto Varas
    { center: [-73.2459, -39.8142], zoom: 7, pitch: 45, bearing: 90 }, // Valdivia
    { center: [-70.9171, -53.1638], zoom: 6, pitch: 40, bearing: 120 }, // Punta Arenas
  ],
  usa: [
    { center: [-95.7129, 37.0902], zoom: 4, pitch: 30, bearing: 0 }, // Centro USA
    { center: [-119.7871, 36.7783], zoom: 6, pitch: 45, bearing: 45 }, // California
    { center: [-105.0178, 39.7392], zoom: 6, pitch: 50, bearing: 90 }, // Colorado
    { center: [-87.6298, 41.8781], zoom: 7, pitch: 45, bearing: 135 }, // Chicago
  ],
  default: [
    { center: [0, 20], zoom: 2, pitch: 30, bearing: 0 },
    { center: [-70, -30], zoom: 4, pitch: 45, bearing: 60 },
    { center: [120, 30], zoom: 4, pitch: 40, bearing: 120 },
  ]
};

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados
  const [property, setProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [autoFlyCompleted, setAutoFlyCompleted] = useState(false);
  const [activeTourUrl, setActiveTourUrl] = useState(null);
  const [mapViewState, setMapViewState] = useState({
    longitude: -70.6693, // Santiago, Chile
    latitude: -33.4489,  // Santiago, Chile
    zoom: 6.5,          // Regional zoom for Chile
    pitch: 30,          // Initial pitch
    bearing: 0          // Initial bearing
  });
  const mapRef = useRef(null);

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
        
        // Cargar imágenes (simuladas)
        const imagesData = {
          results: [
            {
              id: 1,
              title: "Vista aérea",
              type: "aerial",
              url: "https://via.placeholder.com/800x600?text=Vista+Aerea",
              property_id: id
            },
            {
              id: 2,
              title: "Mapa topográfico",
              type: "topography",
              url: "https://via.placeholder.com/800x600?text=Mapa+Topografico",
              property_id: id
            },
            {
              id: 3,
              title: "Estudio legal",
              type: "legal",
              url: "https://via.placeholder.com/800x600?text=Documentos+Legales",
              property_id: id
            }
          ]
        };
        setImages(imagesData.results);
        
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
    if (!mapRef.current || autoFlyCompleted || !property?.latitude || !property?.longitude) {
      if (!property?.latitude || !property?.longitude) setAutoFlyCompleted(true);
      return;
    }
    
    console.log('🚁 Iniciando vuelo mejorado a la propiedad...');

    // Vista inicial: Chile más cerca (zoom regional)
    const chileInitialView = {
      center: [-70.6693, -33.4489], // Santiago como referencia central de Chile
      zoom: 6.5, // Zoom regional, no global
      pitch: 30, 
      bearing: 0
    };

    // Primer tramo: Moverse a la vista regional de Chile
    mapRef.current.flyTo({
      ...chileInitialView,
      duration: 1800, // Revertido a 1800ms
      essential: true,
    });

    // Segundo tramo: Desde la vista de Chile a la propiedad
    setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [property.longitude, property.latitude],
        zoom: 12, 
        pitch: 45, 
        bearing: 0,
        duration: 2500, // Revertido a 2500ms
        essential: true,
      });

      // Tercer tramo: Zoom final a la propiedad para el tour
      setTimeout(() => {
        if (!mapRef.current) return;
        mapRef.current.flyTo({
          center: [property.longitude, property.latitude],
          zoom: 16, 
          pitch: 0,  
          bearing: 0,
          duration: 2000, // Revertido a 2000ms
          essential: true,
        });

        if (availableTours && availableTours.length > 0 && availableTours[0]?.url) {
          setTimeout(() => {
            if (!mapRef.current) return;
            setActiveTourUrl(availableTours[0].url);
            setShowDetails(false); 
          }, 2100); // Revertido a 2100ms
        }
        setAutoFlyCompleted(true);
      }, 2600); // Revertido a 2600ms

    }, 1900); // Revertido a 1900ms
  };

  // Formateador para precio
  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price?.toLocaleString()}`;
  };

  // Formateador para precio de arriendo (mensual)
  const formatRentPrice = (price) => {
    if (!price) return 'Precio no disponible';
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M/mes`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K/mes`;
    }
    return `$${price?.toLocaleString()}/mes`;
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

  // Función para manejar la carga del mapa
  const handleMapLoad = () => {
    console.log('🗺️ Mapa de PropertyDetails cargado');
    // El vuelo automático se iniciará desde el useEffect cuando la propiedad esté cargada
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
      {!activeTourUrl && (
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
                  </List>
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  {tours.length === 0 ? (
                    <Typography 
                      variant="body2" 
                      sx={{ color: '#8b949e', textAlign: 'center', py: 4 }}
                    >
                      No hay tours disponibles
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {tours.map(tour => (
                        <Card 
                          key={tour.id}
                          sx={{ 
                            backgroundColor: 'rgba(13, 17, 23, 0.8)',
                            border: '1px solid rgba(30, 41, 59, 0.2)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: 'rgba(30, 58, 138, 0.4)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                          onClick={() => {
                            setActiveTourUrl(tour.url);
                            setShowDetails(false);
                          }}
                        >
                          <CardMedia
                            component="img"
                            height="120"
                            image={tour.thumbnail}
                            alt={tour.title}
                          />
                          <CardContent sx={{ p: 2 }}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                color: '#c9d1d9', 
                                fontWeight: 300,
                                mb: 1
                              }}
                            >
                              {tour.title}
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small"
                              startIcon={<ViewInArIcon />}
                              sx={{ 
                                borderColor: 'rgba(30, 58, 138, 0.4)',
                                color: '#60a5fa',
                                fontWeight: 300,
                                textTransform: 'none',
                                '&:hover': {
                                  borderColor: 'rgba(30, 58, 138, 0.6)',
                                  backgroundColor: 'rgba(30, 58, 138, 0.1)'
                                }
                              }}
                            >
                              Ver tour 360°
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
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
    </Box>
  );
};

export default PropertyDetails; 