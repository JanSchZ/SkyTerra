import React, { useState, useEffect, useRef, useCallback, useContext, useImperativeHandle, forwardRef } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, IconButton, Snackbar, Alert, Fab } from '@mui/material';
import { propertyService, tourService } from '../../services/api';
import Map, { NavigationControl, Popup, Source, Layer, AttributionControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import EditIcon from '@mui/icons-material/Edit';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import PropertyBoundaryDraw from './PropertyBoundaryDraw';
import { useNavigate } from 'react-router-dom';
import { ThemeModeContext } from '../../App';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import config from '../../config/environment';
import { motion } from 'framer-motion';

// Function to transform properties to GeoJSON
const propertiesToGeoJSON = (properties) => ({
  type: 'FeatureCollection',
  features: properties.map(prop => ({
    type: 'Feature',
    properties: { ...prop }, // Keep all property data here
    geometry: {
      type: 'Point',
      coordinates: [prop.longitude, prop.latitude]
    }
  }))
});

const MapView = forwardRef(({ filters, editable = false, onBoundariesUpdate, initialViewState: propInitialViewState, initialGeoJsonBoundary, onLoad }, ref) => {
  const navigate = useNavigate();
  const { mode, theme } = useContext(ThemeModeContext);
  // Estados
  const [properties, setProperties] = useState([]);
  const [propertiesGeoJSON, setPropertiesGeoJSON] = useState(propertiesToGeoJSON([])); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vista inicial del mapa: Chile por defecto (asumiendo dominio .cl) pero más alejada
  const initialMapViewState = {
    longitude: -71.5430, // Centro de Chile
    latitude: -35.6751,  // Centro de Chile
    zoom: 3.5,           // Zoom más alejado para luego hacer el tour cinematográfico
    pitch: 30,           // Vista cinematográfica inicial suave
    bearing: 0,          // Sin rotación inicial
  };

  const [viewState, setViewState] = useState(propInitialViewState || initialMapViewState);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [isDrawingMode, setIsDrawingMode] = useState(editable);
  const [propertyBoundaries, setPropertyBoundaries] = useState(initialGeoJsonBoundary || null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [navigatingToTour, setNavigatingToTour] = useState(false);
  const [autoFlyCompleted, setAutoFlyCompleted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const mapRef = useRef(null);

  // Textos descriptivos rotativos
  const descriptiveTexts = [
    {
      title: "SkyTerra",
      subtitle: "Descubre propiedades únicas desde el cielo",
      description: "Explora terrenos y propiedades con vistas aéreas cinematográficas"
    },
    {
      title: "Tecnología Inmersiva",
      subtitle: "Tours 360° y mapas interactivos",
      description: "Navega propiedades con la última tecnología de visualización"
    },
    {
      title: "Chile y el Mundo", 
      subtitle: "Propiedades en ubicaciones excepcionales",
      description: "Desde la Patagonia hasta los Andes, encuentra tu lugar ideal"
    },
    {
      title: "Experiencia Única",
      subtitle: "Búsqueda inteligente con IA",
      description: "Encuentra propiedades usando lenguaje natural y filtros avanzados"
    }
  ];

  // Rotar texto cada 6 segundos
  useEffect(() => {
    if (!showOverlay) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % descriptiveTexts.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [showOverlay, descriptiveTexts.length]);

  // Ocultar overlay cuando la animación termine
  useEffect(() => {
    if (autoFlyCompleted) {
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 2000); // Dar 2 segundos extra después de completar la animación
      return () => clearTimeout(timer);
    }
  }, [autoFlyCompleted]);

  // Función para omitir la animación
  const handleSkipAnimation = () => {
    setAutoFlyCompleted(true);
    setShowOverlay(false);
  };

  const mapStyle = config.mapbox.style;
  
  useEffect(() => {
    console.log('🎨 Usando estilo SkyTerra Custom (Minimal Fog)');
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const params = { ...filters }; 
        const data = await propertyService.getProperties(params);
        const activeProperties = data.results || [];
        setProperties(activeProperties);
        setPropertiesGeoJSON(propertiesToGeoJSON(activeProperties)); 
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar propiedades:', err);
        setError('No se pudieron cargar las propiedades. Intente nuevamente más tarde.');
        setProperties([]);
        setPropertiesGeoJSON(propertiesToGeoJSON([])); 
        setLoading(false);
      }
    };

    if (!editable) { 
        fetchProperties();
    }
     else {
        setLoading(false); 
        setProperties([]);
        setPropertiesGeoJSON(propertiesToGeoJSON([]));
    }
  }, [filters, editable]);

  const MAPBOX_TOKEN = config.mapbox.accessToken;

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price}`;
  };

  const handleMarkerClick = async (property) => {
    if (!mapRef.current || navigatingToTour) return;
    setNavigatingToTour(true);
    setSelectedProperty(property.id);

    const targetLongitude = property.longitude || -70.6693;
    const targetLatitude = property.latitude || -33.4489;

    mapRef.current.flyTo({
      center: [targetLongitude, targetLatitude],
      zoom: 15, 
      pitch: 60, // Mantener pitch 3D
      bearing: viewState.bearing,
      duration: 3500, 
      essential: true,
    });

    setTimeout(async () => {
      try {
        const tourData = await tourService.getTours(property.id);
        if (tourData && tourData.results && tourData.results.length > 0) {
          const firstTourId = tourData.results[0].id;
          localStorage.setItem('directTourNavigation', 'true');
          navigate(`/tour/${firstTourId}`);
        } else {
          setSnackbar({
            open: true,
            message: 'No hay tours 360° disponibles para esta propiedad.',
            severity: 'info'
          });
          navigate(`/property/${property.id}`); 
        }
      } catch (error) {
        console.error('Error fetching tours or navigating:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar el tour o detalles de la propiedad.',
          severity: 'error'
        });
        navigate(`/property/${property.id}`);
      } finally {
        setTimeout(() => setNavigatingToTour(false), 500);
      }
    }, 2600); 
  };

  const handleMarkerHover = (property) => {
    setPopupInfo(property);
    clearTimeout(window.tooltipHideTimeout);
  };

  const handleMarkerLeave = () => {
    window.tooltipHideTimeout = setTimeout(() => {
      setPopupInfo(null);
    }, 100); 
  };

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
    if (isDrawingMode && propertyBoundaries) {
      setSnackbar({
        open: true,
        message: `Límites de propiedad guardados: ${propertyBoundaries.area} hectáreas`,
        severity: 'success'
      });
    }
  };

  const handleBoundariesUpdate = (boundaries) => {
    setPropertyBoundaries(boundaries);
    if (onBoundariesUpdate) {
      onBoundariesUpdate(boundaries);
    }
    console.log('Boundaries updated:', boundaries);
  };

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

  // Función para realizar vuelo automático inicial sobre propiedades reales
  const performAutoFlight = async (userCountry = 'default') => {
    if (!mapRef.current || autoFlyCompleted) return;

    try {
      // Obtener algunas propiedades para volar sobre ellas
      const response = await propertyService.getProperties({ page_size: 50 });
      const availableProperties = response.results || [];
      
      if (availableProperties.length === 0) {
        // Fallback a vuelo genérico si no hay propiedades
        const flightPath = countryFlightPaths[userCountry];
        let currentStep = 0;

        const flyToNextPoint = () => {
          if (currentStep >= flightPath.length) {
            setAutoFlyCompleted(true);
            return;
          }

          const point = flightPath[currentStep];
          mapRef.current.flyTo({
            center: point.center,
            zoom: point.zoom,
            pitch: point.pitch,
            bearing: point.bearing,
            duration: currentStep === 0 ? 5000 : 6000,
            essential: true,
          });

          currentStep++;
          setTimeout(() => {
            flyToNextPoint();
          }, currentStep === 1 ? 6000 : 7000);
        };

        setTimeout(() => {
          flyToNextPoint();
        }, 2000); // Retraso inicial antes de empezar el vuelo
        return;
      }

      // Seleccionar 4-5 propiedades representativas de diferentes regiones
      const selectedProperties = [];
      
      // Buscar propiedades en diferentes rangos de latitud para cubrir Chile de norte a sur
      const latRanges = [
        { min: -35, max: -30, name: "Centro" },        // Santiago/Centro
        { min: -40, max: -35, name: "Centro-Sur" },    // Araucanía/Los Ríos  
        { min: -45, max: -40, name: "Sur" },           // Los Lagos
        { min: -50, max: -45, name: "Aysén" },         // Aysén
        { min: -55, max: -50, name: "Magallanes" }     // Magallanes
      ];

      for (const range of latRanges) {
        const propertiesInRange = availableProperties.filter(prop => 
          prop.latitude >= range.min && prop.latitude < range.max
        );
        if (propertiesInRange.length > 0) {
          const randomProperty = propertiesInRange[Math.floor(Math.random() * propertiesInRange.length)];
          selectedProperties.push({
            center: [randomProperty.longitude, randomProperty.latitude],
            zoom: Math.random() > 0.5 ? 8 : 10, // Variar zoom
            pitch: 30 + Math.random() * 30, // Pitch entre 30-60
            bearing: Math.random() * 360, // Bearing aleatorio
            name: randomProperty.name
          });
        }
      }

      // Si no encontramos suficientes, agregar algunas propiedades al azar
      if (selectedProperties.length < 3) {
        const shuffled = [...availableProperties].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
          const prop = shuffled[i];
          selectedProperties.push({
            center: [prop.longitude, prop.latitude],
            zoom: 8 + Math.random() * 4,
            pitch: 30 + Math.random() * 30,
            bearing: Math.random() * 360,
            name: prop.name
          });
        }
      }

      let currentStep = 0;
      const flyToNextProperty = () => {
        if (currentStep >= selectedProperties.length) {
          setAutoFlyCompleted(true);
          return;
        }

        const property = selectedProperties[currentStep];
        console.log(`🏞️ Volando sobre: ${property.name}`);
        
        mapRef.current.flyTo({
          ...property,
          duration: currentStep === 0 ? 5000 : 6000,
          essential: true,
        });

        currentStep++;
        setTimeout(() => {
          flyToNextProperty();
        }, currentStep === 1 ? 6000 : 7000);
      };

      setTimeout(() => {
        flyToNextProperty();
      }, 2000); // Retraso inicial antes de empezar el vuelo

    } catch (error) {
      console.error('Error obteniendo propiedades para animación:', error);
      // Fallback a animación original
      const flightPath = countryFlightPaths[userCountry];
      let currentStep = 0;

      const flyToNextPoint = () => {
        if (currentStep >= flightPath.length) {
          setAutoFlyCompleted(true);
          return;
        }

        const point = flightPath[currentStep];
        mapRef.current.flyTo({
          ...point,
          duration: currentStep === 0 ? 5000 : 6000,
          essential: true,
        });

        currentStep++;
        setTimeout(() => {
          flyToNextPoint();
        }, currentStep === 1 ? 6000 : 7000);
      };

      setTimeout(() => {
        flyToNextPoint();
      }, 2000); // Retraso inicial antes de empezar el vuelo
    }
  };

  // Detectar ubicación del usuario y comenzar vuelo automático
  useEffect(() => {
    if (!autoFlyCompleted) {
      // Esperar un poco para que el mapa se inicialice completamente
      const initTimer = setTimeout(() => {
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
              console.log('📍 No se pudo obtener ubicación, usando Chile como país por defecto');
              performAutoFlight('chile');
            },
            {
              enableHighAccuracy: false,
              timeout: 3000,
              maximumAge: 300000
            }
          );
        } else {
          console.log('🌐 Geolocalización no disponible, usando Chile por defecto');
          performAutoFlight('chile');
        }
      }, 1500); // Esperar 1.5 segundos para inicialización del mapa

      return () => clearTimeout(initTimer);
    }
  }, []); // Solo ejecutar una vez al montar

  // Función para ir a la ubicación actual del usuario (botón manual)
  const handleGoToMyLocation = () => {
    if (!navigator.geolocation) {
      setSnackbar({
        open: true,
        message: 'La geolocalización no está soportada en este navegador.',
        severity: 'warning'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 12,
            pitch: 45,
            bearing: 0,
            duration: 2000,
            essential: true,
          });
        }
        setSnackbar({
          open: true,
          message: 'Te llevé a tu ubicación actual',
          severity: 'success'
        });
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        setSnackbar({
          open: true,
          message: 'No se pudo obtener tu ubicación. Verifica los permisos.',
          severity: 'error'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const onMapLoad = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      console.log('🗺️ Mapa cargado, configurando...');
      
      // El terreno 3D se configura directamente en el estilo del mapa (skyTerraCustomStyle)
      // No es necesario map.setTerrain aquí si ya está en el estilo.
      // Asegurarse que 'mapbox-dem' esté en las fuentes del estilo.
      if (map.getSource('mapbox-dem') && map.getTerrain() === null) {
         console.log('Aplicando configuración de terreno desde el estilo...');
         // Esto podría ser redundante si el estilo lo define bien.
         map.setTerrain({ source: 'mapbox-dem', exaggeration: config.mapbox.styles.dark.terrain.exaggeration || 1.5 });
      } else if (!map.getSource('mapbox-dem')){
         console.warn("⚠️ Fuente 'mapbox-dem' no encontrada en el estilo al cargar.")
      }
      
      map.on('error', (e) => {
        console.error('❌ Mapbox GL Error:', e.error ? e.error.message : e);
        if (e.error && e.error.message && !e.error.message.includes('terrain')) {
          console.error('Error crítico de Mapbox:', e.error);
        }
      });

      map.on('sourcedata', (e) => {
        if (e.sourceId === 'composite' && e.isSourceLoaded) {
          console.log('✅ Fuente composite cargada');
        }
        if (e.sourceId === 'mapbox-dem' && e.isSourceLoaded) {
          console.log('✅ Fuente de terreno cargada');
        }
      });

      console.log('✅ Configuración del mapa completada');
      
      // Llamar al callback externo si existe
      if (onLoad) {
        onLoad();
      }
    }
  };
  
  const renderPropertyBoundaries = (property) => {
    if (property && property.boundary_polygon && property.boundary_polygon.coordinates) {
      return (
        <Source
          id={`boundary-source-${property.id}`}
          type="geojson"
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: property.boundary_polygon.coordinates
            }
          }}
        >
          <Layer
            id={`boundary-fill-${property.id}`}
            type="fill"
            paint={{
              'fill-color': selectedProperty === property.id ? '#4CAF50' : '#2196F3',
              'fill-opacity': selectedProperty === property.id ? 0.3 : 0.1,
            }}
          />
          <Layer
            id={`boundary-line-${property.id}`}
            type="line"
            paint={{
              'line-color': selectedProperty === property.id ? '#4CAF50' : '#2196F3',
              'line-width': selectedProperty === property.id ? 3 : 2,
            }}
          />
        </Source>
      );
    }
    return null;
  };

  const clusterLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'properties-source',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#10b981', // Verde esmeralda para pocos
        10,
        '#059669', // Verde medio para grupos medianos
        50,
        '#047857'  // Verde oscuro para muchos
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        18, 
        10,
        24, 
        50,
        32  
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.8
    }
  };

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol',
    source: 'properties-source',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
        'text-color': '#ffffff'
    }
  };

  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle', 
    source: 'properties-source',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#10b981', // Verde esmeralda principal
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 4,   // Zoom bajo = puntos pequeños
        12, 8,  // Zoom medio = puntos medianos  
        16, 12  // Zoom alto = puntos grandes
      ],
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 1,   // Borde fino en zoom bajo
        12, 2,  // Borde medio en zoom medio
        16, 3   // Borde grueso en zoom alto
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.9,
      'circle-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 0.7,   // Menos opaco de lejos
        12, 0.9,  // Más opaco cerca
        16, 1     // Completamente opaco muy cerca
      ]
    }
  };
  
  const onMapClick = useCallback(event => {
    if (navigatingToTour) return;
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: [unclusteredPointLayer.id, clusterLayer.id] 
    });

    if (features && features.length > 0) {
      const feature = features[0];
      if (feature.layer.id === unclusteredPointLayer.id) {
        handleMarkerClick(feature.properties);
      } else if (feature.layer.id === clusterLayer.id && feature.properties.cluster) {
        const clusterId = feature.properties.cluster_id;
        const source = mapRef.current.getSource('properties-source');
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          mapRef.current.easeTo({
            center: feature.geometry.coordinates,
            zoom: zoom,
            duration: 750
          });
        });
      }
    }
  }, [navigatingToTour, handleMarkerClick]);

  const onMapMouseMove = useCallback(event => {
    if (mapRef.current) {
      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: [unclusteredPointLayer.id]
      });
      mapRef.current.getCanvas().style.cursor = features && features.length > 0 ? 'pointer' : '';
      if (features && features.length > 0) {
        const feature = features[0];
        setPopupInfo({
          ...feature.properties,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        });
      } else {
        setPopupInfo(null);
      }
    }
  }, []); 

  const onMapMouseLeave = useCallback(() => {
    if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = '';
    }
    setPopupInfo(null);
  }, []);

  useImperativeHandle(ref, () => ({
    getMap: () => {
      return mapRef.current ? mapRef.current.getMap() : null;
    },
    flyTo: (options) => {
      if (mapRef.current) {
        mapRef.current.flyTo(options);
      }
    }
  }));

  return (
    <Box sx={{ width: '100%', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1 }}> {/* Mapa ocupa toda la pantalla y está detrás */}
      {loading && !error && (
        <Box sx={{
          position: 'absolute', 
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10, // Asegurar que esté sobre el mapa
        }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, color: 'white' /* O color del tema */ }}>Cargando propiedades...</Typography>
        </Box>
      )}
      {error && (
        <Box sx={{ 
            position: 'absolute', 
            top: '50%', left: '50%', 
            transform: 'translate(-50%, -50%)', 
            p: 3, backgroundColor: 'rgba(255, 0, 0, 0.7)', 
            borderRadius: 1, textAlign: 'center', zIndex: 10 
        }}>
          <Typography color="white">{error}</Typography>
          <Typography variant="body2" color="white">Asegúrese de que el backend (Django) esté funcionando.</Typography>
        </Box>
      )}
      
      {!loading && !error && (
        <Map
          ref={mapRef}
          {...viewState} // Usa el estado de vista que se actualiza
          onMove={evt => setViewState(evt.viewState)} // Actualiza el estado de vista en movimiento
          initialViewState={initialMapViewState} // Establece la vista inicial aquí
          onLoad={onMapLoad}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false} // Se añadirá uno personalizado más abajo o se dejará así por minimalismo
          projection={{ name: 'globe' }} // Esto ya está en el estilo personalizado
          onClick={onMapClick} 
          interactiveLayerIds={[clusterLayer.id, unclusteredPointLayer.id]} 
          onMouseMove={onMapMouseMove} 
          onMouseLeave={onMapMouseLeave} 
        >
          {/* La fuente mapbox-dem ya está definida en el estilo personalizado */}
          
          {/* Controles de Navegación Estándar Mapbox GL JS */}
          <NavigationControl 
            position="bottom-right" // Posición más estándar
            showCompass={true} // Mostrar brújula
            showZoom={true} // Mostrar controles de zoom
            visualizePitch={true} // Mostrar indicador de pitch
            style={{ 
                position: 'absolute', 
                bottom: '30px', 
                right: '30px', 
                zIndex: 5 
            }}
          />

          {/* Botón GPS para ir a mi ubicación */}
          <Fab
            size="medium"
            color="primary"
            onClick={handleGoToMyLocation}
            sx={{
              position: 'absolute',
              bottom: '110px', // Encima de NavigationControl
              right: '30px',
              zIndex: 5,
              backgroundColor: 'rgba(88, 166, 255, 0.9)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(88, 166, 255, 1)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
            title="Ir a mi ubicación"
          >
            <MyLocationIcon />
          </Fab>
          
          {/* Atribución personalizada si se desea mantenerla visible de forma discreta */}
          <AttributionControl 
            position="bottom-left" 
            compact={true} 
            style={{ 
                position: 'absolute', 
                bottom: '10px', 
                left: '10px', 
                zIndex: 5, 
                backgroundColor: 'rgba(255,255,255,0.5)', 
                padding: '2px 5px',
                borderRadius: '4px'
            }}
           />
          
          {isDrawingMode && mapRef.current && (
            <PropertyBoundaryDraw 
              map={mapRef.current.getMap()} 
              onBoundariesUpdate={handleBoundariesUpdate}
              existingBoundaries={propertyBoundaries}
            />
          )}
          
          {!editable && propertiesGeoJSON && (
            <Source 
              id="properties-source"
              type="geojson"
              data={propertiesGeoJSON}
              cluster={true}
              clusterMaxZoom={14} 
              clusterRadius={50} 
            >
              <Layer {...clusterLayer} />
              <Layer {...clusterCountLayer} />
              <Layer {...unclusteredPointLayer} />
            </Source>
          )}
          
          {editable && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                bottom: '100px', // Ajustar posición para que no choque con NavigationControl
                right: '30px',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.8)', // Fondo translúcido
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            >
              <IconButton 
                onClick={toggleDrawingMode}
                sx={{ 
                  color: isDrawingMode ? '#4caf50' : 'rgba(0,0,0,0.8)',
                  padding: 1.2
                }}
                title={isDrawingMode ? "Terminar dibujo" : "Dibujar límites de propiedad"}
              >
                <EditIcon />
              </IconButton>
            </Paper>
          )}

          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              closeButton={false}
              closeOnClick={false}
              onClose={() => setPopupInfo(null)}
              anchor="bottom"
              offset={15} 
              maxWidth="300px"
            >
              <Card sx={{ 
                maxWidth: 280, 
                backgroundColor: 'rgba(255,255,255,0.9)', // Popup ligeramente translúcido
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)' // Sombra más pronunciada
              }}>
                {(popupInfo.images && popupInfo.images.length > 0 && popupInfo.images[0].url) || popupInfo.image_url ? (
                  <CardMedia
                    component="img"
                    height="120"
                    image={(popupInfo.images && popupInfo.images.length > 0 ? popupInfo.images[0].url : popupInfo.image_url)}
                    alt={`Imagen de ${popupInfo.name}`}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : null}
                <CardContent sx={{p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography gutterBottom variant="h6" component="div" sx={{fontSize: '1rem', fontWeight: 'bold'}}>
                    {popupInfo.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                    Precio: {formatPrice(popupInfo.price)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tamaño: {popupInfo.size} ha
                  </Typography>
                  <Box sx={{mt: 1}}>
                      <Link 
                          component="button" 
                          variant="body2" 
                          onClick={() => handleMarkerClick(popupInfo)} 
                          sx={{cursor: 'pointer'}}
                      >
                          Ver detalles / Tour 360°
                      </Link>
                  </Box>
                </CardContent>
              </Card>
            </Popup>
          )}
        </Map>
      )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%', zIndex: 20 /* Sobre otros elementos flotantes */ }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Overlay descriptivo durante la animación */}
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(1px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: autoFlyCompleted ? 'none' : 'auto'
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              color: 'white',
              maxWidth: '600px',
              px: 4,
              py: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <motion.div
              key={currentTextIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  color: 'rgba(255, 255, 255, 0.95)',
                  mb: 2,
                  letterSpacing: '-0.02em'
                }}
              >
                {descriptiveTexts[currentTextIndex].title}
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 300,
                  fontSize: { xs: '1.1rem', md: '1.4rem' },
                  color: 'rgba(255, 255, 255, 0.8)',
                  mb: 1,
                  letterSpacing: '-0.01em'
                }}
              >
                {descriptiveTexts[currentTextIndex].subtitle}
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 300,
                  fontSize: { xs: '0.95rem', md: '1.1rem' },
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.6,
                  maxWidth: '400px',
                  mx: 'auto'
                }}
              >
                {descriptiveTexts[currentTextIndex].description}
              </Typography>
            </motion.div>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSkipAnimation}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: '16px',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                startIcon={<TravelExploreIcon />}
              >
                Explorar Ahora
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={handleSkipAnimation}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 400,
                  fontSize: '1rem',
                  px: 3,
                  py: 1.5,
                  borderRadius: '16px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Saltar animación
              </Button>
            </Box>

            {/* Indicador de progreso */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1 }}>
              {descriptiveTexts.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: index === currentTextIndex ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Box>
          </Box>
        </motion.div>
      )}
    </Box>
  );
});

export default MapView; 