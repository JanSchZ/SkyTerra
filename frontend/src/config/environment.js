// Environment configuration for the frontend application
// This file centralizes all environment variables and provides fallbacks

const config = {
  mapbox: {
    // Use environment variable first, fallback to the current token if not set
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiamFuc2NoeiIsImEiOiJjbWF0MHJkbTQwb2I2Mm5xOGRpdml5aGtwIn0.KzH4_qPWMU-GnVP4XSFp0Q',
    // Mapbox style configurations
    styles: {
      light: 'mapbox://styles/mapbox/outdoors-v12',
      dark: 'mapbox://styles/mapbox/satellite-streets-v12',
    },
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
      styles: config.mapbox.styles,
    },
  });
}

export default config; 