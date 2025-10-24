import * as turf from '@turf/turf';

const cloneCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) return [];
  return coordinates.map((ring) => (Array.isArray(ring) ? ring.map((point) => [...point]) : []));
};

const parseMaybeJSON = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// Safe parsing function for boundary data that handles various formats and validates structure
const safeParseBoundary = (value) => {
  if (!value) return null;

  try {
    // If it's already a string, try to parse it as JSON
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') {
        console.warn('Invalid boundary JSON structure:', parsed);
        return null;
      }
      return parsed;
    }

    // If it's already an object, validate basic structure
    if (typeof value === 'object') {
      // Check if it has the basic structure of a GeoJSON feature or geometry
      if (value.type && (value.coordinates || value.geometry)) {
        return value;
      }

      // If it doesn't have the expected structure, it might be malformed
      console.warn('Boundary object missing required structure:', value);
      return null;
    }

    return null;
  } catch (error) {
    console.warn('Error parsing boundary data:', error, 'Input:', value);
    return null;
  }
};

const normalizePolygonRings = (feature) => {
  if (!feature?.geometry || feature.geometry.type !== 'Polygon') {
    return feature;
  }

  const normalizedCoordinates = (feature.geometry.coordinates || []).map((ring) => {
    if (!Array.isArray(ring) || ring.length === 0) {
      return [];
    }

    const normalizedRing = ring.map((point) => (Array.isArray(point) ? [...point] : []));
    const first = normalizedRing[0];
    const last = normalizedRing[normalizedRing.length - 1];

    if (
      !Array.isArray(first) ||
      first.length < 2 ||
      !Array.isArray(last) ||
      last.length < 2 ||
      (first[0] === last[0] && first[1] === last[1])
    ) {
      return normalizedRing;
    }

    return [...normalizedRing, [...first]];
  });

  return {
    type: 'Feature',
    properties: { ...(feature.properties || {}) },
    geometry: {
      type: 'Polygon',
      coordinates: normalizedCoordinates,
    },
  };
};

const asFeature = (boundary) => {
  if (!boundary) return null;

  if (boundary.type === 'Feature' && boundary.geometry?.type === 'Polygon') {
    return {
      type: 'Feature',
      properties: { ...(boundary.properties || {}) },
      geometry: {
        type: 'Polygon',
        coordinates: cloneCoordinates(boundary.geometry.coordinates || []),
      },
    };
  }

  if (boundary.geojson) {
    return asFeature(boundary.geojson);
  }

  if (boundary.feature) {
    return asFeature(boundary.feature);
  }

  if (boundary.geometry?.type === 'Polygon' && Array.isArray(boundary.geometry.coordinates)) {
    return asFeature({
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: boundary.geometry,
    });
  }

  if (Array.isArray(boundary.coordinates)) {
    return {
      type: 'Feature',
      properties: { ...(boundary.properties || {}) },
      geometry: {
        type: 'Polygon',
        coordinates: cloneCoordinates(boundary.coordinates),
      },
    };
  }

  if (Array.isArray(boundary)) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: cloneCoordinates(boundary),
      },
    };
  }

  return null;
};

const ensureFeature = (candidate) => {
  // Use safeParseBoundary for better error handling and validation
  const parsed = safeParseBoundary(candidate) || parseMaybeJSON(candidate);
  const feature = asFeature(parsed ?? candidate);
  if (!feature) return null;
  if (feature.geometry?.type === 'Polygon') {
    return normalizePolygonRings(feature);
  }
  return feature;
};

const toFeaturePolygon = (boundary) => {
  if (!boundary) return null;

  const directFeature = ensureFeature(boundary);
  if (directFeature) return directFeature;

  if (boundary.type === 'FeatureCollection' && Array.isArray(boundary.features)) {
    for (const featureCandidate of boundary.features) {
      const feature = ensureFeature(featureCandidate);
      if (feature) return feature;
    }
  }

  if (boundary.geojson) {
    const feature = ensureFeature(boundary.geojson);
    if (feature) return feature;
  }

  if (boundary.feature) {
    const feature = ensureFeature(boundary.feature);
    if (feature) return feature;
  }

  if (Array.isArray(boundary.coordinates)) {
    return ensureFeature({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: boundary.coordinates },
    });
  }

  if (Array.isArray(boundary)) {
    return ensureFeature({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: boundary },
    });
  }

  return null;
};

