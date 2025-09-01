import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import config from '../../config/environment';
import { Box } from '@mui/material';

// Minimal polygon editor based on Mapbox GL Draw example
// Reference: https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-draw/
const BoundaryEditor = forwardRef(({ 
  initialViewState = { longitude: -70.6693, latitude: -33.4489, zoom: 5 },
  height = 560,
  square = true,
  existingFeature = null,
  onChange = () => {},
}, ref) => {
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [areaInfo, setAreaInfo] = useState(null); // { m2, ha }

  useImperativeHandle(ref, () => ({
    resizeMap: () => {
      try { mapRef.current?.getMap()?.resize(); } catch (_) {}
    },
    forceShowControls: () => {
      try {
        const map = mapRef.current?.getMap();
        if (map && drawRef.current) {
          // Re-add if needed and ensure visible
          try { map.removeControl(drawRef.current); } catch (_) {}
          map.addControl(drawRef.current, 'top-left');
        }
        map?.resize();
      } catch (_) {}
    }
  }));

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getMap) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {}, // avoid built-in UI; we use custom buttons to prevent duplication
      defaultMode: 'draw_polygon'
    });
    drawRef.current = draw;
    map.addControl(draw, 'top-left');
    // Nudge layout so controls render immediately
    try { map.resize(); } catch (_) {}
    setTimeout(() => { try { map.resize(); } catch (_) {} }, 120);

    const update = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const feature = data.features[0];
        const areaSqMeters = turf.area(feature);
        const areaHectares = areaSqMeters / 10000;
        const centroid = turf.center(feature).geometry.coordinates;
        const bbox = turf.bbox(feature);
        setAreaInfo({ m2: Math.round(areaSqMeters * 100) / 100, ha: Math.round(areaHectares * 100) / 100 });
        onChange({ feature, centroid, areaSqMeters, areaHectares, bbox });
      } else {
        setAreaInfo(null);
        onChange(null);
      }
    };

    const onCreate = () => {
      // Ensure only one polygon remains
      try {
        const data = draw.getAll();
        if (data.features.length > 1) {
          data.features.slice(1).forEach(f => draw.delete(f.id));
        }
      } catch (_) {}
      update();
    };

    const onUpdate = update;
    const onDelete = update;

    map.on('draw.create', onCreate);
    map.on('draw.update', onUpdate);
    map.on('draw.delete', onDelete);

    // Load existing feature if provided
    if (existingFeature && existingFeature.type === 'Feature') {
      try {
        draw.add(existingFeature);
        // Ensure single feature
        const data = draw.getAll();
        if (data.features.length > 1) {
          data.features.slice(1).forEach(f => draw.delete(f.id));
        }
        update();
      } catch (_) {}
    }

    return () => {
      try {
        map.off('draw.create', onCreate);
        map.off('draw.update', onUpdate);
        map.off('draw.delete', onDelete);
        map.removeControl(draw);
      } catch (_) {}
    };
  }, [existingFeature, onChange]);

  // Force resize after component mount
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    // Immediate resize
    try { map.resize(); } catch (_) {}

    // Resize multiple times in first second
    const interval = setInterval(() => {
      try { map.resize(); } catch (_) {}
    }, 100);

    setTimeout(() => clearInterval(interval), 1000);

    // Re-add controls if not present
    setTimeout(() => {
      if (drawRef.current && !map.hasControl?.(drawRef.current)) {
        map.addControl(drawRef.current, 'top-left');
        try { map.resize(); } catch (_) {}
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Observe container size changes to keep Mapbox in sync (fixes hidden controls until resize)
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || typeof window === 'undefined' || !('ResizeObserver' in window)) return;
    const container = map.getContainer?.();
    if (!container) return;
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch (_) {}
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Map
        ref={mapRef}
        mapStyle={config.mapbox.style}
        mapboxAccessToken={config.mapbox.accessToken}
        initialViewState={initialViewState}
        attributionControl={true}
        onLoad={() => {
          const m = mapRef.current?.getMap?.();
          try { m && m.resize(); } catch (_) {}
          setTimeout(() => { try { m && m.resize(); } catch (_) {} }, 100);
          setTimeout(() => { try { m && m.resize(); } catch (_) {} }, 300);
        }}
        style={{ width: '100%', height: '100%' }}
      />
      {/* Always-visible custom draw controls to avoid Mapbox control timing issues */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          display: 'flex',
          gap: 1,
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 1,
          p: 0.5
        }}
      >
        <button
          type="button"
          onClick={() => {
            try { drawRef.current?.changeMode?.('draw_polygon'); } catch (_) {}
          }}
          title="Dibujar polígono"
          aria-label="Dibujar polígono"
          style={{
            width: 34,
            height: 34,
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 4,
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => {
            try { drawRef.current?.trash?.(); } catch (_) {}
          }}
          title="Eliminar polígono"
          aria-label="Eliminar polígono"
          style={{
            width: 34,
            height: 34,
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 4,
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          🗑
        </button>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 1,
          p: 1,
          minWidth: 160,
          textAlign: 'center',
          fontSize: 13,
          fontFamily: 'Open Sans, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
        }}
      >
        {areaInfo ? (
          <>
            <div><strong>{areaInfo.ha}</strong> ha</div>
            <div style={{ opacity: 0.8 }}>{areaInfo.m2} m²</div>
          </>
        ) : (
          <div>Haz clic para dibujar el polígono.</div>
        )}
      </Box>
    </Box>
  );
});

BoundaryEditor.displayName = 'BoundaryEditor';

export default BoundaryEditor;


