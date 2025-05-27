import React, { useState, useEffect } from 'react';
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
  const [mapViewState, setMapViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.2,
    pitch: 0,
    bearing: 0
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
        
        // Cargar tours (simulados)
        const toursData = {
          results: [
            {
              id: 1,
              title: "Vista principal 360°",
              thumbnail: "https://via.placeholder.com/300x200?text=Tour+360",
              url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/cerro-toco-0.jpg",
              property_id: id
            },
            {
              id: 2,
              title: "Recorrido del terreno",
              thumbnail: "https://via.placeholder.com/300x200?text=Tour+2",
              url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/alma.jpg",
              property_id: id
            }
          ]
        };
        setTours(toursData.results);
        
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

  // Detectar ubicación del usuario y comenzar vuelo automático
  useEffect(() => {
    if (!autoFlyCompleted && property && mapRef.current) {
      // Esperar un poco para asegurar que el mapa esté completamente inicializado
      const timer = setTimeout(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const userCountry = getCountryFromCoords(latitude, longitude);
              console.log(`🌍 Ubicación detectada: ${userCountry} (${latitude}, ${longitude})`);
              console.log(`🚁 Iniciando vuelo automático para ${userCountry}`);
              performAutoFlight(userCountry);
            },
            (error) => {
              console.log('📍 No se pudo obtener ubicación, usando vuelo por defecto');
              performAutoFlight('default');
            },
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 300000
            }
          );
        } else {
          console.log('🌐 Geolocalización no disponible, usando vuelo por defecto');
          performAutoFlight('default');
        }
      }, 2000); // Esperar 2 segundos después de que la propiedad esté cargada

      return () => clearTimeout(timer);
    }
  }, [property, autoFlyCompleted]);

  // Función para determinar el país basado en la ubicación
  const getCountryFromCoords = (lat, lon) => {
    // Chile: latitud aproximada -17 a -56, longitud -66 a -75
    if (lat >= -56 && lat <= -17 && lon >= -75 && lon <= -66) {
      return 'chile';
    }
    // USA: latitud aproximada 25 a 49, longitud -125 a -66
    if (lat >= 25 && lat <= 49 && lon >= -125 && lon <= -66) {
      return 'usa';
    }
    return 'default';
  };

  // Función para realizar vuelo automático inicial
  const performAutoFlight = (userCountry = 'default') => {
    if (!mapRef.current || autoFlyCompleted) return;

    const flightPath = countryFlightPaths[userCountry];
    let currentStep = 0;

    const flyToNextPoint = () => {
      if (currentStep >= flightPath.length) {
        // Al final del vuelo, volar a la propiedad específica
        if (property?.latitude && property?.longitude) {
          setTimeout(() => {
            mapRef.current.flyTo({
              center: [property.longitude, property.latitude],
              zoom: 14,
              pitch: 60,
              bearing: 0,
              duration: 3000,
              essential: true,
            });
          }, 1000);
        }
        setAutoFlyCompleted(true);
        return;
      }

      const point = flightPath[currentStep];
      mapRef.current.flyTo({
        center: point.center,
        zoom: point.zoom,
        pitch: point.pitch,
        bearing: point.bearing,
        duration: currentStep === 0 ? 3000 : 4000,
        essential: true,
      });

      currentStep++;
      
      setTimeout(() => {
        flyToNextPoint();
      }, currentStep === 1 ? 3500 : 4500);
    };

    setTimeout(() => {
      flyToNextPoint();
    }, 1500);
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
      {/* Mapa de fondo con vuelo automático */}
      <MapView 
        ref={mapRef}
        initialViewState={mapViewState}
        editable={false}
        filters={{ propertyId: id }}
        onLoad={handleMapLoad}
      />

      {/* Botón flotante para volver */}
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

      {/* Panel de detalles flotante */}
      <Fade in={showDetails}>
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
                {formatPrice(property?.price)}
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
                      primary="Precio total"
                      secondary={formatPrice(property?.price)}
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
                        onClick={() => window.open(tour.url, '_blank')}
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

      {/* Botón para mostrar detalles si están ocultos */}
      {!showDetails && (
        <Fab
          onClick={() => setShowDetails(true)}
          sx={{
            position: 'absolute',
            top: isMobile ? '80px' : '30px',
            left: isMobile ? '20px' : '30px',
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
          <HomeIcon />
        </Fab>
      )}
    </Box>
  );
};

export default PropertyDetails; 