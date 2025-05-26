import React, { useState, useEffect, useRef, useCallback, useContext, useImperativeHandle, forwardRef } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, IconButton, Snackbar, Alert } from '@mui/material';
import { propertyService, tourService } from '../../services/api';
import Map, { Marker, NavigationControl, Popup, Source, Layer, AttributionControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import TerrainIcon from '@mui/icons-material/Terrain';
import View3dIcon from '@mui/icons-material/ViewInAr';
import NorthIcon from '@mui/icons-material/Navigation';
import EditIcon from '@mui/icons-material/Edit';
import PropertyBoundaryDraw from './PropertyBoundaryDraw';
import { useNavigate } from 'react-router-dom';
import { ThemeModeContext } from '../../App';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import config from '../../config/environment';

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

const MapView = forwardRef(({ filters, editable = false, onBoundariesUpdate, initialViewState, initialGeoJsonBoundary }, ref) => {
  const navigate = useNavigate();
  const { mode, theme } = useContext(ThemeModeContext);
  // Estados
  const [properties, setProperties] = useState([]);
  const [propertiesGeoJSON, setPropertiesGeoJSON] = useState(propertiesToGeoJSON([])); // NEW: GeoJSON state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewState, setViewState] = useState(initialViewState || {
    longitude: -70.6693,
    latitude: -33.4489,
    zoom: 3,
    pitch: 45, // SIEMPRE EN 3D - Ángulo de inclinación por defecto
    bearing: 0, // Rotación del mapa
  });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [is3dEnabled, setIs3dEnabled] = useState(true); // SIEMPRE ACTIVADO POR DEFECTO
  const [isDrawingMode, setIsDrawingMode] = useState(editable);
  const [propertyBoundaries, setPropertyBoundaries] = useState(initialGeoJsonBoundary || null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [navigatingToTour, setNavigatingToTour] = useState(false);
  const mapRef = useRef(null);

  // Define map styles
  const mapStyles = config.mapbox.styles;

  const [currentMapStyle, setCurrentMapStyle] = useState(mapStyles[mode]);

  // Update map style when theme mode changes
  useEffect(() => {
    setCurrentMapStyle(mapStyles[mode]);
    // react-map-gl will handle the mapStyle prop change and trigger Mapbox's default transition
  }, [mode]);

  // Cargar propiedades y transformar a GeoJSON
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const params = { ...filters }; // Ensure filters is an object
        const data = await propertyService.getProperties(params);
        const activeProperties = data.results || [];
        setProperties(activeProperties);
        setPropertiesGeoJSON(propertiesToGeoJSON(activeProperties)); // NEW: Update GeoJSON
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar propiedades:', err);
        setError('No se pudieron cargar las propiedades. Intente nuevamente más tarde.');
        setProperties([]);
        setPropertiesGeoJSON(propertiesToGeoJSON([])); // NEW: Clear GeoJSON on error
        setLoading(false);
      }
    };

    if (!editable) { // Only fetch and display multiple properties if not in pure editable mode
        fetchProperties();
    }
     else {
        setLoading(false); // If editable, don't load all properties unless specifically handled
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
      zoom: 15, // Zoom in closer to the property
      pitch: 45, // Angle the view
      bearing: viewState.bearing,
      duration: 2500, // Duration of the flight animation in milliseconds
      essential: true,
    });

    // Wait for the flyTo animation to be substantially complete
    setTimeout(async () => {
      try {
        const tourData = await tourService.getTours(property.id);
        if (tourData && tourData.results && tourData.results.length > 0) {
          const firstTourId = tourData.results[0].id;
          localStorage.setItem('directTourNavigation', 'true');
          navigate(`/tour/${firstTourId}`);
        } else {
          // If no tour, navigate to property details page or show a message
          // For now, let's assume we always want to try to show a tour or property details
          // You might want to navigate to a property detail page if no tour is found
          setSnackbar({
            open: true,
            message: 'No hay tours 360° disponibles para esta propiedad.',
            severity: 'info'
          });
          navigate(`/property/${property.id}`); // Fallback to property details
        }
      } catch (error) {
        console.error('Error fetching tours or navigating:', error);
        setSnackbar({
          open: true,
          message: 'Error al cargar el tour o detalles de la propiedad.',
          severity: 'error'
        });
        // Optionally navigate to property details on error too
        navigate(`/property/${property.id}`);
      } finally {
        // Reset navigation state after a delay to allow page transition
        setTimeout(() => setNavigatingToTour(false), 500);
      }
    }, 2600); // Start loading tour data slightly after flyTo animation starts
  };

  // Gestionar el evento de hover sobre marcadores
  const handleMarkerHover = (property) => {
    setPopupInfo(property);
    clearTimeout(window.tooltipHideTimeout);
  };

  const handleMarkerLeave = () => {
    window.tooltipHideTimeout = setTimeout(() => {
      setPopupInfo(null);
    }, 100); // Slightly longer delay to allow moving mouse into popup if desired
  };

  const toggle3DMode = () => {
    setIs3dEnabled(!is3dEnabled);
    setViewState({
      ...viewState,
      pitch: !is3dEnabled ? 45 : 0, // Si activamos 3D, inclinar la vista
      transitionDuration: 1500,
    });
  };

  const resetNorth = () => {
    setViewState({
      ...viewState,
      bearing: 0,
      transitionDuration: 1000,
    });
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
    // Pasar los límites al componente padre si existe onBoundariesUpdate
    if (onBoundariesUpdate) {
      onBoundariesUpdate(boundaries);
    }
    console.log('Boundaries updated:', boundaries);
  };

  const onMapLoad = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      // SIEMPRE habilitar terreno 3D cuando el mapa se carga
      if (map.getTerrain) {
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      }
      
      map.on('error', (e) => {
        console.error('Mapbox GL Error:', e.error ? e.error.message : e);
      });
    }
  };

  // Mantener terreno 3D siempre activado
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map.getTerrain) {
        // SIEMPRE mantener el terreno 3D activado
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      }
    }
  }, [is3dEnabled]); // Mantener la dependencia pero siempre activar

  // Estilos para el twinkle de estrellas en vista de globo
  // Eliminado para remover el fondo de estrellas completamente
  const twinkleKeyframes = ``;

  // Inside the MapView component, add this function to render property boundaries
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

  // NEW: Layer definitions for clusters and points
  const clusterLayer = {
    id: 'clusters',
    type: 'circle',
    source: 'properties-source',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#51bbd6', // Blue, 100 points
        100,
        '#f1f075', // Yellow, 750 points
        750,
        '#f28cb1'  // Pink
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20, // 20px radius for <100 points
        100,
        30, // 30px radius for 100-750 points
        750,
        40  // 40px radius for >750 points
      ]
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
    type: 'circle', // Or symbol if using icons from sprite
    source: 'properties-source',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  };
  
  // NEW: Click handler for map features (clusters or points)
  const onMapClick = useCallback(event => {
    if (navigatingToTour) return;
    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: [unclusteredPointLayer.id, clusterLayer.id] // Check unclustered first
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

  // NEW: Hover handler for unclustered points to show popups
  const onMapMouseMove = useCallback(event => {
    if (mapRef.current) {
      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: [unclusteredPointLayer.id]
      });
      mapRef.current.getCanvas().style.cursor = features && features.length > 0 ? 'pointer' : '';
      if (features && features.length > 0) {
        const feature = features[0];
        // Create a popupInfo object similar to what was used before
        // feature.properties should contain all original property data
        // feature.geometry.coordinates will give [lng, lat]
        setPopupInfo({
          ...feature.properties,
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        });
      } else {
        setPopupInfo(null);
      }
    }
  }, []); // No complex dependencies, safe for useCallback

  const onMapMouseLeave = useCallback(() => {
    if (mapRef.current) {
        mapRef.current.getCanvas().style.cursor = '';
    }
    setPopupInfo(null);
  }, []);

  // Exponer la instancia del mapa para el componente padre
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
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Estilos para animación de estrellas - eliminados */}
      
      {loading && !error && (
        <Box sx={{
          position: 'absolute', // Position over the map
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          // backgroundColor: 'rgba(255, 255, 255, 0.0)', // Make background fully transparent
          zIndex: 5, // Ensure it's above the map but below controls
        }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando propiedades...</Typography>
        </Box>
      )}
      {error && (
        <Box sx={{ p: 3, backgroundColor: '#ffebee', borderRadius: 1, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
          <Typography variant="body2">Asegúrese de que el backend (Django) esté funcionando.</Typography>
        </Box>
      )}
      
      {!loading && !error && (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onLoad={onMapLoad}
          mapStyle={currentMapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
          projection={viewState.zoom < 4 ? "globe" : "mercator"}
          onClick={onMapClick} // NEW: Added map click handler for clusters/points
          interactiveLayerIds={[clusterLayer.id, unclusteredPointLayer.id]} // NEW: Make layers interactive
          onMouseMove={onMapMouseMove} // NEW: Add mouse move handler for popups
          onMouseLeave={onMapMouseLeave} // NEW: Add mouse leave handler for popups
        >
          {/* Fuente de datos de elevación para terreno 3D */}
          <Source
            id="mapbox-dem"
            type="raster-dem"
            url="mapbox://mapbox.mapbox-terrain-dem-v1"
            tileSize={512}
            maxzoom={14}
          />
          
          {/* Control de navegación SIN BRÚJULA */}
          <NavigationControl position="top-right" showCompass={false} />
          
          {/* Control de atribución personalizado (no eliminamos completamente para cumplir con licencia de Mapbox) */}
          <AttributionControl position="bottom-right" compact={true} />
          
          {/* Herramienta de dibujo de límites de propiedad */}
          {isDrawingMode && mapRef.current && (
            <PropertyBoundaryDraw 
              map={mapRef.current.getMap()} 
              onBoundariesUpdate={handleBoundariesUpdate}
              existingBoundaries={propertyBoundaries}
            />
          )}
          
          {/* NEW: GeoJSON Source and Layers for clustered properties */}
          {!editable && propertiesGeoJSON && (
            <Source 
              id="properties-source"
              type="geojson"
              data={propertiesGeoJSON}
              cluster={true}
              clusterMaxZoom={14} // Max zoom to cluster points on
              clusterRadius={50} // Radius of each cluster when clustering points (defaults to 50)
            >
              <Layer {...clusterLayer} />
              <Layer {...clusterCountLayer} />
              <Layer {...unclusteredPointLayer} />
            </Source>
          )}
          
          {/* Controles 3D y orientación */}
          <Box sx={{ 
            position: 'absolute', 
            top: 100, 
            right: 16,
            display: 'flex', 
            flexDirection: 'column',
            gap: 2, // Aumentado el espaciado entre controles
            zIndex: 10
          }}>
            <Paper
              elevation={3}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            >
              <IconButton 
                onClick={() => {
                  // Cambiar entre diferentes ángulos de pitch en lugar de activar/desactivar 3D
                  const newPitch = viewState.pitch >= 45 ? 60 : viewState.pitch <= 0 ? 45 : 0;
                  setViewState({
                    ...viewState,
                    pitch: newPitch,
                    transitionDuration: 1000
                  });
                }}
                sx={{ 
                  color: '#4caf50', // SIEMPRE VERDE porque 3D está siempre activo
                  padding: 1.2
                }}
                title="Ajustar ángulo 3D (0°, 45°, 60°)"
              >
                <View3dIcon />
              </IconButton>
            </Paper>
            
            <Paper
              elevation={3}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            >
              <IconButton 
                onClick={() => {
                  // Ciclar entre ángulos de visión: 0° -> 30° -> 45° -> 60° -> 0°
                  let newPitch;
                  if (viewState.pitch <= 0) newPitch = 30;
                  else if (viewState.pitch <= 30) newPitch = 45;
                  else if (viewState.pitch <= 45) newPitch = 60;
                  else newPitch = 0;
                  
                  setViewState({
                    ...viewState,
                    pitch: newPitch,
                    transitionDuration: 1000
                  });
                }}
                sx={{ 
                  color: 'rgba(0,0,0,0.8)', 
                  padding: 1.2
                }}
                title={`Ángulo actual: ${Math.round(viewState.pitch)}° - Click para cambiar`}
              >
                <TerrainIcon />
              </IconButton>
            </Paper>
            
            <Paper
              elevation={3}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'white',
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            >
              <IconButton 
                onClick={resetNorth}
                sx={{ 
                  color: 'rgba(0,0,0,0.8)',
                  padding: 1.2
                }}
                title="Orientar al norte"
              >
                <NorthIcon />
              </IconButton>
            </Paper>

            {editable && (
              <Paper
                elevation={3}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 1,
                  overflow: 'hidden',
                  backgroundColor: 'white',
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
          </Box>

          {/* Capa para fondo del espacio en vista de globo - DESACTIVADO */}
          {false && viewState.zoom < 5 && (
            <>
              {/* Fondo negro para el espacio */}
              <Source id="stars-background" type="geojson" data={{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0]
                }
              }}>
                <Layer
                  id="sky-layer-custom"
                  type="background"
                  paint={{
                    'background-color': '#000012',
                    'background-opacity': 1
                  }}
                  before="mapbox-dem"
                />
              </Source>

              {/* Estrellas para vista de globo - con más densidad y variedad */}
              <Source
                id="stars-custom"
                type="geojson"
                data={{
                  type: 'FeatureCollection',
                  features: [
                    // Estrellas pequeñas (más numerosas)
                    ...Array.from({ length: 1500 }, () => ({
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [
                          Math.random() * 360 - 180, 
                          Math.random() * 180 - 90
                        ]
                      },
                      properties: {
                        size: Math.random() * 1.5 + 0.5,
                        className: 'twinkle-star'
                      }
                    })),
                    // Estrellas medianas
                    ...Array.from({ length: 300 }, () => ({
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [
                          Math.random() * 360 - 180, 
                          Math.random() * 180 - 90
                        ]
                      },
                      properties: {
                        size: Math.random() * 1 + 2,
                        className: 'twinkle-star'
                      }
                    })),
                    // Estrellas grandes (pocas)
                    ...Array.from({ length: 50 }, () => ({
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [
                          Math.random() * 360 - 180, 
                          Math.random() * 180 - 90
                        ]
                      },
                      properties: {
                        size: Math.random() * 1 + 3,
                        className: 'twinkle-star'
                      }
                    }))
                  ]
                }}
              >
                <Layer
                  id="stars-layer-custom"
                  type="circle"
                  paint={{
                    'circle-radius': ['get', 'size'],
                    'circle-color': '#ffffff',
                    'circle-opacity': 0.85,
                    'circle-blur': 0.4
                  }}
                  before="mapbox-dem"
                />
              </Source>
            </>
          )}

          {popupInfo && (
            <Popup
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              closeButton={false}
              closeOnClick={false}
              onClose={() => setPopupInfo(null)}
              anchor="bottom"
              offset={15} // Adjust offset for circle markers if needed
              maxWidth="300px"
            >
              <Card sx={{ 
                maxWidth: 280, 
                backgroundColor: 'background.paper', 
                border: 'none', 
                boxShadow: 'none'
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

      {/* Notificaciones */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});

export default MapView; 