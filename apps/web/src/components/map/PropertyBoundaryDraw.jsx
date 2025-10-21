import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import * as turf from '@turf/turf';

const sanitizePolygonFeature = (feature) => {
  if (!feature || feature.type !== 'Feature' || feature.geometry?.type !== 'Polygon') {
    return null;
  }

  const coordinates = feature.geometry.coordinates?.map((ring) =>
    ring.map((point) => [...point])
  );

  return {
    type: 'Feature',
    properties: { ...(feature.properties || {}) },
    geometry: {
      type: 'Polygon',
      coordinates: coordinates || [],
    },
  };
};

const calculateFeatureMetadata = (feature) => {
  const sanitizedFeature = sanitizePolygonFeature(feature);
  if (!sanitizedFeature) return null;

  try {
    const areaSqMeters = turf.area(sanitizedFeature);
    const areaHa = areaSqMeters / 10000;
    const centroidPoint = turf.center(sanitizedFeature);
    const centroid =
      centroidPoint?.geometry?.coordinates && centroidPoint.geometry.coordinates.length === 2
        ? [...centroidPoint.geometry.coordinates]
        : null;

    return {
      feature: sanitizedFeature,
      areaSqMeters,
      areaHa,
      centroid,
    };
  } catch (error) {
    console.error('PropertyBoundaryDraw: unable to calculate metadata', error, feature);
    return {
      feature: sanitizedFeature,
      areaSqMeters: null,
      areaHa: null,
      centroid: null,
    };
  }
};

