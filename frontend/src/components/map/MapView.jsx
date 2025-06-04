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
const propertiesToGeoJSON = (properties) => {
  // Ensure properties is an array
  const validProperties = Array.isArray(properties) ? properties : [];
  
  return {
    type: 'FeatureCollection',
    features: validProperties.map(prop => ({
      type: 'Feature',
      properties: { ...prop }, // Keep all property data here
      geometry: {
        type: 'Point',
        coordinates: [prop.longitude, prop.latitude]
      }
    }))
  };
};

// Helper function to ensure safe array operations
const ensureArray = (value) => Array.isArray(value) ? value : [];

// Helper function to safely access properties
const safePropertiesAccess = (properties, callback) => {
  const validProperties = ensureArray(properties);
  return callback(validProperties);
};

const MapView = forwardRef(({ filters, appliedFilters, editable = false, onBoundariesUpdate, initialViewState: propInitialViewState, initialGeoJsonBoundary, onLoad, disableIntroAnimation = false }, ref) => {
  const navigate = useNavigate();
  const { mode, theme } = useContext(ThemeModeContext);
  // Estados
  const [properties, setProperties] = useState([]);
  const [propertiesGeoJSON, setPropertiesGeoJSON] = useState(propertiesToGeoJSON([])); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nuevos estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProperties, setTotalProperties] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

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
  const [autoFlyCompleted, setAutoFlyCompleted] = useState(disableIntroAnimation);
  const [showOverlay, setShowOverlay] = useState(!disableIntroAnimation);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [connectionType, setConnectionType] = useState('4g');
  const mapRef = useRef(null);
  const flightTimeoutIdRef = useRef(null);
  const userInteractedRef = useRef(false);
  const lastLoadViewportRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const lastFetchedPage1FiltersRef = useRef(null);

  // Detectar tipo de conexión del usuario
  useEffect(() => {
    const updateConnectionType = () => {
      const connection = navigator.connection;
      if (connection) {
        setConnectionType(connection.effectiveType);
        // console.log(`🌐 Connection type: ${connection.effectiveType}`);
      }
    };

    if (navigator.connection) {
      updateConnectionType();
      navigator.connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  // Para evitar múltiples ejecuciones del efecto de autoflight
  const autoFlightAttemptedRef = useRef(false);

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
    if (!showOverlay || disableIntroAnimation) return;
    
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % descriptiveTexts.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [showOverlay, descriptiveTexts.length, disableIntroAnimation]);

  // Ocultar overlay cuando la animación termine O el usuario interactúe
  useEffect(() => {
    if (autoFlyCompleted || userInteractedRef.current) {
      const timer = setTimeout(() => {
        if (!disableIntroAnimation) setShowOverlay(false);
      }, 300); // Reduced timeout for snappier overlay dismissal
      return () => clearTimeout(timer);
    }
  }, [autoFlyCompleted, userInteractedRef.current, disableIntroAnimation]);

  // Función para detener/omitir la animación de forma controlada
  const stopAndSkipAnimation = useCallback(() => {
    if (flightTimeoutIdRef.current) {
      clearTimeout(flightTimeoutIdRef.current);
      flightTimeoutIdRef.current = null;
      // console.log('🚁 Futuros vuelos de animación cancelados por usuario.');
    }
    
    userInteractedRef.current = true; 
    setAutoFlyCompleted(true); 
    setShowOverlay(false); // Ocultar overlay inmediatamente

    // Ya NO llamamos a map.stop() ni a map.easeTo() aquí.
    // La interacción del usuario (si ocurre) o la finalización natural del segmento actual de flyTo
    // se encargarán de detener el movimiento.

  }, [setAutoFlyCompleted, setShowOverlay]);

  const mapStyle = config.mapbox.style;
  
  useEffect(() => {
    // console.log('🎨 Usando estilo SkyTerra Custom (Minimal Fog)');
  }, []);

  // Serializar filters para la dependencia del useEffect
  const serializedFilters = JSON.stringify(filters);
  const serializedAppliedFilters = JSON.stringify(appliedFilters);

  // Memoized fetchProperties function
  const fetchProperties = useCallback(async (pageToFetch = 1, currentFilters, aiFilters) => {
    if (pageToFetch === 1) {
      setLoading(true);
      // When filters change (pageToFetch === 1), we should reset properties
      setProperties([]); 
      setPropertiesGeoJSON(propertiesToGeoJSON([]));
    } else {
      setLoadingMore(true);
    }
    setError(null);    try {
      let params = { ...currentFilters };

      // Always filter to show only approved properties in the public map
      if (!editable) {
        params.publication_status = 'approved';
      }

      if (aiFilters && Object.keys(aiFilters).length > 0) {
        // console.log("Aplicando filtros AI:", aiFilters); // Debug log
        params = {}; // Prioritize AI filters: start with a clean slate if AI filters exist

        if (aiFilters.propertyTypes && aiFilters.propertyTypes.length > 0) {
          params.type__in = aiFilters.propertyTypes.join(',');
        }
        if (aiFilters.priceRange && aiFilters.priceRange.length === 2) {
          if (aiFilters.priceRange[0] !== null) params.min_price = aiFilters.priceRange[0];
          if (aiFilters.priceRange[1] !== null) params.max_price = aiFilters.priceRange[1];
        }
        if (aiFilters.sizeRange && aiFilters.sizeRange.length === 2) {
          if (aiFilters.sizeRange[0] !== null) params.min_size = aiFilters.sizeRange[0];
          if (aiFilters.sizeRange[1] !== null) params.max_size = aiFilters.sizeRange[1];
        }
        if (aiFilters.features && aiFilters.features.length > 0) {
          aiFilters.features.forEach(feature => {
            // Assuming features are like "has_water", "has_views"
            // The backend needs to be set up to expect these as boolean true
            // e.g. has_water=true
            // For now, let's convert common ones. This might need more robust mapping.
            if (feature.toLowerCase().includes('water')) params.has_water = true;
            if (feature.toLowerCase().includes('views')) params.has_views = true;
            if (feature.toLowerCase().includes('road')) params.has_road_access = true;
            // Add more feature mappings as needed based on backend capabilities
          });
        }
        // If AI filters are applied, they might also want to override location/keyword from manual search
        // For now, we assume AISearchBar provides 'text_search' if that's intended.
        // If `currentFilters` had a `text_search` and AI filters are applied, it's removed unless AI also provides it.
      }
      
      // console.log("Parámetros finales para API:", params); // Debug log
      const data = await propertyService.getPaginatedProperties(pageToFetch, params);
      
      // Debug: verificar qué datos recibimos
      console.log('Datos recibidos del API:', { pageToFetch, data, dataType: typeof data });
      
      // Verificar que data tenga la estructura esperada
      if (!data || !Array.isArray(data.results)) {
        console.error('Datos inválidos recibidos del API:', data);
        throw new Error('Formato de datos inválido recibido del servidor');
      }
      
      setProperties(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return pageToFetch === 1 ? data.results : [...prevArray, ...data.results];
      });
      // Update GeoJSON with the potentially new set of properties
      setPropertiesGeoJSON(currentProps => {
        const existingProperties = currentProps?.features?.map(f => f.properties) || [];
        const newProperties = pageToFetch === 1 ? data.results : [...existingProperties, ...data.results];
        return propertiesToGeoJSON(newProperties);
      });

      setTotalProperties(data.count);
      setCurrentPage(pageToFetch);
      setHasNextPage(data.next !== null);

      if (mapRef.current && pageToFetch === 1) { // After initial load or filter change
        const map = mapRef.current.getMap();
        if (map) {
          lastLoadViewportRef.current = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bounds: map.getBounds()
          };
        }
      }

    } catch (err) {
      console.error('Error al cargar propiedades:', err);
      setError('No se pudieron cargar las propiedades. Intente nuevamente más tarde.');
      if (pageToFetch === 1) {
        setProperties([]);
        setPropertiesGeoJSON(propertiesToGeoJSON([])); 
      }
    } finally {
      if (pageToFetch === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [ // Dependencies for fetchProperties
    setLoading, setLoadingMore, setError, setProperties, 
    setPropertiesGeoJSON, setTotalProperties, setCurrentPage, setHasNextPage
    // `filters`, `appliedFilters` (via currentFilters, aiFilters params) and `editable` are handled by the calling useEffect
  ]);

  useEffect(() => {
    if (editable) {
      // Reset state when switching to editable mode
      setLoading(false); 
      setProperties([]);
      setPropertiesGeoJSON(propertiesToGeoJSON([]));
      setHasNextPage(false);
      setCurrentPage(1);
      setTotalProperties(0); // Ensure totalProperties is reset
      lastFetchedPage1FiltersRef.current = null; // Clear the ref, so next non-editable will fetch
      return; // Don't fetch if editable
    }

    const combinedFiltersForRef = JSON.stringify({ manual: filters, ai: appliedFilters });

    // Not editable: Fetch properties if filters (manual or AI) changed or if it's the first load for these filters
    if (combinedFiltersForRef !== lastFetchedPage1FiltersRef.current) {
      // console.log('MapView: Filters (manual or AI) changed or first non-editable load for current combined filters. Fetching page 1.');
      fetchProperties(1, filters, appliedFilters); // Call with current manual and AI filters
      lastFetchedPage1FiltersRef.current = combinedFiltersForRef; // Record that these combined filters have been fetched for page 1
    }
    // If combinedFiltersForRef === lastFetchedPage1FiltersRef.current, it means we've already fetched page 1
    // for these combined filters, so we don't do it again here. Infinite scroll will handle subsequent pages.

  }, [serializedFilters, serializedAppliedFilters, editable, fetchProperties, filters, appliedFilters]);

  const handleLoadMore = useCallback(() => { // This function can now call the memoized fetchProperties
    if (hasNextPage && !loadingMore) {
      fetchProperties(currentPage + 1, filters, appliedFilters); // Pass current manual and AI filters
    }
  }, [hasNextPage, loadingMore, currentPage, fetchProperties, filters, appliedFilters]);

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
    // console.log('Boundaries updated:', boundaries); // Debug log
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
  const performAutoFlight = useCallback(async (userCountry = 'default') => {
    // Skip animation for slow connections
    if (['slow-2g', '2g', '3g'].includes(connectionType)) {
      // console.log(`Conexión lenta (${connectionType}), omitiendo animación de vuelo automático.`);
      if (!autoFlyCompleted) setAutoFlyCompleted(true);
      return;
    }

    if (!mapRef.current || !isMapLoaded || userInteractedRef.current || autoFlyCompleted) {
      // console.warn('Intento de iniciar auto-vuelo pero el mapa no está listo, o usuario ya interactuó, o ya completó.');
      if (!userInteractedRef.current) setAutoFlyCompleted(true);
      return;
    }
    
    // console.log(`🚁 Iniciando vuelo automático para ${userCountry}`);

    let flightPerformed = false;
    try {
      if (Array.isArray(properties) && properties.length > 0 && !userInteractedRef.current) {
        const selectedProperties = [];
        const latRanges = [
          { min: -35, max: -30, name: "Centro" },
          { min: -40, max: -35, name: "Centro-Sur" },
          { min: -45, max: -40, name: "Sur" },
          { min: -50, max: -45, name: "Aysén" },
          { min: -55, max: -50, name: "Magallanes" }
        ];

        for (const range of latRanges) {
          const propertiesInRange = properties.filter(prop => 
            prop.latitude >= range.min && prop.latitude < range.max
          );
          if (propertiesInRange.length > 0) {
            const randomProperty = propertiesInRange[Math.floor(Math.random() * propertiesInRange.length)];
            selectedProperties.push({
              center: [randomProperty.longitude, randomProperty.latitude],
              zoom: Math.random() > 0.5 ? 8 : 10,
              pitch: 30 + Math.random() * 30,
              bearing: Math.random() * 360,
              name: randomProperty.name
            });
          }
        }

        if (selectedProperties.length < 3 && Array.isArray(properties) && properties.length > 0) {
          const shuffled = [...properties].sort(() => 0.5 - Math.random());
          for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            const prop = shuffled[i];
            if (!selectedProperties.find(p => p.name === prop.name)) { // Evitar duplicados si ya se añadieron por rango
              selectedProperties.push({
                center: [prop.longitude, prop.latitude],
                zoom: 8 + Math.random() * 4,
                pitch: 30 + Math.random() * 30,
                bearing: Math.random() * 360,
                name: prop.name
              });
            }
          }
        }
        
        if (selectedProperties.length > 0) {
          let currentStep = 0;
          const flyToNextSelectedProperty = () => {
            if (userInteractedRef.current || !mapRef.current || !isMapLoaded || currentStep >= selectedProperties.length) {
              if (!userInteractedRef.current) setAutoFlyCompleted(true);
              // console.log('Secuencia de propiedades terminada o interrumpida (modo paseo lento).');
              return;
            }
            const property = selectedProperties[currentStep];
            // console.log(`🏞️ Volando sobre: ${property.name} (animación pausada, duración: ${currentStep === 0 ? 7000 : 8000}ms)`);
            
            mapRef.current.flyTo({
              ...property,
              duration: currentStep === 0 ? 7000 : 8000,
              essential: true,
            });

            currentStep++;
            flightTimeoutIdRef.current = setTimeout(() => {
              flyToNextSelectedProperty();
            }, currentStep === 1 ? 8000 : 9000);
          };
          if (!userInteractedRef.current) {
            flightTimeoutIdRef.current = setTimeout(() => flyToNextSelectedProperty(), 500);
            flightPerformed = true;
          }
        }
      }

      if (!flightPerformed && !userInteractedRef.current) {
        // console.log('No hay propiedades para el vuelo cinematográfico o fue interrumpido, usando vuelo genérico por país.');
        const flightPath = countryFlightPaths[userCountry] || countryFlightPaths['default'];
        let currentStep = 0;

        const flyToNextGenericPoint = () => {
          if (userInteractedRef.current || !mapRef.current || !isMapLoaded || currentStep >= flightPath.length) {
            if (!userInteractedRef.current) setAutoFlyCompleted(true);
            // console.log('Secuencia genérica terminada o interrumpida (modo paseo lento).');
            return;
          }
          const point = flightPath[currentStep];
          // console.log(`🌎 Volando a punto genérico (animación pausada, duración: ${currentStep === 0 ? 7000 : 8000}ms)`);
          mapRef.current.flyTo({
            ...point,
            duration: currentStep === 0 ? 7000 : 8000,
            essential: true,
          });

          currentStep++;
          flightTimeoutIdRef.current = setTimeout(() => {
            flyToNextGenericPoint();
          }, currentStep === 1 ? 8000 : 9000);
        };
        if (!userInteractedRef.current) {
          flightTimeoutIdRef.current = setTimeout(() => flyToNextGenericPoint(), 500);
        }
      }

    } catch (error) {
      console.error('Error durante la animación de vuelo automático:', error);
      if (!userInteractedRef.current) setAutoFlyCompleted(true);
    }
  }, [isMapLoaded, properties, countryFlightPaths, autoFlyCompleted, setAutoFlyCompleted, connectionType]);

  // Detectar ubicación del usuario y comenzar vuelo automático
  useEffect(() => {
    if (editable || autoFlightAttemptedRef.current || disableIntroAnimation || userInteractedRef.current || autoFlyCompleted) {
      if (editable || disableIntroAnimation || userInteractedRef.current) {
          if (!userInteractedRef.current) setAutoFlyCompleted(true); // Asegurar que se marque como completado
          setShowOverlay(false);
      }
      return;
    }

    if (isMapLoaded && !loading) {
      autoFlightAttemptedRef.current = true;
      
      let userCountry = 'default';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // console.log(`🌍 Ubicación detectada: ${getCountryFromCoords(latitude, longitude)} (${latitude}, ${longitude})`);
            userCountry = getCountryFromCoords(latitude, longitude);
            performAutoFlight(userCountry);
          },
          () => {
            // console.warn('No se pudo obtener la ubicación del usuario, usando vuelo por defecto.');
            performAutoFlight('default'); 
          }
        );
      } else {
        // console.warn('Geolocalización no soportada, usando vuelo por defecto.');
        performAutoFlight('default');
      }
    } 
  }, [isMapLoaded, loading, properties, editable, autoFlyCompleted, getCountryFromCoords, performAutoFlight, disableIntroAnimation]);

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

  const onMapLoad = useCallback(() => {
    // console.log('🗺️ Mapa cargado, configurando...');
    setIsMapLoaded(true);

    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      // El terreno 3D se configura directamente en el estilo del mapa (skyTerraCustomStyle)
      // No es necesario map.setTerrain aquí si ya está en el estilo.
      // Asegurarse que 'mapbox-dem' esté en las fuentes del estilo.
      if (map.getSource('mapbox-dem') && map.getTerrain() === null) {
         // console.log('Aplicando configuración de terreno desde el estilo...');
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
          // console.log('✅ Fuente composite cargada');
        }
        if (e.sourceId === 'mapbox-dem' && e.isSourceLoaded) {
          // console.log('✅ Fuente de terreno cargada');
        }
      });

      // console.log('✅ Configuración del mapa completada');
      
      // Llamar al callback externo si existe
      if (onLoad) {
        onLoad(mapRef.current);
      }
    }
  }, [onLoad]);

  // Infinite scroll logic on map move
  const handleMapMoveEnd = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (!mapRef.current || loadingMore || !hasNextPage || editable || loading) return;

      const map = mapRef.current.getMap();
      const currentViewport = {
        center: map.getCenter(),
        zoom: map.getZoom(),
        bounds: map.getBounds()
      };

      let shouldLoad = false;
      if (lastLoadViewportRef.current) {
        const prev = lastLoadViewportRef.current;
        const distance = currentViewport.center.distanceTo(prev.center);
        const zoomThreshold = 0.5; 
        const distanceThreshold = 200000 / (Math.pow(2, currentViewport.zoom) / Math.pow(2, prev.zoom)); // Adjusted for zoom change

        if (Math.abs(currentViewport.zoom - prev.zoom) > zoomThreshold || distance > distanceThreshold * 2 ) { // Increased distance tolerance a bit
          shouldLoad = true;
        }
      } else {
        shouldLoad = true; 
      }

      if (shouldLoad) {
        // console.log('🗺️ Map moved, attempting to load more properties via handleLoadMore...');
        lastLoadViewportRef.current = currentViewport; // Update viewport ref before loading
        handleLoadMore(); // Call the memoized and stable handleLoadMore
      }
    }, 750); 
  }, [loadingMore, hasNextPage, editable, loading, handleLoadMore]); // Added loading and handleLoadMore

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

  const unclusteredPointLayer = {
    id: 'unclustered-point',
    type: 'circle',
    source: 'properties-source',
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
    if (!userInteractedRef.current && !autoFlyCompleted) {
      // console.log('Interacción de click en mapa, deteniendo animación intro.');
      stopAndSkipAnimation();
    }
    if (navigatingToTour || !mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    // Check if layers exist before querying
    const unclusteredLayerExists = map.getLayer(unclusteredPointLayer.id);

    if (!unclusteredLayerExists) {
      // console.warn('Attempted to query features, but target layers do not exist.');
      return;
    }

    const queryLayers = [unclusteredPointLayer.id];

    const features = map.queryRenderedFeatures(event.point, {
      layers: queryLayers 
    });

    if (features && features.length > 0) {
      const feature = features[0];
      if (feature.layer.id === unclusteredPointLayer.id) {
        handleMarkerClick(feature.properties);
      }
    }
  }, [navigatingToTour, handleMarkerClick, stopAndSkipAnimation, autoFlyCompleted]);

  const handleUserInteraction = useCallback((event) => {
    // Detectar si es una interacción genuina del usuario
    if (event.originalEvent && !userInteractedRef.current && !autoFlyCompleted) {
        // console.log('Interacción de movimiento en mapa, deteniendo animación intro.');
        stopAndSkipAnimation();
    }
  }, [stopAndSkipAnimation, autoFlyCompleted]);

  const onMapMouseMove = useCallback(event => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    // Check if layer exists before querying
    const unclusteredLayerExists = map.getLayer(unclusteredPointLayer.id);

    if (unclusteredLayerExists) {
      const features = map.queryRenderedFeatures(event.point, {
        layers: [unclusteredPointLayer.id]
      });
      map.getCanvas().style.cursor = features && features.length > 0 ? 'pointer' : '';
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
    } else {
      // If layer doesn't exist, ensure cursor is default and no popup
      map.getCanvas().style.cursor = '';
      setPopupInfo(null);
    }
  }, []); 

  const onMapMouseLeave = useCallback(() => {
    if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = '';
    }
    setPopupInfo(null);
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: (options) => {
      if (mapRef.current && isMapLoaded) {
        mapRef.current.flyTo(options);
      } else {
        console.warn('Intento de flyTo pero el mapa no está listo o la referencia es nula.');
      }
    },
    getMapInstance: () => mapRef.current
  }));

  // Si se está cargando y no es editable, muestra el spinner
  if (loading && !editable) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0d1117' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
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
          <Typography sx={{ mt: 2, color: 'white' }}>Cargando propiedades...</Typography>
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
          {...viewState}
          onMove={evt => {
            setViewState(evt.viewState);
            handleUserInteraction(evt); // Llamar aquí para detectar interacción
          }}
          initialViewState={initialMapViewState}
          onLoad={onMapLoad}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          attributionControl={false}
          projection={{ name: 'globe' }}
          onMoveEnd={handleMapMoveEnd}
          onClick={(e) => {
            onMapClick(e); 
            if (!e.features || e.features.length === 0) {
                if (!userInteractedRef.current && !autoFlyCompleted) {
                    // console.log('Click genérico en mapa, deteniendo animación intro.');
                    stopAndSkipAnimation();
                }
            }
          }}
          interactiveLayerIds={!editable ? [unclusteredPointLayer.id] : []} 
          onMouseMove={onMapMouseMove} 
          onMouseLeave={onMapMouseLeave} 
          preserveDrawingBuffer={true}
        >
          <NavigationControl 
            position="bottom-right"
            showCompass={true}
            showZoom={true}
            visualizePitch={true}
            style={{ 
                position: 'absolute', 
                bottom: '30px', 
                right: '30px', 
                zIndex: 5 
            }}
            aria-label="Controles de navegación del mapa"
          />
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
              cluster={false}
            >
              <Layer {...unclusteredPointLayer} />
            </Source>
          )}
          {editable && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                bottom: '100px',
                right: '30px',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.8)',
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
                aria-label={isDrawingMode ? "Terminar dibujo de límites" : "Iniciar dibujo de límites de propiedad"}
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
                backgroundColor: 'rgba(255,255,255,0.9)',
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
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
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%', zIndex: 20 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {!disableIntroAnimation && showOverlay && (
        <Box
          sx={{
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
                onClick={stopAndSkipAnimation}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', // Slightly increased opacity
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: '16px',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.25)', // Slightly increased border opacity
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Slightly increased hover opacity
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                startIcon={<TravelExploreIcon />}
              >
                Explorar Ahora
              </Button>
            </Box>

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
        </Box>
      )}
    </Box>
  );
});

export default MapView;
