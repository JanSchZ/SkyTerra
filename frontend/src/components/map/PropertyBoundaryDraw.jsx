import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import PolylineIcon from '@mui/icons-material/Polyline';
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

  useEffect(() => {
    if (!map) return;

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
        }
      ]
    });

    map.addControl(draw);
    drawRef.current = draw;

    if (existingBoundaries && existingBoundaries.type === 'Feature' && existingBoundaries.geometry && existingBoundaries.geometry.type === 'Polygon') {
      draw.add(existingBoundaries);
      try {
        const existingArea = turf.area(existingBoundaries);
        const areaInHectares = existingArea / 10000;
        setArea(areaInHectares);
        setHasExistingBoundaries(true);
      } catch (e) {
        console.error("Error calculating area for existing boundaries:", e);
      }
    } else if (existingBoundaries && existingBoundaries.coordinates) {
      const polygonFeature = {
        id: 'existing-boundary',
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: existingBoundaries.coordinates
        }
      };
      draw.add(polygonFeature);
      try {
        const existingArea = turf.area(polygonFeature);
        const areaInHectares = existingArea / 10000;
        setArea(areaInHectares);
        setHasExistingBoundaries(true);
      } catch(e) {
        console.error("Error calculating area for legacy existing boundaries:", e);
      }
    }

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
      } else {
        console.warn("PropertyBoundaryDraw: Map not available or style not loaded during cleanup.")
      }
    };
  }, [map, onBoundariesUpdate, existingBoundaries]);

  const calculateArea = () => {
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

          const centerPoint = turf.center(polygonFeature);
          const centerCoords = centerPoint.geometry.coordinates;

          if (onBoundariesUpdate) {
            onBoundariesUpdate({
              coordinates: polygonFeature.geometry.coordinates,
              area: areaInHectares,
              center: centerCoords,
              geojson: polygonFeature
            });
          }
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
        if (onBoundariesUpdate) {
          onBoundariesUpdate(null);
        }
      }
    } catch (error) {
      console.error("Error in calculateArea with turf:", error, "Data:", data?.features?.[0]);
      setArea(0);
      if (onBoundariesUpdate) {
        onBoundariesUpdate(null);
      }
    }
  };

  useEffect(() => {
    if (!map || !drawRef.current) return;
    
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
  }, [map, onBoundariesUpdate]);

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