const calculateMetrics = (feature) => {
  const metrics = {
    areaSqMeters: null,
    areaHa: null,
    center: null,
    bounds: null,
  };

  try {
    metrics.areaSqMeters = turf.area(feature);
    if (Number.isFinite(metrics.areaSqMeters)) {
      metrics.areaHa = metrics.areaSqMeters / 10000;
    }
  } catch {
    metrics.areaSqMeters = null;
  }

  try {
    const centroid = turf.center(feature)?.geometry?.coordinates;
    if (Array.isArray(centroid) && centroid.length === 2) {
      metrics.center = [...centroid];
    }
  } catch {
    metrics.center = null;
  }

  try {
    const bbox = turf.bbox(feature);
    if (Array.isArray(bbox) && bbox.length === 4 && bbox.every((value) => Number.isFinite(value))) {
      metrics.bounds = [...bbox];
    }
  } catch {
    metrics.bounds = null;
  }

  return metrics;
};

const normalizeBoundary = (boundary, overrides = {}) => {
  const feature = asFeature(boundary);
  if (!feature?.geometry?.coordinates?.length) return null;

  // Generate unique ID based on coordinates and properties
  const coordsString = JSON.stringify(feature.geometry.coordinates);
  const propsString = JSON.stringify(feature.properties || {});
  const uniqueId = btoa(coordsString + propsString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

  const metadata = {
    id: uniqueId,
    feature: {
      ...feature,
      properties: {
        ...feature.properties,
        animationProgress: 1 // Default to fully visible
      }
    },
    geojson: feature,
    coordinates: cloneCoordinates(feature.geometry.coordinates || []),
    ...calculateMetrics(feature),
  };

  const centerOverride = overrides.center ?? boundary?.center ?? boundary?.centroid;
  if (Array.isArray(centerOverride) && centerOverride.length === 2) {
    metadata.center = [...centerOverride];
  }

  if (Number.isFinite(overrides.areaHa)) {
    metadata.areaHa = overrides.areaHa;
  } else if (Number.isFinite(boundary?.areaHa)) {
    metadata.areaHa = boundary.areaHa;
  } else if (Number.isFinite(boundary?.area)) {
    metadata.areaHa = boundary.area;
  }

  if (!metadata.bounds && Array.isArray(overrides.bounds) && overrides.bounds.length === 4) {
    metadata.bounds = [...overrides.bounds];
  } else if (!metadata.bounds && Array.isArray(boundary?.bounds) && boundary.bounds.length === 4) {
    metadata.bounds = [...boundary.bounds];
  }

  if (boundary?.id) {
    metadata.id = boundary.id;
  }

  if (metadata.center && metadata.center.length === 2) {
    const [lng, lat] = metadata.center;
    if (Number.isFinite(lng)) metadata.longitude = lng;
    if (Number.isFinite(lat)) metadata.latitude = lat;
  }

  return metadata;
};

const buildBoundaryEvent = (boundary, type = 'update', overrides = {}) => {
  if (type === 'clear') {
    return { type: 'clear', feature: null, geojson: null, removed: true };
  }

  const metadata = normalizeBoundary(boundary, overrides);
  if (!metadata) {
    return { type: 'clear', feature: null, geojson: null, removed: true };
  }

  return {
    ...metadata,
    type,
    removed: false,
  };
};

const areBoundaryCoordinatesEqual = (first, second) => {
  const featureA = asFeature(first);
  const featureB = asFeature(second);

  if (!featureA && !featureB) return true;
  if (!featureA || !featureB) return false;

  try {
    const coordsA = featureA.geometry?.coordinates ?? [];
    const coordsB = featureB.geometry?.coordinates ?? [];
    return JSON.stringify(coordsA) === JSON.stringify(coordsB);
  } catch {
    return false;
  }
};

export { asFeature, toFeaturePolygon, normalizeBoundary, buildBoundaryEvent, areBoundaryCoordinatesEqual, safeParseBoundary };
