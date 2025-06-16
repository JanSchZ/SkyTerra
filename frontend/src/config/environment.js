// Environment configuration for the frontend application
// This file centralizes all environment variables and provides fallbacks

// Estilo personalizado SkyTerra con bordes grises
const skyTerraCustomStyle = {
  version: 8,
  name: "SkyTerra Custom - Gray Borders",
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
        direction: [120, 60], // Ajustar dirección para mejor iluminación del globo
        color: "hsl(30, 70%, 80%)", // Luz un poco más cálida
        intensity: 0.6, // Aumentar intensidad ligeramente
        "cast-shadows": true
      }
    },
    {
      id: "ambient",
      type: "ambient",
      properties: {
        color: "hsl(30, 50%, 90%)", // Luz ambiental más clara
        intensity: 0.8 // Aumentar intensidad
      }
    }
  ],
  terrain: {
    source: "mapbox-dem",
    exaggeration: 1.5
  },
  fog: { // Ajustes para reducir neblina y mejorar visibilidad
    "vertical-range": [0.5, 5], // Rango vertical más ajustado para la niebla baja
    "color": "hsl(210, 30%, 5%)", // Color de niebla base muy oscuro, casi negro azulado
    "high-color": "hsl(210, 40%, 15%)", // Color de niebla en altura, un poco más claro
    "horizon-blend": 0.02, // Reducir significativamente la mezcla con el horizonte para menos "blancura"
    "space-color": "hsl(210, 60%, 3%)", // Espacio muy oscuro
    "star-intensity": // Estrellas más sutiles o visibles según el zoom
      [
        "interpolate",
        ["exponential", 1.2],
        ["zoom"],
        0, // Zoom muy bajo
        0.6, // Intensidad de estrellas moderada
        3, // Zoom medio
        0.2, // Intensidad de estrellas baja
        5, // Zoom alto
        0.05 // Casi sin estrellas
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
        "raster-opacity": 1,
        "raster-saturation": -0.1, // Ligeramente menos saturado
        "raster-contrast": -0.1 // Ligeramente menos contraste para un look más suave
      }
    },
    // Water bodies
    {
      id: "water",
      type: "fill",
      source: "composite",
      "source-layer": "water",
      paint: {
        "fill-color": "hsl(200, 45%, 65%)", // Agua un poco más oscura y menos saturada
        "fill-opacity": 0.6
      }
    },
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
        "line-color": "#a0a0a0", // Un gris más claro para mejor visibilidad sobre satélite oscuro
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
          0.7, // Buena opacidad desde lejos
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
        "line-color": "#707070", // Un gris medio
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
          0.5,
          5,
          0.6
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
        "line-color": "#888888",
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
        "line-opacity": 0.75
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
    // Países
    {
      id: "country-labels",
      type: "symbol",
      source: "composite",
      "source-layer": "place_label",
      minzoom: 0,
      filter: ["==", ["get", "type"], "country"],
      layout: {
        "text-field": ["get", "name_es"],
        "text-font": ["Source Code Pro Bold", "Open Sans Bold", "Arial Unicode MS Bold"],
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
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": "hsla(210, 30%, 10%, 0.6)",
        "text-halo-width": 1
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
        "text-field": ["get", "name"],
        "text-font": ["Source Code Pro Bold", "Open Sans Bold", "Arial Unicode MS Bold"],
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
        "text-color": "hsl(0, 0%, 94%)",
        "text-halo-color": "hsla(210, 30%, 10%, 0.6)",
        "text-halo-width": 1
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
        "text-font": ["Source Code Pro Semibold", "Open Sans Semibold", "Arial Unicode MS Regular"],
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
        "text-color": "hsl(0, 0%, 88%)",
        "text-halo-color": "hsla(210, 30%, 10%, 0.5)",
        "text-halo-width": 0.9
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
        "text-font": ["Source Code Pro Regular", "Open Sans Regular", "Arial Unicode MS Regular"],
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
      "source-layer": "place_label",
      minzoom: 12,
      filter: ["all",
        ["==", ["get", "type"], "village"]
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Source Code Pro Regular", "Open Sans Regular", "Arial Unicode MS Regular"],
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
        "text-color": "hsl(0, 0%, 75%)",
        "text-halo-color": "hsla(210, 30%, 10%, 0.4)",
        "text-halo-width": 0.8
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
        "text-font": ["Source Code Pro Semibold", "Open Sans Semibold", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 16],
        "text-anchor": "top",
        "icon-image": ["concat", ["get", "maki"], "-15"],
        "icon-size": 1,
        "icon-allow-overlap": false,
        "text-offset": [0, 1.1]
      },
      paint: {
        "text-color": "#e0e0e0",
        "text-halo-color": "hsla(210, 30%, 10%, 0.55)",
        "text-halo-width": 1
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
        "text-font": ["Source Code Pro Regular", "Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 17, 13],
        "text-anchor": "top",
        "icon-image": ["concat", ["get", "maki"], "-11"],
        "icon-size": 0.8,
        "icon-allow-overlap": false,
        "text-offset": [0, 1]
      },
      paint: {
        "text-color": "#cccccc",
        "text-halo-color": "hsla(210, 30%, 10%, 0.5)",
        "text-halo-width": 0.8
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

const config = {
  mapbox: {
    // Use environment variable first, fallback to the current token if not set
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiamFuc2NoeiIsImEiOiJjbWF0MHJkbTQwb2I2Mm5xOGRpdml5aGtwIn0.KzH4_qPWMU-GnVP4XSFp0Q',
    // Mapbox style configuration - only dark mode
    style: skyTerraCustomStyle, // Use our custom dark style
  },
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
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
if (!config.mapbox.accessToken || config.mapbox.accessToken === 'your_mapbox_access_token_here') {
  console.warn('⚠️  Mapbox access token not configured properly. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.');
}

// Log configuration in development (without sensitive data)
if (config.development.isDev) {
  console.log('🔧 App Configuration:', {
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