import React, { useState, useEffect, useRef, useCallback, useContext, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, IconButton, Snackbar, Alert, Fab, Chip, TextField, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { propertyService, tourService, usePropertyService } from '../../services/api';
import Map, { NavigationControl, Popup, Source, Layer, AttributionControl, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import EditIcon from '@mui/icons-material/Edit';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import PropertyBoundaryDraw from './PropertyBoundaryDraw';
import { useNavigate } from 'react-router-dom';
import { ThemeModeContext } from '../../App';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import config from '../../config/environment';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyPreviewModal from '../property/PropertyPreviewModal';
import CloseIcon from '@mui/icons-material/Close';
import PropertySidePreview from '../property/PropertySidePreview';
import { demoMapProperties } from '../../_mocks/demoMapProperties';

const toFeaturePolygon = (boundary) => {
  if (!boundary) return null;

  if (boundary.type === 'Feature' && boundary.geometry?.type === 'Polygon') {
    return boundary;
  }

  if (boundary.geojson?.type === 'Feature' && boundary.geojson.geometry?.type === 'Polygon') {
    return boundary.geojson;
  }

  if (boundary.geometry?.type === 'Polygon') {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: boundary.geometry,
    };
  }

  if (boundary.coordinates) {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: {
        type: 'Polygon',
        coordinates: boundary.coordinates,
      },
    };
  }

  if (Array.isArray(boundary)) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: boundary,
      },
    };
  }

  return null;
};

const normalizeBoundary = (boundary) => {
  if (!boundary) return null;

  const feature = toFeaturePolygon(boundary);
  if (!feature?.geometry?.coordinates) return null;

  const normalized = {
    ...(boundary && typeof boundary === 'object' && !Array.isArray(boundary) ? boundary : {}),
    type: 'Feature',
    geojson: feature,
    feature,
    coordinates: feature.geometry.coordinates,
  };

  if (!normalized.center) {
    try {
      const centroid = turf.center(feature)?.geometry?.coordinates;
      if (Array.isArray(centroid)) {
        normalized.center = centroid;
      }
    } catch (_) {
      /* no-op */
    }
  }

  if (normalized.center && Array.isArray(normalized.center) && normalized.center.length === 2) {
    normalized.longitude = normalized.center[0];
    normalized.latitude = normalized.center[1];
  }

  if (normalized.area == null) {
    try {
      const areaSqMeters = turf.area(feature);
      if (Number.isFinite(areaSqMeters)) {
        normalized.area = areaSqMeters / 10000;
      }
    } catch (_) {
      /* no-op */
    }
  }

  return normalized;
};

