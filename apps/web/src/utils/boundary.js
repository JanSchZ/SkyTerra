import * as turf from '@turf/turf';

const cloneCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates)) return [];
  return coordinates.map((ring) => (Array.isArray(ring) ? ring.map((point) => [...point]) : []));
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

  const metadata = {
    feature,
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

export { asFeature, normalizeBoundary, buildBoundaryEvent, areBoundaryCoordinatesEqual };