const PropertyBoundaryDraw = ({ map, onBoundariesUpdate, existingBoundaries, compact = false }) => {
  const drawRef = useRef(null);
  const [area, setArea] = useState(0);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [hasExistingBoundaries, setHasExistingBoundaries] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const normalizedExistingBoundary = useMemo(
    () => calculateFeatureMetadata(existingBoundaries)?.feature || null,
    [existingBoundaries]
  );

  useEffect(() => {
    if (!map) return;

    // For accurate drawing, force Mercator projection while editing (Mapbox Draw no soporta 'globe')
    let previousProjection = null;
    try {
      previousProjection = map.getProjection ? map.getProjection() : null;
      if (map.setProjection) {
        map.setProjection({ name: 'mercator' });
      }
      // Aplanar la vista para evitar offsets visuales
      try { map.setPitch(0); map.setBearing(0); } catch (_) {}
    } catch (_) {}

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false
      },
      defaultMode: 'simple_select',
      styles: [
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#4caf50',
            'fill-outline-color': '#4caf50',
            'fill-opacity': 0.1
          }
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'fill-color': '#4caf50',
            'fill-outline-color': '#4caf50',
            'fill-opacity': 0.3
          }
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
          paint: {
            'line-color': '#4caf50',
            'line-width': 2
          }
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'line-color': '#81c784',
            'line-width': 3
          }
        },
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#fafafa'
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-inactive',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['!=', 'active', 'true']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#fff',
            'circle-stroke-color': '#4caf50',
            'circle-stroke-width': 2
          }
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': '#4caf50',
            'circle-stroke-width': 3
          }
        },
        // Static (final) polygon stays visible
        {
          id: 'gl-draw-polygon-fill-static',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
          paint: {
            'fill-color': '#2E7D32',
            'fill-opacity': 0.25
          }
        },
        {
          id: 'gl-draw-polygon-stroke-static',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
          paint: {
            'line-color': '#2E7D32',
            'line-width': 2
          }
        }
      ]
    });

    map.addControl(draw);
    drawRef.current = draw;

    if (normalizedExistingBoundary) {
      try {
        const [featureId] = draw.add(normalizedExistingBoundary) || [];
        if (featureId) {
          try {
            draw.setFeatureProperty(featureId, 'mode', 'static');
          } catch (_) {}
        }
        const metadata = calculateFeatureMetadata(normalizedExistingBoundary);
        if (metadata?.areaHa) {
          setArea(metadata.areaHa);
        }
        setHasExistingBoundaries(true);

        try {
          const bbox = turf.bbox(normalizedExistingBoundary);
          if (bbox && bbox.every((value) => Number.isFinite(value))) {
            map.fitBounds(
              [
                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]],
              ],
              { padding: 40, maxZoom: 17 }
            );
          }
        } catch (error) {
          console.warn('PropertyBoundaryDraw: unable to fit bounds for existing polygon', error);
        }
      } catch (error) {
        console.error('PropertyBoundaryDraw: error loading existing boundaries', error);
      }
    }

    setIsReady(true);
    calculateArea();

    return () => {
      if (map && typeof map.getStyle === 'function' && map.getStyle()) {
        map.off('draw.create', calculateArea);
        map.off('draw.update', calculateArea);
        map.off('draw.delete', calculateArea);
        map.off('draw.modechange');
        
        if (drawRef.current && typeof map.hasControl === 'function' && map.hasControl(drawRef.current) && typeof map.removeControl === 'function') {
          try {
            map.removeControl(drawRef.current);
          } catch (e) {
            console.error("Error removing draw control:", e);
          }
        }
        drawRef.current = null;

        // Restaurar proyección original
        try {
          if (previousProjection && map.setProjection) {
            map.setProjection(previousProjection);
          }
        } catch (_) {}
      } else {
        console.warn("PropertyBoundaryDraw: Map not available or style not loaded during cleanup.")
      }
    };
  }, [map, onBoundariesUpdate, existingBoundaries]);

  const calculateArea = () => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();

    try {
      if (data?.features?.length) {
        const polygonFeature = data.features[0];
        const metadata = calculateFeatureMetadata(polygonFeature);

        if (metadata?.feature) {
          setArea(metadata.areaHa || 0);
          setHasExistingBoundaries(true);
          onBoundariesUpdate?.(metadata);
          return;
        }
      }

      setArea(0);
      setHasExistingBoundaries(false);
      onBoundariesUpdate?.({ feature: null, areaSqMeters: null, areaHa: null, centroid: null, removed: true });
    } catch (error) {
      console.error('PropertyBoundaryDraw: error calculating area', error, data?.features?.[0]);
      setArea(0);
      setHasExistingBoundaries(false);
      onBoundariesUpdate?.({ feature: null, areaSqMeters: null, areaHa: null, centroid: null, removed: true });
    }
  };

  useEffect(() => {
    if (!map || !drawRef.current || !isReady) return;

    const handleModeChange = (e) => {
      setIsDrawingActive(e.mode === 'draw_polygon' || e.mode === 'direct_select');
    };

    map.on('draw.create', calculateArea);
    map.on('draw.update', calculateArea);
    map.on('draw.delete', calculateArea);
    map.on('draw.modechange', handleModeChange);

    return () => {
      if (map && typeof map.getStyle === 'function' && map.getStyle()) {
        map.off('draw.create', calculateArea);
        map.off('draw.update', calculateArea);
        map.off('draw.delete', calculateArea);
        map.off('draw.modechange', handleModeChange);
      }
    };
  }, [map, onBoundariesUpdate, isReady]);

  useEffect(() => {
    if (!map || typeof map.doubleClickZoom?.disable !== 'function') return;

    if (isDrawingActive) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    return () => {
      try {
        map.doubleClickZoom.enable();
      } catch (_) {}
    };
  }, [map, isDrawingActive]);

  const handleDeleteAll = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
    }
  };

  const handleStartDrawing = () => {
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
    }
  };

  const handleSave = () => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();
    if (!data?.features?.length) return;

    try {
      const polygon = data.features[0];
      const metadata = calculateFeatureMetadata(polygon);
      if (!metadata?.feature) return;

      onBoundariesUpdate?.(metadata);

      try {
        drawRef.current.setFeatureProperty(polygon.id, 'mode', 'static');
        drawRef.current.changeMode('simple_select');
      } catch (_) {}
    } catch (error) {
      console.error('PropertyBoundaryDraw: error on save', error);
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: compact ? 12 : 32,
        right: compact ? 12 : 16,
        backgroundColor: 'background.paper',
        padding: compact ? 1.25 : 2,
        borderRadius: 1,
        boxShadow: 3,
        zIndex: 5,
        width: compact ? 220 : 250,
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        Límites del Terreno
      </Typography>
      
      <Typography variant="subtitle2" gutterBottom>
        {area > 0
          ? `Área: ${area.toFixed(2)} hectáreas`
          : 'Dibuja el polígono del terreno'}
      </Typography>
      
      <Stack direction="row" spacing={1} sx={{ mt: 2, mb:1 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleStartDrawing}
          size={compact ? 'small' : 'small'}
        >
          {hasExistingBoundaries ? 'Modificar' : 'Dibujar'}
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          startIcon={<DeleteIcon />}
          onClick={handleDeleteAll}
          disabled={!hasExistingBoundaries}
          size={compact ? 'small' : 'small'}
        >
          Borrar
        </Button>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!hasExistingBoundaries}
          size={compact ? 'small' : 'small'}
        >
          Guardar
        </Button>
      </Stack>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        {isDrawingActive 
          ? 'Haz clic en el mapa para añadir puntos. Doble clic para finalizar.'
          : hasExistingBoundaries 
            ? 'Polígono definido. Puedes modificarlo o borrarlo.' 
            : 'Haz clic en "Dibujar" para definir los límites.'}
      </Typography>
    </Box>
  );
};

export default PropertyBoundaryDraw; 