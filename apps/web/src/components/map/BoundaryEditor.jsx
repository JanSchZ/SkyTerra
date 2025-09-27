import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import config from '../../config/environment';
import { Box, Paper, TextField, CircularProgress, List, ListItem, ListItemButton, ListItemText } from '@mui/material';

// Minimal polygon editor based on Mapbox GL Draw example
// Reference: https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-draw/
const BoundaryEditor = forwardRef(({ 
  initialViewState = { longitude: -70.6693, latitude: -33.4489, zoom: 5 },
  height = 560,
  square = true,
  existingFeature = null,
  onChange = () => {},
  overlaySearch = false,
}, ref) => {
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [areaInfo, setAreaInfo] = useState(null); // { m2, ha }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbortRef = useRef(null);
  const projectionRef = useRef(null);

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
    },
    flyTo: (options) => {
      try {
        const map = mapRef.current?.getMap?.();
        if (!map) return;
        const { center, zoom = 13.5, duration = 1200 } = options || {};
        if (Array.isArray(center) && center.length === 2) {
          map.flyTo({ center, zoom, duration, essential: true });
        }
      } catch (_) {}
    }
  }));

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getMap) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    // For accurate drawing, force Mercator projection while editing (Mapbox Draw does not support 'globe')
    try {
      const currentProjection = map.getProjection ? map.getProjection() : null;
      if (currentProjection && currentProjection.name === 'globe') {
        projectionRef.current = currentProjection; // Store original projection
        map.setProjection('mercator');
      }
      map.setPitch(0);
      map.setBearing(0);
    } catch (e) {
      console.warn('Could not set projection for BoundaryEditor:', e);
    }

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {}, // avoid built-in UI; we use custom buttons to prevent duplication
      defaultMode: 'draw_polygon',
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
        // Restore original projection
        if (projectionRef.current && map.setProjection) {
          map.setProjection(projectionRef.current.name);
        }
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

  // Geocoding: search places and fly to selection (Spanish)
  useEffect(() => {
    const q = (searchQuery || '').trim();
    if (!overlaySearch) return; // only when overlaySearch active
    if (q.length < 3) { setSearchResults([]); if (searchAbortRef.current) { try { searchAbortRef.current.abort(); } catch (_) {} } return; }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${config.mapbox.accessToken}&language=es&limit=6`;
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
  }, [searchQuery, overlaySearch]);

  const handleSelectSearchResult = (res) => {
    if (!res || !Array.isArray(res.center) || res.center.length < 2) return;
    const [lon, lat] = res.center;
    const m = mapRef.current?.getMap?.();
    try { m && m.flyTo({ center: [lon, lat], zoom: 13.5, duration: 1200, essential: true }); } catch (_) {}
    setSearchResults([]);
  };

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
      {overlaySearch && (
        <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, width: 'min(720px, 92vw)' }}>
          <Paper elevation={3} sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.94)' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar dirección, ciudad o lugar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="new-password"
              inputProps={{ autoComplete: 'new-password', spellCheck: 'false' }}
              onFocus={(e) => { e.target.setAttribute('autocomplete', 'new-password'); }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!searchQuery.trim()) return;
                  setSearchLoading(true);
                  try {
                    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.trim())}.json?access_token=${config.mapbox.accessToken}&language=es&limit=1`;
                    const resp = await fetch(endpoint);
                    const data = await resp.json();
                    const firstResult = data?.features?.[0];
                    if (firstResult) {
                      // Re-structure to match expected format if needed by handleSelectSearchResult
                      const resultToSelect = {
                        id: firstResult.id,
                        place_name: firstResult.place_name_es || firstResult.place_name,
                        center: firstResult.center
                      };
                      handleSelectSearchResult(resultToSelect);
                    }
                  } catch (err) {
                    console.error('Error on Enter search:', err);
                  } finally {
                    setSearchLoading(false);
                    setSearchResults([]); // Clear any stale results
                  }
                }
              }}
              InputProps={{ endAdornment: searchLoading ? <CircularProgress size={16} /> : null }}
            />
          </Paper>
        </Box>
      )}
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


