import * as turf from '@turf/turf';

const toFeaturePolygon = (boundary) => {
  if (!boundary) return null;

  if (boundary.type === 'Feature' && boundary.geometry?.type === 'Polygon') {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: boundary.geometry,
    };
  }

  if (boundary.type === 'Polygon' && boundary.coordinates) {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: {
        type: 'Polygon',
        coordinates: boundary.coordinates,
      },
    };
  }

  if (boundary.geometry?.type === 'Polygon') {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: boundary.geometry,
    };
  }

  if (boundary.coordinates) {
    return {
      type: 'Feature',
      properties: boundary.properties || {},
      geometry: {
        type: 'Polygon',
        coordinates: boundary.coordinates,
      },
    };
  }

  if (Array.isArray(boundary)) {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: boundary,
      },
    };
  }

  return null;
};

const safeCentroidCoordinates = (feature) => {
  try {
    return turf.center(feature)?.geometry?.coordinates ?? null;
  } catch {
    return null;
  }
};

const safeAreaInSquareMeters = (feature) => {
  try {
    return turf.area(feature);
  } catch {
    return null;
  }
};

const normalizeBoundary = (boundary) => {
  if (!boundary) return null;

  const feature = toFeaturePolygon(boundary);
  if (!feature?.geometry?.coordinates) return null;

  const normalized = {
    ...(boundary && typeof boundary === 'object' && !Array.isArray(boundary) ? boundary : {}),
    type: 'Feature',
    geojson: feature,
    feature,
    coordinates: feature.geometry.coordinates,
  };

  if (!normalized.center) {
    const centroid = safeCentroidCoordinates(feature);
    if (Array.isArray(centroid)) {
      normalized.center = centroid;
    }
  }

  if (normalized.center && Array.isArray(normalized.center) && normalized.center.length === 2) {
    normalized.longitude = normalized.center[0];
    normalized.latitude = normalized.center[1];
  }

  if (normalized.area == null) {
    const areaSqMeters = safeAreaInSquareMeters(feature);
    if (Number.isFinite(areaSqMeters)) {
      normalized.area = areaSqMeters / 10000;
    }
  }

  return normalized;
};

const calculateAreaHectares = (boundary) => {
  const feature = boundary?.geojson || boundary?.feature || toFeaturePolygon(boundary);
  if (!feature) return null;

  const areaSqMeters = safeAreaInSquareMeters(feature);
  if (!Number.isFinite(areaSqMeters)) return null;
  return areaSqMeters / 10000;
};

export { toFeaturePolygon, normalizeBoundary, calculateAreaHectares };
