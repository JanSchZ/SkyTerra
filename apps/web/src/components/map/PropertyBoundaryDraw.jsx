import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import { buildBoundaryEvent, normalizeBoundary } from '../../utils/boundary.js';

const PropertyBoundaryDraw = ({ map, onBoundariesUpdate, existingBoundaries, compact = false }) => {
  const drawRef = useRef(null);
  const [area, setArea] = useState(0);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [hasExistingBoundaries, setHasExistingBoundaries] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const emitBoundaryUpdate = useCallback(
    (payload) => {
      if (onBoundariesUpdate) {
        onBoundariesUpdate(payload);
      }
    },
    [onBoundariesUpdate]
  );

  const updateFromDraw = useCallback(
    (type = 'update') => {
      if (!drawRef.current) return;
      const data = drawRef.current.getAll();
      const polygon = data.features?.[0];

      if (polygon) {
        const payload = buildBoundaryEvent(polygon, type);
        setArea(payload.areaHa || 0);
        setHasExistingBoundaries(true);
        setHasUnsavedChanges(type !== 'initial');
        emitBoundaryUpdate(payload);
      } else {
        setArea(0);
        setHasExistingBoundaries(false);
        setHasUnsavedChanges(type !== 'initial');
        emitBoundaryUpdate(buildBoundaryEvent(null, 'clear'));
      }
    },
    [emitBoundaryUpdate]
  );

  const handleDrawDelete = useCallback(() => updateFromDraw('clear'), [updateFromDraw]);

  useEffect(() => {
    if (!map) return;

    let previousProjection = null;
    try {
      previousProjection = map.getProjection ? map.getProjection() : null;
      if (map.setProjection) {
        map.setProjection({ name: 'mercator' });
      }
      try {
        map.setPitch(0);
        map.setBearing(0);
      } catch {
        /* no-op */
      }
    } catch {
      /* no-op */
    }

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false,
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
            'fill-opacity': 0.1,
          },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'fill-color': '#4caf50',
            'fill-outline-color': '#4caf50',
            'fill-opacity': 0.3,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'active', 'true']],
          paint: {
            'line-color': '#4caf50',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'active', 'true']],
          paint: {
            'line-color': '#81c784',
            'line-width': 3,
          },
        },
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#fafafa',
          },
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-inactive',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['!=', 'active', 'true']],
          paint: {
            'circle-radius': 5,
            'circle-color': '#fff',
            'circle-stroke-color': '#4caf50',
            'circle-stroke-width': 2,
          },
        },
        {
          id: 'gl-draw-polygon-and-line-vertex-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', 'active', 'true']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': '#4caf50',
            'circle-stroke-width': 3,
          },
        },
        {
          id: 'gl-draw-polygon-fill-static',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
          paint: {
            'fill-color': '#2E7D32',
            'fill-opacity': 0.25,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-static',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
          paint: {
            'line-color': '#2E7D32',
            'line-width': 2,
          },
        },
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    const normalizedExisting = normalizeBoundary(existingBoundaries);
    if (normalizedExisting?.feature) {
      try {
        draw.add(normalizedExisting.feature);
        setArea(normalizedExisting.areaHa || 0);
        setHasExistingBoundaries(true);
        setHasUnsavedChanges(false);
        emitBoundaryUpdate({
          ...normalizedExisting,
          type: 'initial',
          removed: false,
        });
      } catch (error) {
        console.error('PropertyBoundaryDraw: unable to bootstrap existing boundary', error);
      }
    } else {
      emitBoundaryUpdate(buildBoundaryEvent(null, 'clear'));
      setArea(0);
      setHasExistingBoundaries(false);
      setHasUnsavedChanges(false);
    }

    const handleModeChange = (event) => {
      setIsDrawingActive(event.mode === 'draw_polygon' || event.mode === 'direct_select');
    };

    map.on('draw.create', updateFromDraw);
    map.on('draw.update', updateFromDraw);
    map.on('draw.delete', handleDrawDelete);
    map.on('draw.modechange', handleModeChange);

    return () => {
      if (map && typeof map.getStyle === 'function' && map.getStyle()) {
        map.off('draw.create', updateFromDraw);
        map.off('draw.update', updateFromDraw);
        map.off('draw.delete', handleDrawDelete);
        map.off('draw.modechange', handleModeChange);

        if (drawRef.current && map.hasControl?.(drawRef.current) && typeof map.removeControl === 'function') {
          try {
            map.removeControl(drawRef.current);
          } catch (error) {
            console.error('PropertyBoundaryDraw: unable to remove draw control', error);
          }
        }
        drawRef.current = null;

        try {
          if (previousProjection && map.setProjection) {
            map.setProjection(previousProjection);
          }
        } catch {
          /* no-op */
        }
      }
    };
  }, [map, existingBoundaries, emitBoundaryUpdate, updateFromDraw, handleDrawDelete]);

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
      } catch {
        /* no-op */
      }
    };
  }, [map, isDrawingActive]);

  const handleDeleteAll = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      handleDrawDelete();
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

    const polygon = data.features[0];
    updateFromDraw('update');

    try {
      drawRef.current.setFeatureProperty(polygon.id, 'mode', 'static');
      drawRef.current.changeMode('simple_select');
    } catch {
      /* no-op */
    }
  };

  const handleUndoLastPoint = () => {
    if (!drawRef.current) return;
    const data = drawRef.current.getAll();
    if (!data?.features?.length) return;

    const polygon = data.features[0];
    const coordinates = polygon.geometry?.coordinates?.[0];
    if (!Array.isArray(coordinates) || coordinates.length <= 4) {
      handleDeleteAll();
      return;
    }

    const updatedCoords = coordinates.slice(0, -2);
    updatedCoords.push(coordinates[0]);

    const updatedPolygon = {
      ...polygon,
      geometry: {
        ...polygon.geometry,
        coordinates: [updatedCoords],
      },
    };

    try {
      drawRef.current.delete(polygon.id);
      const added = drawRef.current.add(updatedPolygon);
      const [featureId] = Array.isArray(added) ? added : [added];
      if (featureId) {
        drawRef.current.changeMode('direct_select', { featureIds: [featureId] });
      }
      updateFromDraw('update');
    } catch (error) {
      console.error('PropertyBoundaryDraw: unable to undo last point', error);
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
        {area > 0 ? `Área: ${area.toFixed(2)} hectáreas` : 'Dibuja el polígono del terreno'}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 1, flexWrap: 'wrap' }}>
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

        <Tooltip title={hasUnsavedChanges ? 'Guarda la forma actual del polígono' : 'No hay cambios por guardar'}>
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
          Tienes cambios sin guardar dentro del mapa. Presiona “Guardar” para fijar el polígono.
        </Typography>
      )}
    </Box>
  );
};

export default PropertyBoundaryDraw;