// Function to transform properties to GeoJSON
const propertiesToGeoJSON = (properties) => {
  const validProperties = Array.isArray(properties) ? properties : [];
  const features = [];
  for (const prop of validProperties) {
    const lon = Number(prop?.longitude);
    const lat = Number(prop?.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue; // skip invalid coords
    features.push({
      type: 'Feature',
      properties: { ...prop },
      geometry: { type: 'Point', coordinates: [lon, lat] }
    });
  }
  return { type: 'FeatureCollection', features };
};

// Helper function to ensure safe array operations
const ensureArray = (value) => Array.isArray(value) ? value : [];

// Helper function to safely access properties
const safePropertiesAccess = (properties, callback) => {
  const validProperties = ensureArray(properties);
  return callback(validProperties);
};

const HERO_ROTATION_SPEED_DEG_PER_SEC = 3;
const IDLE_ROTATION_SPEED_DEG_PER_SEC = 40;

const MapView = forwardRef(({
  filters,
  appliedFilters,
  editable = false,
  onBoundariesUpdate,
  initialViewState: propInitialViewState,
  initialGeoJsonBoundary,
  onLoad,
  disableIntroAnimation = false,
  enableIdleRotation = true,
  forceContinuousRotation = false,
  embedded = false,
  height: embeddedHeight,
  onLocationSelect,
  selectedPoint,
  suppressData = false,
  initialData = null,
}, ref) => {
  const navigate = useNavigate();
  const { mode, theme } = useContext(ThemeModeContext);

  // Hook optimizado para gestión de propiedades
  const { getPropertiesCached, prefetchNextPage } = usePropertyService();

  // Estados
  const [properties, setProperties] = useState([]);
  const [propertiesGeoJSON, setPropertiesGeoJSON] = useState(propertiesToGeoJSON([]));
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTourUrl, _setActiveTourUrl] = useState(null);
  const activeTourUrlRef = useRef(null);
  const [activeTourPropertyId, _setActiveTourPropertyId] = useState(null);
  const activeTourPropertyIdRef = useRef(null);

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
  const [tourPreviews, setTourPreviews] = useState({});
  const [isDrawingMode, setIsDrawingMode] = useState(editable);
  const [propertyBoundaries, setPropertyBoundaries] = useState(() => normalizeBoundary(initialGeoJsonBoundary));
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [navigatingToTour, setNavigatingToTour] = useState(false);
  const [tourTransitionDuration, setTourTransitionDuration] = useState(350);
  const [autoFlyCompleted, setAutoFlyCompleted] = useState(disableIntroAnimation);
  const [showOverlay, setShowOverlay] = useState(!disableIntroAnimation);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isRotating, setIsRotating] = useState(false); // Estado para la rotación del globo
  const [connectionType, setConnectionType] = useState('4g');
  const [isMapUIReady, setIsMapUIReady] = useState(false); // Mapa listo (idle)
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const rotationFrameId = useRef(null); // Ref para el ID de la animación de rotación
  const rotationPrevTimeRef = useRef(null); // timestamp del frame previo
  const flightTimeoutIdRef = useRef(null);
  const userInteractedRef = useRef(false);
  const lastLoadViewportRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const lastFetchedPage1FiltersRef = useRef(null);
  const recommendationsTourTimeoutRef = useRef(null);
  const idleRotationTimeoutRef = useRef(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (enableIdleRotation) return;

    if (idleRotationTimeoutRef.current) {
      clearTimeout(idleRotationTimeoutRef.current);
      idleRotationTimeoutRef.current = null;
    }

    if (rotationFrameId.current) {
      cancelAnimationFrame(rotationFrameId.current);
      rotationFrameId.current = null;
    }

    rotationPrevTimeRef.current = null;
    setIsRotating(false);
  }, [enableIdleRotation]);

  const boundaryFeature = useMemo(() => {
    if (!propertyBoundaries) return null;
    return propertyBoundaries.geojson || toFeaturePolygon(propertyBoundaries);
  }, [propertyBoundaries]);

  const boundaryCenter = useMemo(() => {
    if (propertyBoundaries?.center && Array.isArray(propertyBoundaries.center)) {
      return propertyBoundaries.center;
    }
    if (boundaryFeature) {
      try {
        const centroid = turf.center(boundaryFeature)?.geometry?.coordinates;
        if (Array.isArray(centroid)) return centroid;
      } catch (_) {
        /* no-op */
      }
    }
    return null;
  }, [propertyBoundaries, boundaryFeature]);

  const propertyMarkerCoords = useMemo(() => {
    if (boundaryCenter) {
      return boundaryCenter;
    }
    if (selectedPoint && Number.isFinite(selectedPoint.longitude) && Number.isFinite(selectedPoint.latitude)) {
      return [selectedPoint.longitude, selectedPoint.latitude];
    }
    return null;
  }, [boundaryCenter, selectedPoint]);

  const forceMapResize = useCallback(() => {
    if (!mapRef.current) return;

    const executeResize = () => {
      try { mapRef.current.resize?.(); } catch (_) {}
      try { mapRef.current.getMap?.().resize(); } catch (_) {}
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(executeResize);
    } else {
      setTimeout(executeResize, 16);
    }
  }, []);

  const applyDemoFallback = useCallback(() => {
    setProperties(demoMapProperties);
    setPropertiesGeoJSON(propertiesToGeoJSON(demoMapProperties));
    setTotalProperties(demoMapProperties.length);
    setCurrentPage(1);
    setHasNextPage(false);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
    setError(null);
    setUsingDemoData((prev) => {
      if (!prev) {
        setSnackbar({
          open: true,
          severity: 'info',
          message: 'Mostrando terrenos demo en Chile para que puedas probar la vista.',
        });
      }
      return true;
    });
  }, [setSnackbar]);

  useEffect(() => {
    const normalized = normalizeBoundary(initialGeoJsonBoundary);
    setPropertyBoundaries((prev) => {
      if (!normalized && !prev) {
        return prev;
      }
      if (normalized && prev && prev.geojson === normalized.geojson) {
        return prev;
      }
      return normalized;
    });
  }, [initialGeoJsonBoundary]);

  useEffect(() => {
    forceMapResize();

    const element = containerRef.current;
    const ResizeObserverRef = (typeof window !== 'undefined') ? window.ResizeObserver : null;

    if (!element || !ResizeObserverRef) {
      return undefined;
    }

    const observer = new ResizeObserverRef(() => forceMapResize());
    observer.observe(element);

    return () => observer.disconnect();
  }, [forceMapResize]);

  useEffect(() => {
    if (isMapLoaded) {
      forceMapResize();
    }
  }, [isMapLoaded, forceMapResize]);

  useEffect(() => {
    forceMapResize();
  }, [embedded, embeddedHeight, forceMapResize]);
  const [previewPropertyId, setPreviewPropertyId] = useState(null);
  const [tourCache, setTourCache] = useState({}); // propertyId -> tourUrl
  // Geocoder state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbortRef = useRef(null);

  // Side preview panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [sidePanelProperty, setSidePanelProperty] = useState(null);

  // Helper setters to keep React state and refs in sync (needed for tour overlay)
  const setActiveTourUrl = (url) => {
    activeTourUrlRef.current = url;
    _setActiveTourUrl(url);
  };

  const setActiveTourPropertyId = (id) => {
    activeTourPropertyIdRef.current = id;
    _setActiveTourPropertyId(id);
  };

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

  // Render helper: interpreta **texto** como énfasis en negrita
  const renderEmphasis = useCallback((text) => {
    if (text == null) return null;
    const parts = String(text).split(/\*\*/);
    return parts.map((part, index) => (
      index % 2 === 1
        ? <Box key={`em-${index}`} component="span" sx={{ fontWeight: 700 }}>{part}</Box>
        : <React.Fragment key={`txt-${index}`}>{part}</React.Fragment>
    ));
  }, []);

  // Índice para palabras dinámicas dentro de un mismo slide (e.g., Compra/Vende/Invierte)
  const [dynamicWordIndex, setDynamicWordIndex] = useState(0);

  // Textos descriptivos rotativos
  const descriptiveTexts = [
    {
      // Título dinámico: Compra/Vende/Invierte + " informado."
      dynamicWords: ["Compra", "Vende", "Invierte"],
      titleAfter: " **informado**.",
      subtitle: "Decide con **datos**."
    },
    {
      title: "Tierras, con la precisión del **futuro**.",
      subtitle: "Mapa inmersivo + **IA** para decidir mejor."
    },
    {
      title: "Hacemos **visible** el valor **oculto**.",
      subtitle: "Destaca las **ventajas** de tu propiedad."
    },
    {
      title: "Del terreno a los **datos**.",
      subtitle: "**Tours 360°**, estándares pro y datos accionables."
    },
    {
      title: "Explora sin **carretera**.",
      subtitle: "**Evalúa 10** terrenos en una tarde."
    },
    // (removed: "Invierte con certeza" per request)
    {
      title: "Vende como **experto**.",
      subtitle: "Un **ecosistema**, de la captura al cierre."
    },
    {
      title: "Conoce a **Sam**.",
      subtitle: "Tu asistente **IA** para buscar terrenos en lenguaje natural."
    }
  ];

  // Rotación de palabras dinámicas (una sola pasada) y avance automático al siguiente slide
  const dynamicTimersRef = useRef([]);
  useEffect(() => {
    // Limpiar timers previos
    dynamicTimersRef.current.forEach(clearTimeout);
    dynamicTimersRef.current = [];

    setDynamicWordIndex(0);
    const slide = descriptiveTexts[currentTextIndex];
    if (
      slide && slide.dynamicWords && slide.dynamicWords.length > 0 && showOverlay && !disableIntroAnimation
    ) {
      const initialDelay = 2000; // Delay inicial para mostrar "Compra" más tiempo
      const stepMs = 2200; // Aumentar el tiempo de cada palabra para mejor lectura
      
      // Programar cambios de palabra con delay inicial
      slide.dynamicWords.forEach((_, i) => {
        const t = setTimeout(() => {
          setDynamicWordIndex(i);
        }, initialDelay + (i * stepMs));
        dynamicTimersRef.current.push(t);
      });
      // Avanzar al siguiente slide tras mostrar la última palabra
      const totalMs = initialDelay + (slide.dynamicWords.length * stepMs) + 500;
      const advance = setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % descriptiveTexts.length);
      }, totalMs);
      dynamicTimersRef.current.push(advance);
    }

    return () => {
      dynamicTimersRef.current.forEach(clearTimeout);
      dynamicTimersRef.current = [];
    };
  }, [currentTextIndex, showOverlay, disableIntroAnimation]);

  // Reset de índices cuando aparece el overlay por primera vez
  useEffect(() => {
    if (showOverlay && !disableIntroAnimation) {
      setCurrentTextIndex(0);
      setDynamicWordIndex(0);
    }
  }, [showOverlay, disableIntroAnimation]);

  // Rotar texto (slides normales) cada ~7.5s para mejor lectura
  useEffect(() => {
    if (showOverlay && !disableIntroAnimation && !userInteractedRef.current) {
      const slide = descriptiveTexts[currentTextIndex];
      // Si el slide actual usa palabras dinámicas, su propio efecto se encarga del avance
      if (slide && slide.dynamicWords && slide.dynamicWords.length > 0) {
        return undefined;
      }
      const interval = setInterval(() => {
        setCurrentTextIndex((prev) => (prev + 1) % descriptiveTexts.length);
      }, 8200);
      return () => clearInterval(interval);
    }
  }, [showOverlay, descriptiveTexts.length, disableIntroAnimation, userInteractedRef.current, currentTextIndex]);

  // Ocultar overlay cuando la animación termine O el usuario interactúe O cuando se active la búsqueda AI
  useEffect(() => {
    if (autoFlyCompleted || userInteractedRef.current) {
      const timer = setTimeout(() => {
        if (!disableIntroAnimation) setShowOverlay(false);
      }, 300); // Reduced timeout for snappier overlay dismissal
      return () => clearTimeout(timer);
    }
  }, [autoFlyCompleted, userInteractedRef.current, disableIntroAnimation]);

  // Ocultar overlay inmediatamente cuando se detecta búsqueda AI
  useEffect(() => {
    if (appliedFilters && Object.keys(appliedFilters).length > 0) {
      setShowOverlay(false);
      setAutoFlyCompleted(true);
      userInteractedRef.current = true;
    }
  }, [appliedFilters]);

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
    setIsRotating(false); // Detener la rotación del globo

    // Ya NO llamamos a map.stop() ni a map.easeTo() aquí.
    // La interacción del usuario (si ocurre) o la finalización natural del segmento actual de flyTo
    // se encargarán de detener el movimiento.

  }, [setAutoFlyCompleted, setShowOverlay, setIsRotating]);

  const mapStyle = config.mapbox.style;
  
  // Mostrar popups solo cuando el usuario está lo suficientemente cerca
  const POPUP_MIN_ZOOM = 10; // umbral a partir del cual se habilitan los popups por hover
  
  useEffect(() => {
    // console.log('🎨 Usando estilo SkyTerra Custom (Minimal Fog)');
  }, []);

  // Serialización de dependencias: ya no usamos filtros visibles
  const serializedFilters = JSON.stringify({});
  const serializedAppliedFilters = JSON.stringify({});

  // Seed from initialData if provided
  useEffect(() => {
    if (initialData && Array.isArray(initialData.results) && initialData.results.length > 0) {
      setProperties(initialData.results);
      setPropertiesGeoJSON(propertiesToGeoJSON(initialData.results));
      setTotalProperties(initialData.count || initialData.results.length || 0);
      setCurrentPage(1);
      setHasNextPage(Boolean(initialData.next));
      setLoading(false);
      setUsingDemoData(false);
    } else if (initialData && (!Array.isArray(initialData.results) || initialData.results.length === 0)) {
      applyDemoFallback();
    }
  }, [initialData, applyDemoFallback]);

  // Memoized fetchProperties function optimizada con caché
  const fetchProperties = useCallback(async (pageToFetch = 1) => {
    if (pageToFetch === 1) {
      // Mantener datos en pantalla para evitar parpadeo. Solo full loading si no hay datos previos.
      if (!Array.isArray(properties) || properties.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const params = {}; // sin filtros; Sam decide internamente
      const data = await getPropertiesCached(params, pageToFetch, 20);

      // Debug solo en dev
      if (import.meta.env.MODE === 'development') console.debug('Datos recibidos del API optimizado:', { pageToFetch, data, dataType: typeof data });

      // Verificar que data tenga la estructura esperada
      if (!data || !Array.isArray(data.results)) {
        console.error('Datos inválidos recibidos del API:', data);
        if (pageToFetch === 1) {
          applyDemoFallback();
          return;
        }
        throw new Error('Formato de datos inválido recibido del servidor');
      }

      if (pageToFetch === 1 && data.results.length === 0) {
        applyDemoFallback();
        return;
      }

      setUsingDemoData(false);

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

      // Prefetch próxima página si hay más datos
      if (data.next && pageToFetch === 1) {
        prefetchNextPage(params, pageToFetch, 20);
      }

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
        console.error('Error al cargar propiedades:', err?.message || err);
      if (pageToFetch === 1) {
        applyDemoFallback();
      } else {
        setError('No se pudieron cargar las propiedades. Intente nuevamente más tarde.');
      }
    } finally {
      if (pageToFetch === 1) {
        setLoading(false);
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [getPropertiesCached, prefetchNextPage, properties, applyDemoFallback]);

  useEffect(() => {
    if (editable || suppressData) {
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

    const combinedFiltersForRef = 'no-filters';

    // Not editable: Fetch properties if filters (manual or AI) changed or if it's the first load for these filters
    if (combinedFiltersForRef !== lastFetchedPage1FiltersRef.current) {
      // console.log('MapView: Filters (manual or AI) changed or first non-editable load for current combined filters. Fetching page 1.');
      fetchProperties(1);
      lastFetchedPage1FiltersRef.current = combinedFiltersForRef; // Record that these combined filters have been fetched for page 1
    }
    // If combinedFiltersForRef === lastFetchedPage1FiltersRef.current, it means we've already fetched page 1
    // for these combined filters, so we don't do it again here. Infinite scroll will handle subsequent pages.

  }, [serializedFilters, serializedAppliedFilters, editable, fetchProperties, filters, appliedFilters]);

  const handleLoadMore = useCallback(() => { // This function can now call the memoized fetchProperties
    if (hasNextPage && !loadingMore) {
      fetchProperties(currentPage + 1);
    }
  }, [hasNextPage, loadingMore, currentPage, fetchProperties]);

  const MAPBOX_TOKEN = config.mapbox.accessToken;

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString('es-CL')}`;
  };

  const getPriceDisplay = (property) => {
    if (!property) return 'N/A';
    if (property.listing_type === 'rent' || property.listing_type === 'both') {
      return property.rent_price ? `${formatPrice(property.rent_price)} /mes` : 'Arriendo N/D';
    }
    return formatPrice(property.price);
  };

  const openSidePanelForProperty = useCallback(async (propertyLike) => {
    try {
      const propertyId = typeof propertyLike === 'object' && propertyLike !== null ? propertyLike.id : propertyLike;
      let property = typeof propertyLike === 'object' && propertyLike !== null ? { ...propertyLike } : null;

      if (!propertyId) {
        return false;
      }

      if (!property || typeof property !== 'object') {
        const existing = properties.find((item) => item.id === propertyId);
        property = existing ? { ...existing } : null;
      } else if (property.id != null) {
        const existing = properties.find((item) => item.id === property.id);
        if (existing) {
          property = { ...existing, ...property };
        }
      }

      if (!property || typeof property !== 'object') {
        try {
          property = await propertyService.getProperty(propertyId);
        } catch (err) {
          console.error('Error fetching property before opening side panel:', err);
          return false;
        }
      } else if (!property.description || !property.images || property.images.length === 0 || property.latitude == null || property.longitude == null) {
        try {
          const enriched = await propertyService.getProperty(property.id);
          if (enriched) {
            property = { ...enriched, ...property };
          }
        } catch (err) {
          console.warn('Could not enrich property data for side panel:', err);
        }
      }

      if (!property || !property.id) {
        return false;
      }

      setSelectedProperty(property.id);
      setSidePanelProperty(property);
      setSidePanelOpen(true);

      try {
        const recentRaw = localStorage.getItem('recently_viewed_properties');
        const recentArr = recentRaw ? JSON.parse(recentRaw) : [];
        const entry = {
          id: property.id,
          name: property.name,
          price: property.price,
          size: property.size,
          type: property.type,
          images: property.images || [],
          main_image: property.main_image || null,
          previewTourUrl: null,
        };
        const filtered = recentArr.filter((item) => item.id !== entry.id);
        const next = [entry, ...filtered].slice(0, 20);
        localStorage.setItem('recently_viewed_properties', JSON.stringify(next));
      } catch (_) {}

      if (!tourPreviews[property.id]) {
        try {
          const tours = await tourService.getPropertyTours(property.id);
          if (tours && tours.length > 0) {
            let url = tours[0].url;
            if (url && !url.includes('autoLoad=')) {
              url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
            }
            if (url && !url.includes('autoRotate=')) {
              url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
            }
            setTourPreviews((prev) => ({ ...prev, [property.id]: url }));
            setTourCache((prev) => ({ ...prev, [property.id]: url }));
            try {
              const raw = localStorage.getItem('recently_viewed_properties');
              const arr = raw ? JSON.parse(raw) : [];
              const updated = arr.map((item) => (item.id === property.id ? { ...item, previewTourUrl: url } : item));
              localStorage.setItem('recently_viewed_properties', JSON.stringify(updated));
            } catch (_) {}
          }
        } catch (err) {
          console.error('Error prefetching tour for side panel:', err);
        }
      }

      if (!editable) {
        const normalizedBoundary = normalizeBoundary(property.boundary_polygon);
        setPropertyBoundaries(normalizedBoundary || null);
        if (normalizedBoundary) {
          forceMapResize();
        }
      }

      return true;
    } catch (error) {
      console.error('Error opening property panel:', error);
      return false;
    }
  }, [properties, setSelectedProperty, setSidePanelProperty, setSidePanelOpen, tourPreviews, setTourPreviews, setTourCache, editable, forceMapResize]);

  const handleMarkerClick = async (property) => {
    await openSidePanelForProperty(property);
  };

  // Ejecuta animación de zoom suave y abre tour virtual automáticamente
  const handleGoToTour = async () => {
    if (!sidePanelProperty || !mapRef.current) return;

    const property = sidePanelProperty;
    let url = tourCache[property.id] || tourPreviews[property.id];

    // Si aún no tenemos la URL, intenta obtenerla del backend
    if (!url) {
      try {
        const tours = await tourService.getPropertyTours(property.id);
        if (tours && tours.length > 0) {
          url = tours[0].url;
          if (url && !url.includes('autoLoad=')) url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
          if (url && !url.includes('autoRotate=')) url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
          setTourCache(prev => ({ ...prev, [property.id]: url }));
        }
      } catch (err) {
        console.error('Error fetching tour on Go:', err);
      }
    }

    setSidePanelOpen(false);
    setNavigatingToTour(true);

    const map = mapRef.current.getMap();
    const lat = parseFloat(property.latitude);
    const lon = parseFloat(property.longitude);
    if (map && !isNaN(lat) && !isNaN(lon)) {
      map.flyTo({
        center: [lon, lat],
        zoom: 14.5, // Zoom menos agresivo y más natural
        pitch: 0,
        bearing: 0,
        duration: 3500, // Duración más larga para suavidad
        easing: (t) => {
          // Curva de easing más suave: ease-out con deceleración gradual
          // Esta curva acelera al inicio y desacelera suavemente al final
          return 1 - Math.pow(1 - t, 3);
        },
        essential: true,
      });
    }

    // Tras terminar la animación, abrir el tour automáticamente
    setTimeout(() => {
      if (url) {
        setActiveTourUrl(url);
        setActiveTourPropertyId(property.id);
      }
      setNavigatingToTour(false);
    }, 3600); // Ajustado para coincidir con la duración extendida
  };

  const handleMarkerHover = (property) => {
    try {
      const currentZoom = mapRef.current?.getMap?.()?.getZoom?.() ?? 0;
      if (currentZoom < POPUP_MIN_ZOOM) return;
    } catch (_) {}
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
    forceMapResize();
  };

  const handleBoundariesUpdate = (boundaries) => {
    const normalized = normalizeBoundary(boundaries);
    setPropertyBoundaries(normalized);
    if (onBoundariesUpdate) {
      onBoundariesUpdate(normalized);
    }
    // console.log('Boundaries updated:', normalized); // Debug log
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

  const startGrandFinale = useCallback(() => {
    if (!mapRef.current || userInteractedRef.current) {
      if (!userInteractedRef.current) setAutoFlyCompleted(true);
      return;
    }
    
    const map = mapRef.current.getMap();
    
    // Vuelo final a una vista global, centrando por longitud actual
    map.flyTo({
      center: [map.getCenter().lng, 0],
      zoom: 2.0,
      pitch: 0,
      bearing: 0,
      duration: 6500,
      essential: true,
    });

    // En lugar de depender de eventos como 'moveend' o 'idle', que pueden ser inconsistentes
    // después de animaciones complejas, usamos un temporizador como fuente de verdad.
    // Se ejecuta un poco después de que la animación 'flyTo' debería haber terminado.
    const finaleTimeoutId = setTimeout(() => {
        // Si el usuario interactuó en el último momento, no hacemos nada.
        if (userInteractedRef.current || !mapRef.current) return;

        const m = mapRef.current.getMap();
        
        // 1. Detener cualquier animación residual para 'liberar' el mapa.
        try { m.stop(); } catch (e) { console.error("Error al detener el mapa en el final:", e); }
        
        // 2. Limpiar temporizadores de la secuencia de vuelo anterior.
        if (flightTimeoutIdRef.current) {
            clearTimeout(flightTimeoutIdRef.current);
            flightTimeoutIdRef.current = null;
        }

        // 3. Actualizar el estado de la aplicación.
        setAutoFlyCompleted(true);
        setShowOverlay(false);

        // 4. Habilitar explícitamente TODOS los controles de interacción del usuario.
        try {
            m.dragPan.enable();
            m.scrollZoom.enable();
            m.boxZoom.enable();
            m.dragRotate.enable();
            m.keyboard.enable();
            m.doubleClickZoom.enable();
            m.touchZoomRotate.enable();
        } catch (e) {
            console.error("Error al habilitar los controles del mapa:", e);
        }

        // 5. Iniciar la rotación del globo.
        if (enableIdleRotation) {
          setIsRotating(true);
        }

    }, 6600); // 100ms después de la duración del flyTo
  }, [initialMapViewState, setAutoFlyCompleted, setIsRotating, enableIdleRotation]);

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
        // Priorizar Chile: primero escogeremos propiedades dentro de Chile
        const CHILE_LAT_MIN = -56, CHILE_LAT_MAX = -17;
        const CHILE_LON_MIN = -75, CHILE_LON_MAX = -66;
        const chileProps = properties.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && p.latitude >= CHILE_LAT_MIN && p.latitude <= CHILE_LAT_MAX && p.longitude >= CHILE_LON_MIN && p.longitude <= CHILE_LON_MAX);

        const chileLatRanges = [
          { min: -35, max: -30, name: "Centro" },
          { min: -40, max: -35, name: "Centro-Sur" },
          { min: -45, max: -40, name: "Sur" },
          { min: -50, max: -45, name: "Aysén" },
          { min: -55, max: -50, name: "Magallanes" }
        ];
        // Elegir la primera propiedad SIEMPRE en Chile si existe
        let firstChileCandidate = null;
        for (const range of chileLatRanges) {
          const inRange = chileProps.filter(p => p.latitude >= range.min && p.latitude < range.max);
          if (inRange.length > 0) { firstChileCandidate = inRange[Math.floor(Math.random()*inRange.length)]; break; }
        }
        if (firstChileCandidate) {
          selectedProperties.push({
            center: [firstChileCandidate.longitude, firstChileCandidate.latitude],
            zoom: 10,
            pitch: 45,
            bearing: 0,
            name: firstChileCandidate.name
          });
        }
        // Luego, agregar más propiedades dentro de Chile para no marear
        const latRanges = chileLatRanges;
        for (const range of latRanges) {
          const propertiesInRange = chileProps.filter(prop => prop.latitude >= range.min && prop.latitude < range.max);
          if (propertiesInRange.length > 0) {
            const randomProperty = propertiesInRange[Math.floor(Math.random() * propertiesInRange.length)];
            if (!firstChileCandidate || randomProperty.id !== firstChileCandidate.id) {
              selectedProperties.push({
                center: [randomProperty.longitude, randomProperty.latitude],
                zoom: Math.random() > 0.5 ? 8 : 10,
                pitch: 30 + Math.random() * 30,
                bearing: Math.random() * 360,
                name: randomProperty.name
              });
            }
          }
        }

        if (selectedProperties.length < 3 && Array.isArray(chileProps) && chileProps.length > 0) {
          const shuffled = [...chileProps].sort(() => 0.5 - Math.random());
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
              if (!userInteractedRef.current) startGrandFinale();
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
        // Si no hay propiedades chilenas en memoria, usa recorrido de Chile por defecto
        const flightPath = countryFlightPaths['chile'];
        let currentStep = 0;

        const flyToNextGenericPoint = () => {
          if (userInteractedRef.current || !mapRef.current || !isMapLoaded || currentStep >= flightPath.length) {
            if (!userInteractedRef.current) startGrandFinale();
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
  }, [isMapLoaded, properties, countryFlightPaths, autoFlyCompleted, setAutoFlyCompleted, connectionType, startGrandFinale]);

  // Detectar ubicación del usuario y comenzar vuelo automático
  useEffect(() => {
    if (editable || autoFlightAttemptedRef.current || disableIntroAnimation || userInteractedRef.current || autoFlyCompleted) {
      if (editable || disableIntroAnimation || userInteractedRef.current) {
          if (!userInteractedRef.current) setAutoFlyCompleted(true); // Asegurar que se marque como completado
          setShowOverlay(false);
      }
      return;
    }

    if (isMapUIReady && isMapLoaded && !loading) {
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
            // No se pudo obtener ubicación: por defecto usamos tour de Chile
            performAutoFlight('chile'); 
          }
        );
      } else {
        // Geolocalización no soportada: por defecto Chile
        performAutoFlight('chile');
      }
    } 
  }, [isMapUIReady, isMapLoaded, loading, properties, editable, autoFlyCompleted, getCountryFromCoords, performAutoFlight, disableIntroAnimation]);

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
      
      // No dynamic tile mutation; tiles are preconfigured to yesterday's date in config

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
      try {
        // Marcar UI lista cuando el mapa queda idle (sin tareas pendientes de render)
        map.once('idle', () => setIsMapUIReady(true));
      } catch (_) {}
      
      // Llamar al callback externo si existe
      if (onLoad) {
        onLoad(mapRef.current);
      }
    }
  }, [onLoad]);

  useEffect(() => {
    if (forceContinuousRotation) {
      if (isMapLoaded) {
        setIsRotating(true);
      }
      return;
    }

    if (!enableIdleRotation) {
      setIsRotating(false);
    }
  }, [forceContinuousRotation, enableIdleRotation, isMapLoaded]);

  // Listeners globales para pausar/reanudar rotación con interacción real del usuario
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();

    if (!enableIdleRotation) {
      if (idleRotationTimeoutRef.current) {
        clearTimeout(idleRotationTimeoutRef.current);
        idleRotationTimeoutRef.current = null;
      }
      return;
    }

    const onMoveStart = (e) => {
      if (e && e.originalEvent) {
        setIsRotating(false);
        if (idleRotationTimeoutRef.current) {
          clearTimeout(idleRotationTimeoutRef.current);
          idleRotationTimeoutRef.current = null;
        }
      }
    };

    const onMoveEnd = (e) => {
      if (e && e.originalEvent) {
        // reprogramar rotación si quedamos alejados
        if (idleRotationTimeoutRef.current) clearTimeout(idleRotationTimeoutRef.current);
        idleRotationTimeoutRef.current = setTimeout(() => {
          const zoom = map.getZoom();
          if (zoom <= 3.2 && !activeTourUrlRef.current && enableIdleRotation) {
            map.setPitch(0);
            map.setBearing(0);
            setIsRotating(true);
          }
        }, 7000);
      }
    };

    map.on('movestart', onMoveStart);
    map.on('moveend', onMoveEnd);

    return () => {
      map.off('movestart', onMoveStart);
      map.off('moveend', onMoveEnd);
    };
  }, [isMapLoaded, enableIdleRotation]);

  // Rotación suave del globo a velocidad constante
  useEffect(() => {
    const rotationAllowed = enableIdleRotation || forceContinuousRotation;
    if (!rotationAllowed) {
      if (rotationFrameId.current) {
        cancelAnimationFrame(rotationFrameId.current);
        rotationFrameId.current = null;
      }
      rotationPrevTimeRef.current = null;
      return;
    }

    const rotationSpeed = forceContinuousRotation
      ? HERO_ROTATION_SPEED_DEG_PER_SEC
      : IDLE_ROTATION_SPEED_DEG_PER_SEC;

    const step = (timestamp) => {
      if (!mapRef.current || !isRotating || userInteractedRef.current) {
        if (rotationFrameId.current) cancelAnimationFrame(rotationFrameId.current);
        rotationFrameId.current = null;
        rotationPrevTimeRef.current = null;
        return;
      }

      const map = mapRef.current.getMap();
      if (!rotationPrevTimeRef.current) rotationPrevTimeRef.current = timestamp;
      const deltaSec = Math.min(0.05, (timestamp - rotationPrevTimeRef.current) / 1000);
      rotationPrevTimeRef.current = timestamp;

      // Rotar linealmente; permitir que el usuario interrumpa libremente (movestart listener pausa)
      map.setBearing(map.getBearing() + rotationSpeed * deltaSec);
      rotationFrameId.current = requestAnimationFrame(step);
    };

    if (isRotating) {
      rotationFrameId.current = requestAnimationFrame(step);
    } else if (rotationFrameId.current) {
      cancelAnimationFrame(rotationFrameId.current);
      rotationFrameId.current = null;
      rotationPrevTimeRef.current = null;
    }

    return () => {
      if (rotationFrameId.current) cancelAnimationFrame(rotationFrameId.current);
      rotationFrameId.current = null;
      rotationPrevTimeRef.current = null;
    };
  }, [isRotating, enableIdleRotation, forceContinuousRotation]);

  // Prefetch tours when zoom is moderate
  const prefetchToursInViewport = useCallback(async () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const zoom = map.getZoom();
    if (zoom < 11) return; // solo si estamos relativamente cerca

    // Obtener propiedades visibles
    const bounds = map.getBounds();
    const idsToPrefetch = properties
      .filter(p => p.has_tour && !tourCache[p.id] && p.longitude != null && p.latitude != null &&
        bounds.contains([p.longitude, p.latitude]))
      .slice(0, 5) // límite para evitar excesos
      .map(p => p.id);

    if (idsToPrefetch.length === 0) return;

    idsToPrefetch.forEach(async pid => {
      try {
        const tours = await tourService.getPropertyTours(pid);
        if (tours && tours.length > 0) {
          let url = tours[0].url;
          if (url && !url.includes('autoLoad=')) url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
          if (url && !url.includes('autoRotate=')) url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
          setTourCache(prev => ({ ...prev, [pid]: url }));

          // Prefetch resource creando iframe oculto
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);
          setTimeout(() => iframe.remove(), 10000); // remover después de 10s
        }
      } catch (e) { console.error('prefetch error', e); }
    });
  }, [properties, tourCache]);

  // Infinite scroll logic on map move
  const handleMapMoveEnd = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const map = mapRef.current.getMap();
      // Reprogramar rotación por inactividad tras cualquier movimiento
      if (enableIdleRotation && !activeTourUrlRef.current) {
        setIsRotating(false);
        if (idleRotationTimeoutRef.current) clearTimeout(idleRotationTimeoutRef.current);
        idleRotationTimeoutRef.current = setTimeout(() => {
          const zoom = map.getZoom();
          if (zoom <= 3.2 && enableIdleRotation) {
            map.setPitch(0);
            map.setBearing(0);
            setIsRotating(true);
          }
        }, 7000);
      }
      // -------------- Seamless zoom-to-tour logic -----------------
      const currentZoom = map.getZoom();
      if (currentZoom >= 14.5) {
        const center = map.getCenter();
        // Función auxiliar para distancia en metros (Haversine)
        const metersBetween = (lat1, lon1, lat2, lon2) => {
          const R = 6371000;
          const toRad = deg => deg * Math.PI / 180;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        let nearest = null;
        let minDist = Infinity;
        properties.forEach(prop => {
          if (prop.latitude == null || prop.longitude == null) return;
          const dist = metersBetween(center.lat, center.lng, prop.latitude, prop.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearest = prop;
          }
        });

        const DIST_THRESHOLD = 600; // metros
        if (nearest && minDist <= DIST_THRESHOLD && nearest.id !== activeTourPropertyIdRef.current) {
          (async () => {
            try {
              const tours = await tourService.getPropertyTours(nearest.id);
              console.log('Zoom-trigger fetch tours', nearest.id, tours.length);
              if (tours && tours.length > 0) {
                let url = tours[0].url;
                if (url && !url.includes('autoLoad=')) url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
                if (url && !url.includes('autoRotate=')) url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
                setActiveTourUrl(url);
                setActiveTourPropertyId(nearest.id);
              }
            } catch (e) {
              console.error('Error loading tour on zoom-in:', e);
            }
          })();
        }
      } else if (currentZoom < 13.5 && activeTourUrlRef.current) {
        // Alejando: cerrar tour
        setActiveTourUrl(null);
        setActiveTourPropertyId(null);
      }
      //-----------------------------------------------------------

      // Prefetch tours for nearby properties
      prefetchToursInViewport();

      if (!loadingMore && hasNextPage && !editable && !loading) {
        // Logica existente de infinite scroll (mantener)
        const currentViewport = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bounds: map.getBounds()
        };
        lastLoadViewportRef.current = currentViewport; // Update viewport ref before loading
        handleLoadMore(); // Call the memoized and stable handleLoadMore
      }
    }, 500);
  }, [loadingMore, hasNextPage, editable, loading, handleLoadMore, properties, prefetchToursInViewport, tourCache, enableIdleRotation]);

  const renderPropertyBoundaries = (property) => {
    const feature = toFeaturePolygon(property?.boundary_polygon);
    if (!feature?.geometry?.coordinates) {
      return null;
    }

    return (
      <Source
        id={`boundary-source-${property.id}`}
        type="geojson"
        data={feature}
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
        8, 6,   // Zoom bajo = puntos pequeños (aumentado para mejor puntería)
        12, 10, // Zoom medio = puntos medianos (aumentado)
        16, 14  // Zoom alto = puntos grandes (aumentado)
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

    // Evitar selección si el zoom es bajo (coherente con hover)
    const currentZoom = map.getZoom();
    if (currentZoom < POPUP_MIN_ZOOM) {
      return;
    }

    // Check if layers exist before querying
    const unclusteredLayerExists = map.getLayer(unclusteredPointLayer.id);

    if (!unclusteredLayerExists) {
      // console.warn('Attempted to query features, but target layers do not exist.');
      return;
    }

    const queryLayers = [unclusteredPointLayer.id];

    // Aumentar el radio de búsqueda alrededor del click para facilitar selección
    const pad = 12; // píxeles alrededor del punto de click
    const bbox = [
      [event.point.x - pad, event.point.y - pad],
      [event.point.x + pad, event.point.y + pad]
    ];
    const features = map.queryRenderedFeatures(bbox, { layers: queryLayers });

    if (features && features.length > 0) {
      const feature = features[0];
      if (feature.layer.id === unclusteredPointLayer.id) {
        handleMarkerClick(feature.properties);
      }
    }
  }, [navigatingToTour, handleMarkerClick, stopAndSkipAnimation, autoFlyCompleted]);

  const scheduleIdleRotation = useCallback(() => {
    if (!enableIdleRotation) {
      if (idleRotationTimeoutRef.current) {
        clearTimeout(idleRotationTimeoutRef.current);
        idleRotationTimeoutRef.current = null;
      }
      return;
    }
    if (idleRotationTimeoutRef.current) {
      clearTimeout(idleRotationTimeoutRef.current);
      idleRotationTimeoutRef.current = null;
    }
    idleRotationTimeoutRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      const map = mapRef.current.getMap();
      const zoom = map.getZoom();
      if (zoom <= 3.2 && !activeTourUrlRef.current && enableIdleRotation) {
        map.setPitch(0);
        map.setBearing(0);
        setIsRotating(true);
      }
    }, 7000);
  }, [enableIdleRotation]);

  const handleUserInteraction = useCallback((event) => {
    // Detectar si es una interacción genuina del usuario
    if (event.originalEvent && !userInteractedRef.current && !autoFlyCompleted) {
        // console.log('Interacción de movimiento en mapa, deteniendo animación intro.');
        stopAndSkipAnimation();
    }
    if (event.originalEvent) {
      // Pausar rotación y reprogramar tras 7s de inactividad
      setIsRotating(false);
      scheduleIdleRotation();
    }
  }, [stopAndSkipAnimation, autoFlyCompleted, scheduleIdleRotation]);

  const onMapMouseMove = useCallback(event => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    // Ocultar popups si el zoom es bajo (no invasivo en vista lejana)
    const currentZoom = map.getZoom();
    if (currentZoom < POPUP_MIN_ZOOM) {
      map.getCanvas().style.cursor = '';
      if (popupInfo) setPopupInfo(null);
      return;
    }

    // Check if layer exists before querying
    const unclusteredLayerExists = map.getLayer(unclusteredPointLayer.id);

    if (unclusteredLayerExists) {
      // Usar un cuadro alrededor del cursor para mejorar la detección del hover
      const pad = 10; // píxeles de margen para hover
      const bbox = [
        [event.point.x - pad, event.point.y - pad],
        [event.point.x + pad, event.point.y + pad]
      ];
      const features = map.queryRenderedFeatures(bbox, { layers: [unclusteredPointLayer.id] });
      map.getCanvas().style.cursor = features && features.length > 0 ? 'pointer' : '';
      if (features && features.length > 0) {
        const feature = features[0];
        // Evitar que se oculte el popup justo al mover dentro del área
        try { clearTimeout(window.tooltipHideTimeout); } catch (_) {}
        setPopupInfo({
          ...feature.properties,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        });
      } else {
        // Introducir una pequeña demora para evitar parpadeo al salir levemente del punto
        try { clearTimeout(window.tooltipHideTimeout); } catch (_) {}
        window.tooltipHideTimeout = setTimeout(() => {
          setPopupInfo(null);
        }, 150);
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
    getMapInstance: () => mapRef.current,
    getMap: () => {
      try { return mapRef.current?.getMap?.(); } catch (_) { return null; }
    },
    openPropertyTour: async (prop, options = {}) => {
      try {
        const propertyId = (prop && prop.id) ? prop.id : prop;
        if (!propertyId) return false;

        let url = tourCache[propertyId] || tourPreviews[propertyId];
        if (!url) {
          const tours = await tourService.getPropertyTours(propertyId);
          const first = Array.isArray(tours) ? tours.find(t => t && t.url) : null;
          if (first && first.url) {
            url = first.url;
            if (!url.includes('autoLoad=')) url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
            if (!url.includes('autoRotate=')) url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
            setTourCache(prev => ({ ...prev, [propertyId]: url }));
          }
        }

        if (!url) return false;

        const map = mapRef.current;
        const duration = options.duration || 3000;
        const zoom = options.zoom || 14.5;
        const lat = parseFloat(prop?.latitude);
        const lon = parseFloat(prop?.longitude);

        // Mostrar overlay/estado de navegación mientras hacemos zoom-in
        // Pequeña demora para evitar un dark flash inmediato al click
        setTourTransitionDuration(duration);
        setTimeout(() => setNavigatingToTour(true), 150);

        if (map && !isNaN(lat) && !isNaN(lon)) {
          map.flyTo({
            center: [lon, lat],
            zoom,
            pitch: 0,
            bearing: 0,
            duration,
            essential: true,
            easing: (t) => 1 - Math.pow(1 - t, 3)
          });
          setTimeout(() => {
            setActiveTourUrl(url);
            setActiveTourPropertyId(propertyId);
            setNavigatingToTour(false);
          }, duration + 120);
        } else {
          setActiveTourUrl(url);
          setActiveTourPropertyId(propertyId);
          setNavigatingToTour(false);
        }
        return true;
      } catch (e) {
        console.error('Error opening property tour:', e);
        return false;
      }
    },
    openPropertyPanel: async (prop) => {
      return openSidePanelForProperty(prop);
    },

    showRecommendationsTour: (recs, options = {}) => {
      if (!Array.isArray(recs) || recs.length === 0 || !mapRef.current) return;

      const DURATION = options.duration || 4500; // ms per property
      const ZOOM = options.zoom || 11;
      const PITCH = options.pitch || 45;
      const BEARING = options.bearing || 0;

      // Cancel any existing tour
      if (recommendationsTourTimeoutRef.current) {
        clearTimeout(recommendationsTourTimeoutRef.current);
        recommendationsTourTimeoutRef.current = null;
      }

      let idx = 0;
      const flyToNext = () => {
        if (idx >= recs.length) return; // finished
        const prop = recs[idx];
        if (prop.longitude == null || prop.latitude == null) {
          idx++;
          flyToNext();
          return;
        }

        // Focus map
        mapRef.current.flyTo({
          center: [prop.longitude, prop.latitude],
          zoom: ZOOM,
          pitch: PITCH,
          bearing: BEARING,
          duration: DURATION,
          essential: true,
        });

        // Show popup info
        setPopupInfo(prop);

        idx++;
        recommendationsTourTimeoutRef.current = setTimeout(flyToNext, DURATION + 1000); // wait a bit more than flight
      };

      flyToNext();
    },
    hideIntroOverlay: () => {
      setShowOverlay(false);
      setAutoFlyCompleted(true);
      userInteractedRef.current = true;
      if (flightTimeoutIdRef.current) {
        clearTimeout(flightTimeoutIdRef.current);
        flightTimeoutIdRef.current = null;
      }
    }
  }));

  // Load tour preview when popupInfo changes
  useEffect(() => {
    const fetchPreview = async () => {
      if (!popupInfo || tourPreviews[popupInfo.id]) return;
      try {
        // Utilizar getPropertyTours para asegurar que recibimos solo tours válidos (paquetes e iframes reales)
        const tours = await tourService.getPropertyTours(popupInfo.id);
        // getPropertyTours ya devuelve un arreglo filtrado/ordenado. Tomamos el primero con URL válida.
        const first = Array.isArray(tours) ? tours.find(t => t.url) : null;
        if (first && first.url) {
          let url = first.url;
          // Asegurar parámetros óptimos para carga embebida
          if (!url.includes('autoLoad=')) url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
          if (!url.includes('autoRotate=')) url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
          setTourPreviews(prev => ({ ...prev, [popupInfo.id]: url }));
        }
      } catch (err) { console.error('Error loading tour preview', err); }
    };
    fetchPreview();
  }, [popupInfo]);

  // Eliminar return bloqueante: siempre renderizamos el mapa y mostramos overlay si hace falta

  // Buscar lugares con Mapbox Geocoding (debounced)
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!editable) return; // solo en modo edición/publicación
    if (q.length < 3) { setSearchResults([]); if (searchAbortRef.current) { try { searchAbortRef.current.abort(); } catch (_) {} } return; }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=6`;
        const resp = await fetch(endpoint, { signal: controller.signal });
        const data = await resp.json();
        const feats = Array.isArray(data?.features) ? data.features : [];
        setSearchResults(feats.map(f => ({ id: f.id, place_name: f.place_name_es || f.place_name, center: f.center })));
      } catch (e) {
        if (e?.name !== 'AbortError') console.error('Geocoding error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); try { controller.abort(); } catch (_) {} };
  }, [searchQuery, editable, MAPBOX_TOKEN]);

  const handleSelectSearchResult = useCallback((res) => {
    if (!res || !Array.isArray(res.center) || res.center.length < 2) return;
    const [lon, lat] = res.center;
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lon, lat], zoom: 14, duration: 1200, essential: true });
    }
    if (editable && onLocationSelect) {
      onLocationSelect({ longitude: lon, latitude: lat });
    }
    setSearchResults([]);
  }, [editable, onLocationSelect]);

  return (
    <Box
      data-using-demo={usingDemoData ? 'true' : 'false'}
      sx={{ 
      width: '100%', 
      height: embedded ? (embeddedHeight || 420) : '100vh', 
      position: embedded ? 'relative' : 'fixed', 
      top: embedded ? 'auto' : 0, 
      left: embedded ? 'auto' : 0, 
      zIndex: 1,
      borderRadius: embedded ? 2 : 0,
      overflow: 'hidden'
    }}>
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
      
      {/* Mapa siempre visible para que pueda inicializar y disparar 'idle' */}
      {!error && (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => {
            setViewState(evt.viewState);
            handleUserInteraction(evt); // Llamar aquí para detectar interacción
          }}
          initialViewState={propInitialViewState || initialMapViewState}
          onLoad={onMapLoad}
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          attributionControl={false}
          projection={{ name: 'globe' }}
          onMoveEnd={handleMapMoveEnd}
          onClick={(e) => {
            if (editable) {
              // Location pick for embedded/edit mode
              const { lng, lat } = e.lngLat || {};
              if (typeof lng === 'number' && typeof lat === 'number' && onLocationSelect) {
                onLocationSelect({ longitude: lng, latitude: lat });
              }
            } else {
              onMapClick(e);
            }
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
           preserveDrawingBuffer={false}
        >
           <NavigationControl 
            position="bottom-right"
            showCompass={true}
            showZoom={true}
            visualizePitch={true}
            style={{
                position: 'absolute',
                bottom: embedded ? '12px' : '30px',
                right: embedded ? '12px' : '30px',
                zIndex: 5,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: '12px',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                color: 'white',
            }}
            aria-label="Controles de navegación del mapa"
          />
          <AttributionControl 
            position="bottom-left" 
            compact={true} 
            style={{
                position: 'absolute',
                bottom: embedded ? '8px' : '10px',
                left: embedded ? '8px' : '10px',
                zIndex: 5,
                backgroundColor: 'rgba(255,255,255,0.18)',
                padding: '2px 5px',
                borderRadius: '12px',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                color: 'white',
             }}
          />
          {editable && (
            <Box sx={{ position: 'absolute', top: embedded ? 8 : 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 'min(720px, 92vw)' }}>
              <Paper elevation={3} sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.92)' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar dirección, ciudad o lugar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="new-password"
                  inputProps={{ autoComplete: 'new-password', spellCheck: 'false', 'data-lpignore': 'true' }}
                  onFocus={(e) => { try { e.target.setAttribute('autocomplete', 'new-password'); e.target.setAttribute('autocorrect','off'); } catch(_){} }}
                  InputProps={{ endAdornment: searchLoading ? <CircularProgress size={16} /> : null }}
                />
                {searchResults.length > 0 && (
                  <Paper elevation={4} sx={{ mt: 1, borderRadius: 2, maxHeight: 280, overflowY: 'auto' }}>
                    <List dense>
                      {searchResults.map((r) => (
                        <ListItem key={r.id} disableGutters>
                          <ListItemButton onClick={() => handleSelectSearchResult(r)}>
                            <ListItemText primary={r.place_name} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Paper>
            </Box>
          )}
          {editable && isDrawingMode && mapRef.current && (
            <PropertyBoundaryDraw 
              map={mapRef.current.getMap()} 
              onBoundariesUpdate={handleBoundariesUpdate}
              existingBoundaries={propertyBoundaries}
              compact={embedded}
            />
          )}
          {editable && !isDrawingMode && boundaryFeature && (
            <Source id="editable-boundary-preview" type="geojson" data={boundaryFeature}>
              <Layer id="editable-boundary-preview-fill" type="fill" paint={{ 'fill-color': '#2E7D32', 'fill-opacity': 0.25 }} />
              <Layer id="editable-boundary-preview-line" type="line" paint={{ 'line-color': '#2E7D32', 'line-width': 2 }} />
            </Source>
          )}
          {editable && propertyMarkerCoords && (
            <Marker
              longitude={propertyMarkerCoords[0]}
              latitude={propertyMarkerCoords[1]}
              color="#1E8578"
            />
          )}
          {!editable && boundaryFeature && (
            <Source id="boundary-preview" type="geojson" data={boundaryFeature}>
              <Layer id="boundary-preview-fill" type="fill" paint={{ 'fill-color': '#2E7D32', 'fill-opacity': 0.25 }} />
              <Layer id="boundary-preview-line" type="line" paint={{ 'line-color': '#2E7D32', 'line-width': 2 }} />
            </Source>
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
                bottom: embedded ? '68px' : '100px',
                right: embedded ? '12px' : '30px',
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
              className="skyterra-popup"
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              closeButton={false}
              closeOnClick={false}
              onClose={() => setPopupInfo(null)}
              anchor="bottom"
              offset={15} 
              maxWidth="420px"
            >
              <Card elevation={0} sx={{ 
                width: 420,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(20,20,24,0.28)',
                backdropFilter: 'blur(12px) saturate(120%)',
                WebkitBackdropFilter: 'blur(12px) saturate(120%)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                color: 'white',
                columnGap: '10px'
              }}>
                <CardContent sx={{ p: 1.5, pr: 1, '&:last-child': { pb: 1.5 }, flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 170 }}>
                  <Typography gutterBottom variant="subtitle1" component="div" sx={{fontSize: '1rem', fontWeight: 500, color:'rgba(255,255,255,0.95)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                    {popupInfo.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5, color:'white', opacity:0.85 }}>
                    Precio: {getPriceDisplay(popupInfo)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5, color:'white', opacity:0.85 }}>
                    Tamaño: {Number(popupInfo.size).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ha
                  </Typography>
                  {/* Oculto: no mostramos etiquetas de tipo/categoría */}
                </CardContent>
                <Box sx={{
                  width: 170,
                  height: 170,
                  m: 1,
                  flex: '0 0 42%',
                  alignSelf: 'center',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {tourPreviews[popupInfo.id] ? (
                    <iframe src={tourPreviews[popupInfo.id]} width="100%" height="100%" style={{ border: 0, display: 'block' }} title={`Preview ${popupInfo.name}`} />
                  ) : (
                    (popupInfo.images && popupInfo.images.length > 0) ? (
                      <CardMedia component="img" image={popupInfo.images[0].url} alt={popupInfo.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : null
                  )}
                </Box>
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

      {/* Splash de carga hasta que el mapa esté realmente listo */}
      <AnimatePresence>
        {(!isMapUIReady || (loading && !editable)) && !error && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0d1117',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 120,
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CircularProgress sx={{ color: 'rgba(255,255,255,0.85)' }} />
              <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.85)' }}>Cargando mapa...</Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro/animación solo cuando el mapa ya está listo y no hay carga */}
      <AnimatePresence>
        {!disableIntroAnimation && showOverlay && isMapUIReady && !loading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
              width: { xs: '92vw', sm: '84vw', md: 620 },
              maxWidth: 620,
              px: { xs: 3, md: 3.25 },
              py: { xs: 2.75, md: 3 },
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              borderRadius: '24px',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
            component={motion.div}
            layout
            transition={{ layout: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } }}
          >
            <motion.div
              key={currentTextIndex}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ 
                duration: 0.5, 
                ease: [0.25, 0.1, 0.25, 1]
              }}
            >
              <Typography
                variant="h2"
                component="div"
                sx={{
                  fontFamily: '"Helvetica", Arial, sans-serif',
                  fontWeight: 500,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  color: 'rgba(255, 255, 255, 0.95)',
                  mb: 2,
                  letterSpacing: '-0.02em'
                }}
              >
                {descriptiveTexts[currentTextIndex] && descriptiveTexts[currentTextIndex].dynamicWords ? (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
                    {/* Slot de ancho fijo basado en la palabra más larga */}
                    <Box component="span" sx={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
                      {/* Elemento invisible que define el ancho del slot (palabra más larga) */}
                      <Box aria-hidden component="span" sx={{ visibility: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                        {renderEmphasis('Invierte')}
                      </Box>
                      {/* Capa absoluta centrada */}
                      <Box component="span" sx={{ position: 'absolute', top: 0, left: 0, right: 0, textAlign: 'center' }}>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={dynamicWordIndex}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -18, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                            style={{ whiteSpace: 'nowrap', display: 'inline-block' }}
                          >
                            {renderEmphasis(descriptiveTexts[currentTextIndex].dynamicWords[dynamicWordIndex])}
                          </motion.span>
                        </AnimatePresence>
                      </Box>
                    </Box>
                    {/* Espacio y parte fija */}
                    <Box component="span" sx={{ ml: { xs: 2.25, md: 3 } }}>
                      {renderEmphasis(descriptiveTexts[currentTextIndex].titleAfter || '')}
                    </Box>
                  </Box>
                ) : (
                  renderEmphasis(descriptiveTexts[currentTextIndex].title)
                )}
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  fontFamily: '"Helvetica", Arial, sans-serif',
                  fontWeight: 300,
                  fontSize: { xs: '1.1rem', md: '1.4rem' },
                  color: 'rgba(255, 255, 255, 0.85)',
                  mb: 1,
                  letterSpacing: '-0.01em'
                }}
              >
                {renderEmphasis(descriptiveTexts[currentTextIndex].subtitle)}
              </Typography>
              
              {descriptiveTexts[currentTextIndex].description && (
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: '"Helvetica", Arial, sans-serif',
                    fontWeight: 300,
                    fontSize: { xs: '0.95rem', md: '1.1rem' },
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1.6,
                    maxWidth: '400px',
                    mx: 'auto'
                  }}
                >
                  {descriptiveTexts[currentTextIndex].description}
                </Typography>
              )}
            </motion.div>

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={stopAndSkipAnimation}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  fontFamily: '"Helvetica", Arial, sans-serif',
                  fontWeight: 500,
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: '16px',
                  textTransform: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                startIcon={<TravelExploreIcon />}
              >
                Explorar
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
          </motion.div>
        )}
      </AnimatePresence>

      <PropertyPreviewModal
        open={previewModalOpen}
        propertyId={previewPropertyId}
        onClose={() => setPreviewModalOpen(false)}
      />

      {/* Overlay de navegación al tour (fade sutil) */}
      <AnimatePresence>
        {navigatingToTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: Math.max(0.25, (tourTransitionDuration || 350) / 1000), ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.36) 60%, rgba(0,0,0,0.5) 100%)',
              zIndex: 35,
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      {/* Overlay del tour 360° con animación de aparición */}
      <AnimatePresence>
        {activeTourUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          >
            <iframe
              src={activeTourUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
              title="Tour Virtual 360°"
            />
            <Fab
              size="medium"
              onClick={() => { setActiveTourUrl(null); setActiveTourPropertyId(null); }}
              sx={{ position: 'absolute', top: '24px', right: '24px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}
            >
              <CloseIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel lateral de preview */}
      <PropertySidePreview
        open={sidePanelOpen}
        property={sidePanelProperty}
        previewUrl={sidePanelProperty ? tourPreviews[sidePanelProperty.id] : null}
        onClose={() => setSidePanelOpen(false)}
        onGo={handleGoToTour}
        getPriceDisplay={getPriceDisplay}
      />
    </Box>
  );
});

export default MapView;
