import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Button, Typography, Stack, Tooltip } from '@mui/material';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import * as turf from '@turf/turf';

const PropertyBoundaryDraw = ({ map, onBoundariesUpdate, existingBoundaries, compact = false }) => {
  const drawRef = useRef(null);
  const [area, setArea] = useState(0);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [hasExistingBoundaries, setHasExistingBoundaries] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const notifyBoundaryChange = useCallback((polygonFeature, options = {}) => {
    if (!polygonFeature || !onBoundariesUpdate) return;

    try {
      const calculatedArea = turf.area(polygonFeature);
      const areaInHectares = calculatedArea / 10000;
      const centerPoint = turf.center(polygonFeature);
      const centerCoords = centerPoint.geometry.coordinates;

      onBoundariesUpdate({
        coordinates: polygonFeature.geometry.coordinates,
        area: areaInHectares,
        areaHa: areaInHectares,
        center: centerCoords,
        geojson: polygonFeature,
        isInitial: Boolean(options.isInitial)
      });
    } catch (error) {
      console.error('PropertyBoundaryDraw: unable to notify boundary change', error);
    }
  }, [onBoundariesUpdate]);

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

    const addExistingBoundary = (feature) => {
      if (!feature) return;
      try {
        const ids = draw.add(feature);
        const featureIds = Array.isArray(ids) ? ids : [ids];
        featureIds.filter(Boolean).forEach((id) => {
          try {
            draw.setFeatureProperty(id, 'mode', 'static');
          } catch (_) {}
        });
        const areaInHectares = turf.area(feature) / 10000;
        setArea(areaInHectares);
        setHasExistingBoundaries(true);
        setHasUnsavedChanges(false);
        notifyBoundaryChange(feature, { isInitial: true });
      } catch (e) {
        console.error('PropertyBoundaryDraw: unable to load existing boundary', e);
      }
    };

    if (existingBoundaries) {
      if (existingBoundaries.type === 'Feature') {
        addExistingBoundary(existingBoundaries);
      } else if (existingBoundaries.coordinates) {
        const polygonFeature = {
          id: existingBoundaries.id || 'existing-boundary',
          type: 'Feature',
          properties: existingBoundaries.properties || {},
          geometry: {
            type: 'Polygon',
            coordinates: existingBoundaries.coordinates
          }
        };
        addExistingBoundary(polygonFeature);
      }
    }

    if (!existingBoundaries) {
      calculateArea();
    }

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
  }, [map, notifyBoundaryChange, calculateArea, existingBoundaries]);

  const calculateArea = useCallback(() => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();

    try {
      if (data && data.features && data.features.length > 0) {
        const polygonFeature = data.features[0];

        if (polygonFeature && polygonFeature.type === 'Feature' &&
            polygonFeature.geometry && polygonFeature.geometry.type === 'Polygon' &&
            polygonFeature.geometry.coordinates && polygonFeature.geometry.coordinates.length > 0 &&
            polygonFeature.geometry.coordinates[0].length > 3) {

          const calculatedArea = turf.area(polygonFeature);
          const areaInHectares = calculatedArea / 10000;
          setArea(areaInHectares);
          setHasExistingBoundaries(true);
          setHasUnsavedChanges(true);

          notifyBoundaryChange(polygonFeature);
        } else {
          setArea(0);
          if (onBoundariesUpdate) {
            const currentFeatures = drawRef.current.getAll();
            if (currentFeatures.features.length === 0) {
                onBoundariesUpdate(null);
                setHasExistingBoundaries(false);
            }
          }
        }
      } else {
        setArea(0);
        setHasExistingBoundaries(false);
        setHasUnsavedChanges(false);
        if (onBoundariesUpdate) {
          onBoundariesUpdate(null);
        }
      }
    } catch (error) {
      console.error("Error in calculateArea with turf:", error, "Data:", data?.features?.[0]);
      setArea(0);
      setHasUnsavedChanges(false);
      if (onBoundariesUpdate) {
        onBoundariesUpdate(null);
      }
    }
  }, [notifyBoundaryChange, onBoundariesUpdate]);

  useEffect(() => {
    if (!map || !drawRef.current) return;
    
    const handleModeChange = (e) => {
        setIsDrawingActive(e.mode === 'draw_polygon' || e.mode === 'direct_select');
    };
    
    const handleDelete = () => {
      setHasUnsavedChanges(false);
      calculateArea();
    };

    map.on('draw.create', calculateArea);
    map.on('draw.update', calculateArea);
    map.on('draw.delete', handleDelete);
    map.on('draw.modechange', handleModeChange);

    return () => {
      if (map && typeof map.getStyle === 'function' && map.getStyle()) {
        map.off('draw.create', calculateArea);
        map.off('draw.update', calculateArea);
        map.off('draw.delete', handleDelete);
        map.off('draw.modechange', handleModeChange);
      }
    };
  }, [map, calculateArea]);

  const handleDeleteAll = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setHasUnsavedChanges(false);
      setHasExistingBoundaries(false);
      setArea(0);
      if (onBoundariesUpdate) {
        onBoundariesUpdate(null);
      }
    }
  };

  const handleStartDrawing = () => {
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
      setIsDrawingActive(true);
      setHasUnsavedChanges(false);
    }
  };

  const handleUndoLastPoint = () => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();
    if (!data.features.length) return;

    const polygon = data.features[0];
    const coordinates = polygon?.geometry?.coordinates?.[0];
    if (!coordinates || coordinates.length <= 4) {
      handleDeleteAll();
      return;
    }

    const updatedCoords = [...coordinates];
    updatedCoords.splice(updatedCoords.length - 2, 1);

    const updatedPolygon = {
      ...polygon,
      geometry: {
        ...polygon.geometry,
        coordinates: [updatedCoords]
      }
    };

    try {
      drawRef.current.delete(polygon.id);
      drawRef.current.add(updatedPolygon);
      drawRef.current.changeMode('direct_select', { featureIds: [updatedPolygon.id] });
      calculateArea();
    } catch (error) {
      console.error('PropertyBoundaryDraw: unable to undo last point', error);
    }
  };

  const handleSave = () => {
    if (drawRef.current && onBoundariesUpdate) {
      const data = drawRef.current.getAll();
      if (data.features.length > 0) {
        const polygon = data.features[0];
        const area = turf.area(polygon);
        const areaInHectares = area / 10000;
        
        const center = turf.center(polygon).geometry.coordinates;
        
        onBoundariesUpdate({
          coordinates: polygon.geometry.coordinates,
          area: areaInHectares,
          center: center,
          geojson: polygon
        });

        // Poner el polígono en modo "static" para que quede visible
        try {
          drawRef.current.setFeatureProperty(polygon.id, 'mode', 'static');
          drawRef.current.changeMode('simple_select');
          setHasUnsavedChanges(false);
        } catch (_) {}
      }
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
      
      <Stack direction="row" spacing={1} sx={{ mt: 2, mb:1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleStartDrawing}
          size={compact ? 'small' : 'small'}
        >
          {hasExistingBoundaries ? 'Modificar' : 'Dibujar'}
        </Button>
        <Tooltip title="Deshacer último punto">
          <span>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<UndoIcon />}
              onClick={handleUndoLastPoint}
              disabled={!hasExistingBoundaries}
              size={compact ? 'small' : 'small'}
            >
              Deshacer
            </Button>
          </span>
        </Tooltip>
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

        <Tooltip title={hasUnsavedChanges ? 'Guarda los cambios del polígono' : 'No hay cambios por guardar'}>
          <span>
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
          </span>
        </Tooltip>
      </Stack>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        {isDrawingActive
          ? 'Haz clic en el mapa para añadir puntos. Doble clic para finalizar.'
          : hasExistingBoundaries
            ? 'Polígono definido. Puedes modificarlo o borrarlo.'
            : 'Haz clic en "Dibujar" para definir los límites.'}
      </Typography>
      {hasUnsavedChanges && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          Tienes cambios sin guardar. Presiona “Guardar” para fijar el polígono.
        </Typography>
      )}
    </Box>
  );
};

export default PropertyBoundaryDraw; 