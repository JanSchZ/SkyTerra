import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

const PropertyBoundaryDraw = forwardRef(({ map, onBoundariesUpdate, existingBoundaries }, ref) => {
  const drawRef = useRef(null);

  useEffect(() => {
    if (!map || map.getSource('mapbox-gl-draw-cold')) { // Evitar añadir múltiples veces
        // Si ya existe una instancia de draw, no hacer nada o limpiarla primero.
        // Esto es una simplificación; una limpieza más robusta podría ser necesaria si el mapa se recrea.
        if (drawRef.current && map.hasControl(drawRef.current)) {
            try {
                map.removeControl(drawRef.current);
            } catch (e) {
                console.warn("Error removing previous draw control:", e);
            }
        }
    }
    
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

    // Solo añadir control si no existe uno ya con ese nombre interno (mapbox-gl-draw-cold)
    // Esta es una heurística, MapboxDraw no ofrece una forma fácil de verificar si ya está añadido.
    let hasDrawControl = false;
    map._controls.forEach(control => {
        if (control instanceof MapboxDraw) {
            hasDrawControl = true;
        }
    });

    if (!hasDrawControl) {
        map.addControl(draw);
    }
    drawRef.current = draw;
    
    // Cargar polígonos existentes
    if (existingBoundaries) {
        // Asegurarse de que existingBoundaries sea un FeatureCollection o una Feature válida
        let featureToAdd = null;
        if (existingBoundaries.type === 'Feature') {
            featureToAdd = existingBoundaries;
        } else if (existingBoundaries.type === 'Polygon') { // Si es solo una geometría
            featureToAdd = { type: 'Feature', geometry: existingBoundaries, properties: {} };
        } else if (existingBoundaries.coordinates) { // Formato antiguo
             featureToAdd = { type: 'Feature', geometry: { type: 'Polygon', coordinates: existingBoundaries.coordinates }, properties: {} };
        }

        if (featureToAdd) {
            const featureId = draw.add(featureToAdd);
            if (featureId && featureId.length > 0) {
                 // Forzar el cálculo inicial si hay geometrías existentes
                 // Esto es importante para que CreateProperty reciba el área inicial
                 setTimeout(() => processAndUpdateBoundaries(draw.get(featureId[0])), 0);
            }
        }
    }


    const handleDrawEvents = (event) => {
      // Se llama en create, update, delete
      // console.log('MapboxDraw event:', event.type, event);
      processAndUpdateBoundaries();
    };

    const handleModeChange = (event) => {
      if (onBoundariesUpdate) {
        onBoundariesUpdate({
          mode: event.mode,
          isDrawingOrEditing: event.mode === 'draw_polygon' || event.mode.includes('select') // direct_select, simple_select
        });
      }
    };

    map.on('draw.create', handleDrawEvents);
    map.on('draw.update', handleDrawEvents);
    map.on('draw.delete', handleDrawEvents);
    map.on('draw.modechange', handleModeChange);
    // map.on('draw.selectionchange', handleDrawEvents); // Puede ser muy ruidoso

    return () => {
      if (map && typeof map.getStyle === 'function' && map.getStyle() && drawRef.current) {
        map.off('draw.create', handleDrawEvents);
        map.off('draw.update', handleDrawEvents);
        map.off('draw.delete', handleDrawEvents);
        map.off('draw.modechange', handleModeChange);
        // map.off('draw.selectionchange', handleDrawEvents);
        
        // Solo remover el control si este mapa específico lo tiene
        if (map.hasControl(drawRef.current)) {
            try {
                map.removeControl(drawRef.current);
            } catch (e) {
                console.warn("Error removing draw control on cleanup:", e);
            }
        }
      }
      drawRef.current = null; // Limpiar la referencia
    };
  }, [map]); // Dependencia solo del mapa para la configuración inicial del control

  // Función interna para procesar y enviar actualizaciones
  const processAndUpdateBoundaries = (specificFeature = null) => {
    if (!drawRef.current || !onBoundariesUpdate) return;

    const data = drawRef.current.getAll();
    let currentPolygonFeature = specificFeature;

    if (!currentPolygonFeature && data && data.features && data.features.length > 0) {
      currentPolygonFeature = data.features[0]; // Asumimos un solo polígono
    }
    
    if (currentPolygonFeature && currentPolygonFeature.geometry && currentPolygonFeature.geometry.type === 'Polygon' && currentPolygonFeature.geometry.coordinates[0] && currentPolygonFeature.geometry.coordinates[0].length > 3) {
      try {
        const calculatedArea = turf.area(currentPolygonFeature);
        const areaInHectares = calculatedArea / 10000;
        const centerPoint = turf.center(currentPolygonFeature);
        const centerCoords = centerPoint.geometry.coordinates;

        onBoundariesUpdate({
          area: areaInHectares,
          center: centerCoords,
          geojsonFeature: currentPolygonFeature, // Enviar la Feature completa
          mode: drawRef.current.getMode(),
          isDrawingOrEditing: drawRef.current.getMode() === 'draw_polygon' || drawRef.current.getMode().includes('select'),
          hasExistingPolygon: true
        });
      } catch (error) {
        console.error("Error in turf calculation:", error, "Feature:", currentPolygonFeature);
        onBoundariesUpdate({ area: 0, geojsonFeature: null, mode: drawRef.current.getMode(), isDrawingOrEditing: false, hasExistingPolygon: false });
      }
    } else {
      // No hay polígono válido o se borró
      onBoundariesUpdate({ area: 0, geojsonFeature: null, mode: drawRef.current.getMode(), isDrawingOrEditing: drawRef.current.getMode() === 'draw_polygon', hasExistingPolygon: false });
    }
  };
  
  // useEffect para recalcular si existingBoundaries cambia DESPUÉS del montaje inicial
  useEffect(() => {
    if (drawRef.current && existingBoundaries) {
        const currentFeatures = drawRef.current.getAll();
        // Simple check: si no hay features y sí hay existingBoundaries, intentar añadirlas.
        // Esto es para casos donde existingBoundaries se carga asíncronamente.
        if (currentFeatures.features.length === 0) {
            let featureToAdd = null;
            if (existingBoundaries.type === 'Feature') {
                featureToAdd = existingBoundaries;
            } else if (existingBoundaries.type === 'Polygon') {
                featureToAdd = { type: 'Feature', geometry: existingBoundaries, properties: {} };
            } else if (existingBoundaries.coordinates) {
                 featureToAdd = { type: 'Feature', geometry: { type: 'Polygon', coordinates: existingBoundaries.coordinates }, properties: {} };
            }
            if (featureToAdd) {
                drawRef.current.deleteAll(); // Limpiar por si acaso
                const fId = drawRef.current.add(featureToAdd);
                if (fId && fId.length > 0) {
                    setTimeout(() => processAndUpdateBoundaries(drawRef.current.get(fId[0])), 0);
                }
            }
        }
    }
  }, [existingBoundaries]);


  useImperativeHandle(ref, () => ({
    startDrawing: () => {
      if (drawRef.current) {
        // Si ya hay un polígono, entra en modo de edición directa. Si no, modo dibujo.
        const features = drawRef.current.getAll().features;
        if (features.length > 0) {
            drawRef.current.changeMode('direct_select', { featureId: features[0].id });
        } else {
            drawRef.current.changeMode('draw_polygon');
        }
      }
    },
    deleteAll: () => {
      if (drawRef.current) {
        drawRef.current.deleteAll();
        // processAndUpdateBoundaries(); // draw.delete event debería encargarse
      }
    },
    getGeoJson: () => {
      if (drawRef.current) {
        const data = drawRef.current.getAll();
        if (data.features.length > 0) {
          return data.features[0]; // Devuelve la primera Feature (asumimos una)
        }
      }
      return null;
    },
    // Podrías añadir más métodos si es necesario, como "cancelar dibujo", etc.
  }));

  return null; // Este componente ya no renderiza UI directamente
});

export default PropertyBoundaryDraw;