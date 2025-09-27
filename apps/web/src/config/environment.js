// Environment configuration for the frontend application
// This file centralizes all environment variables and provides fallbacks

// Estilo personalizado SkyTerra con bordes grises
// Helper: fecha (UTC) para tiles diarios de NASA (usamos "ayer" para mayor disponibilidad)
// Tiles de nubes NASA GIBS: usar fecha (UTC) del día anterior para mayor estabilidad
const oneDayMs = 24 * 60 * 60 * 1000;
const d = new Date(Date.now() - oneDayMs);
const YYYY = d.getUTCFullYear();
const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
const DD = String(d.getUTCDate()).padStart(2, '0');
const GIBS_DATE = `${YYYY}-${MM}-${DD}`;
const skyTerraCustomStyle = {
  version: 8,
  name: "SkyTerra Custom - Daylight Earth",
  metadata: {
    "mapbox:autocomposite": true,
    "mapbox:uiParadigm": "layers",
    "mapbox:sdk-support": {
      "js": "3.11.0",
      "android": "11.12.0",
      "ios": "11.12.0"
    }
  },
  center: [-34, 38], // Center point can be adjusted
  zoom: 1.5, // Zoom inicial para ver el globo completo
  pitch: 60, // Pitch inicial para vista 3D
  bearing: 0, // Orientación inicial
  lights: [
    {
      id: "directional",
      type: "directional",
      properties: {
        // Iluminación más diurna
        direction: [90, 40],
        color: "hsl(40, 90%, 95%)",
        intensity: 0.9,
        "cast-shadows": true
      }
    },
    {
      id: "ambient",
      type: "ambient",
      properties: {
        color: "hsl(40, 70%, 98%)",
        intensity: 0.6
      }
    }
  ],
  terrain: {
    source: "mapbox-dem",
    exaggeration: 1.35
  },
  fog: { // Atmósfera densa y laminar, pegada a la superficie como la real
    "vertical-range": [0.0, 1.9],
    // Tinte azul más denso pero localizado
    "color": "rgba(135, 180, 255, 0.35)",
    "high-color": "rgba(160, 200, 255, 0.25)",
    // Borde más definido y concentrado
    "horizon-blend": 0.01,
    // Espacio negro profundo
    "space-color": "#000005",
    "star-intensity": [
      "interpolate", ["exponential", 1.2], ["zoom"],
      0, 0.6,
      3, 0.5,
      5, 0.35
    ]
  },
  sources: {
    "mapbox-dem": {
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      type: "raster-dem",
      tileSize: 512,
      maxzoom: 14 // Maxzoom para DEM
    },
    composite: {
      url: "mapbox://mapbox.mapbox-streets-v8", // Fuente estándar para límites, carreteras, etc.
      type: "vector"
    },
    "mapbox-satellite": {
      url: "mapbox://mapbox.satellite",
      type: "raster",
      tileSize: 256 // Usar 256 para satélite puede ser más performante
    },
    // Fuente raster de NASA GIBS (VIIRS TrueColor) para overlay de nubes
    "nasa-gibs": {
      type: "raster",
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${GIBS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
      ],
      tileSize: 256,
      maxzoom: 9,
      attribution: "Imagery courtesy of NASA GIBS, NASA EOSDIS"
    }
  },
  sprite: "mapbox://sprites/mapbox/satellite-streets-v12", // Asegúrate que el sprite exista
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  projection: { name: "globe" },
  layers: [
    // Base satellite layer
    {
      id: "satellite",
      type: "raster",
      source: "mapbox-satellite",
      paint: {
        // Ajustes para una vista diurna natural con menos saturación
        "raster-opacity": 1,
        "raster-saturation": -0.25, // Mucho menos saturado para colores naturales
        "raster-contrast": 0.05, // Menos contraste para suavizar
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.92
      }
    },
    // Overlay de nubes NASA GIBS (TrueColor) con opacidad moderada
    {
      id: "nasa-clouds-overlay",
      type: "raster",
      source: "nasa-gibs",
      minzoom: 0,
      maxzoom: 9,
      paint: {
        // Sin ajustes de color para evitar blanqueo del fondo
        "raster-opacity": [
          "interpolate", ["linear"], ["zoom"],
          0, 0.35,
          1.5, 0.30,
          2.5, 0.18,
          3.0, 0.10,
          3.4, 0.04,
          3.6, 0.0
        ],
        "raster-fade-duration": 50
      }
    },
    // Terrain hillshade to add subtle relief and perceived detail over satellite
    {
      id: "terrain-hillshade",
      type: "hillshade",
      source: "mapbox-dem",
      paint: {
        "hillshade-exaggeration": 0.15, // Más sutil
        "hillshade-shadow-color": "hsla(210, 15%, 8%, 0.45)", // Menos saturado
        "hillshade-highlight-color": "hsla(0, 0%, 100%, 0.18)", // Más sutil
        "hillshade-accent-color": "hsla(210, 20%, 12%, 0.35)" // Menos intenso
      }
    },
    // Water bodies (more natural, Google Earth-like)
    {
      id: "water",
      type: "fill",
      source: "composite",
      "source-layer": "water",
      paint: {
        // Tinte más natural y menos saturado
        "fill-color": "hsl(210, 25%, 22%)", // Menos saturado
        "fill-opacity": 0.15, // Más transparente
        "fill-outline-color": "hsl(210, 20%, 18%)" // Menos saturado
      }
    },
    // Light vegetation tint to increase perceived detail without overpowering satellite
    // landcover layers removed (source layer not present in streets v8 at low zoom)
    // Country boundaries in gray - MÁS VISIBLES DESDE LEJOS
    {
      id: "admin-country-boundaries",
      type: "line",
      source: "composite",
      "source-layer": "admin",
      minzoom: 0, // Visibles desde el zoom más bajo
      filter: [
        "all",
        ["==", ["get", "admin_level"], 0],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false] // Filtro para consistencia
      ],
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        // Mejorar contraste de fronteras sin resultar agresivo
        "line-color": "#bdbdbd",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, // En zoom 0 (muy alejado)
          0.8, // Grosor visible
          3, // Zoom intermedio
          1.2,
          5, // Zoom más cercano
          1.5,
          10,
          2
        ],
        "line-opacity": [ // Opacidad también interpolada
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0.8, // Más visibles desde lejos
          3,
          0.8,
          5,
          0.9
        ]
      }
    },
    // State/province boundaries in lighter gray - MÁS SUTILES PERO VISIBLES
    {
      id: "admin-state-boundaries",
      type: "line",
      source: "composite",
      "source-layer": "admin",
      minzoom: 2, // Visibles un poco después que los de países
      filter: [
        "all",
        ["==", ["get", "admin_level"], 1],
        ["==", ["get", "disputed"], "false"], // No mostrar disputados estatales aquí
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false]
      ],
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "#909090",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2, // En minzoom
          0.3,
          5,
          0.6,
          10,
          1
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.6,
          5,
          0.7
        ]
      }
    },
    // Disputed boundaries (dashed) - MÁS OSCURAS
     {
      id: "admin-disputed-boundaries",
      type: "line",
      source: "composite",
      "source-layer": "admin",
      minzoom: 0,
      filter: [
        "all",
        ["==", ["get", "disputed"], "true"],
         ["match", ["get", "worldview"], ["all", "US"], true, false]
      ],
      layout: {
        "line-join": "round"
      },
      paint: {
        "line-color": "#9a9a9a",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0.7,
          5,
          1.2,
          10,
          1.8
        ],
        "line-dasharray": [1.5, 1.5],
        "line-opacity": 0.8
      }
    },
    // Roads (simplificado, solo autopistas principales y visibles más tarde)
    {
      id: "road-major",
      type: "line",
      source: "composite",
      "source-layer": "road",
      minzoom: 7, // Visibles mucho más tarde
      filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk"]]],
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "hsl(0, 0%, 75%)",
        "line-width": [ "interpolate", ["linear"], ["zoom"], 7, 0.5, 12, 1, 16, 3 ],
        "line-opacity": 0.5
      }
    },
    // Países (asegurar visibilidad de etiquetas)
    {
      id: "country-labels",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      minzoom: 0,
      filter: ["==", ["get", "type"], "country"],
      layout: {
        "text-field": ["get", "name_es"],
        "text-font": ["Helvetica Bold", "Helvetica", "Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          0, 10,
          2, 12,
          4, 16,
          6, 20
        ],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.05,
        "text-max-width": 10,
        "text-anchor": "center",
        "icon-image": "dot-11",
        "icon-size": 1,
        "icon-anchor": "bottom",
        "icon-allow-overlap": false
      },
      paint: {
        "text-color": "#f2f2f2",
        "text-halo-color": "rgba(0,0,0,0.6)",
        "text-halo-width": 1.4
      }
    },
    // Ciudades principales (alta jerarquía)
    {
      id: "city-labels-major",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      minzoom: 4,
      filter: ["all",
        ["==", ["get", "type"], "city"],
        ["<=", ["coalesce", ["get", "rank"], ["get", "label_rank"], 999], 4]
      ],
      layout: {
        "text-field": ["coalesce", ["get", "name_es"], ["get", "name"]],
        "text-font": ["Helvetica Bold", "Helvetica", "Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          4, 14,
          6, 20,
          8, 26
        ],
        "text-anchor": "center",
        "icon-image": "dot-11",
        "icon-size": 1.1,
        "icon-anchor": "bottom",
        "icon-allow-overlap": false
      },
      paint: {
        "text-color": "#efefef",
        "text-halo-color": "rgba(0,0,0,0.55)",
        "text-halo-width": 1.15
      }
    },
    // Ciudades secundarias (mediana jerarquía)
    {
      id: "city-labels-medium",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      minzoom: 7,
      filter: ["all",
        ["==", ["get", "type"], "city"],
        [">", ["coalesce", ["get", "rank"], ["get", "label_rank"], 999], 4]
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Helvetica Bold", "Helvetica", "Open Sans Semibold", "Arial Unicode MS Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          7, 10,
          9, 13,
          12, 15
        ],
        "text-anchor": "center",
        "icon-image": "dot-11",
        "icon-size": 0.9,
        "icon-anchor": "bottom",
        "icon-allow-overlap": false
      },
      paint: {
        "text-color": "hsl(0, 0%, 92%)",
        "text-halo-color": "hsla(210, 30%, 8%, 0.55)",
        "text-halo-width": 1
      }
    },
    // Pueblos / comunas
    {
      id: "town-labels",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      minzoom: 10,
      filter: ["all",
        ["==", ["get", "type"], "town"],
        ["<=", ["coalesce", ["get", "rank"], ["get", "label_rank"], 999], 10]
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Helvetica", "Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          10, 9,
          12, 12,
          14, 14
        ],
        "text-anchor": "center",
        "icon-image": "dot-11",
        "icon-size": 0.7,
        "icon-anchor": "bottom",
        "icon-allow-overlap": false
      },
      paint: {
        "text-color": "hsl(0, 0%, 80%)",
        "text-halo-color": "hsla(210, 30%, 10%, 0.45)",
        "text-halo-width": 1
      }
    },
    // Aldeas / villas pequeñas
    {
      id: "village-labels",
      type: "symbol",
      source: "composite",
      "source-layer": "place-label",
      minzoom: 12,
      filter: ["all",
        ["==", ["get", "type"], "village"]
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Helvetica", "Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          12, 8,
          14, 10,
          16, 12
        ],
        "text-anchor": "center",
        "icon-image": "dot-11",
        "icon-size": 0.6,
        "icon-anchor": "bottom",
        "icon-allow-overlap": false
      },
      paint: {
        "text-color": "hsl(0, 0%, 85%)",
        "text-halo-color": "hsla(210, 30%, 8%, 0.5)",
        "text-halo-width": 0.9
      }
    },
    // POIs principales (aeropuertos, hospitales, universidades, parques nacionales)
    {
      id: "poi-major",
      type: "symbol",
      source: "composite",
      "source-layer": "poi_label",
      minzoom: 11,
      filter: ["match", ["get", "class"], ["airport", "hospital", "university", "national_park"], true, false],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Helvetica Bold", "Helvetica", "Open Sans Semibold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 16],
        "text-anchor": "top",
        "icon-image": ["concat", ["get", "maki"], "-15"],
        "icon-size": 1,
        "icon-allow-overlap": false,
        "text-offset": [0, 1.1]
      },
      paint: {
        "text-color": "#efefef",
        "text-halo-color": "hsla(210, 30%, 8%, 0.6)",
        "text-halo-width": 1.1
      }
    },
    {
      id: "poi-minor",
      type: "symbol",
      source: "composite",
      "source-layer": "poi_label",
      minzoom: 14,
      filter: ["match", ["get", "class"], ["airport", "hospital", "university", "national_park"], false, true],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Helvetica", "Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 17, 13],
        "text-anchor": "top",
        "icon-image": ["concat", ["get", "maki"], "-11"],
        "icon-size": 0.8,
        "icon-allow-overlap": false,
        "text-offset": [0, 1]
      },
      paint: {
        "text-color": "#d9d9d9",
        "text-halo-color": "hsla(210, 30%, 8%, 0.55)",
        "text-halo-width": 0.9
      }
    },
    // Nueva capa para carreteras secundarias y primarias
    {
      id: "road-secondary-primary",
      type: "line",
      source: "composite",
      "source-layer": "road",
      minzoom: 9, // Visibles a partir de un zoom más cercano
      filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "street"]]],
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "hsl(0, 0%, 65%)", // Un color ligeramente más claro o diferente que las principales
        "line-width": [ "interpolate", ["linear"], ["zoom"], 
          9, 0.3, 
          12, 0.8, 
          16, 2 
        ],
        "line-opacity": 0.4 // Ligeramente más sutiles que las principales
      }
    }
    // Se han eliminado capas de edificios 2D y carreteras secundarias/terciarias por defecto
    // para priorizar la performance en la vista global y el look minimalista.
    // Se pueden añadir si se necesitan en vistas más cercanas.
  ]
};

// Helper to compute API baseURL in dev to avoid CORS/SSL mixups
const computeApiBaseURL = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL || '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  // In local dev always go through Vite proxy
  if (isLocal) return '/api';
  return envBase || '/api';
};

const config = {
  mapbox: {
    // Do not hardcode tokens; must be provided via environment
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
    // Mapbox style configuration - only dark mode
    style: skyTerraCustomStyle, // Use our custom dark style
  },
  api: {
    baseURL: computeApiBaseURL(),
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'SkyTerra',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  development: {
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  }
};

// Validate critical configuration
if (!config.mapbox.accessToken || typeof config.mapbox.accessToken !== 'string') {
  console.warn('⚠️  Mapbox access token not configured. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.');
}

// Log configuration in development (without sensitive data)
if (config.development.isDev) {
  console.debug('🔧 App Configuration:', {
    app: config.app,
    api: config.api,
    mapbox: {
      hasToken: !!config.mapbox.accessToken,
      tokenPrefix: config.mapbox.accessToken?.substring(0, 10) + '...',
      style: 'SkyTerra Custom Style with Enhanced Visibility & Minimal Fog (Dark Mode Only)',
    },
  });
}

export default config; 