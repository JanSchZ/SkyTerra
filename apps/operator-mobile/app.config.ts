import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { ExpoConfig, ConfigContext } from '@expo/config';

const resolveEnvFile = () => {
  const explicitEnv =
    process.env.APP_ENV ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'development');

  const candidates = [
    `.env.${explicitEnv}`,
    explicitEnv === 'production' ? '.env.production' : '.env.development',
    '.env',
  ];

  for (const candidate of candidates) {
    const fullPath = path.resolve(__dirname, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
};

const envFilePath = resolveEnvFile();
if (envFilePath) {
  loadEnv({ path: envFilePath, override: true });
}

const loadGoogleMapsApiKey = (): string | null => {
  const envValue = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (envValue) {
    return envValue;
  }

  const candidates = [
    path.resolve(__dirname, 'google-maps.properties'),
    path.resolve(__dirname, 'android', 'gradle.properties.local'),
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const contents = fs.readFileSync(candidate, 'utf-8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split('=');
      if (key === 'GOOGLE_MAPS_API_KEY') {
        const value = valueParts.join('=').trim();
        if (value) {
          process.env.GOOGLE_MAPS_API_KEY = value;
          return value;
        }
      }
    }
  }

  return null;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = loadGoogleMapsApiKey();

  if (!googleMapsApiKey && process.env.APP_ENV === 'production') {
    throw new Error(
      'Falta la API key de Google Maps. Crea apps/operator-mobile/google-maps.properties con GOOGLE_MAPS_API_KEY=tu_clave (pídesela a Jan).'
    );
  }

  const androidConfig: ExpoConfig['android'] = {
    ...(config.android ?? {}),
  };

  if (googleMapsApiKey) {
    androidConfig.config = {
      ...(config.android?.config ?? {}),
      googleMaps: { apiKey: googleMapsApiKey },
    };
  }

  return {
    ...config,
    name: 'Operators',
    slug: 'skyterra-operators',
    version: '1.0.0',
    android: androidConfig,
    extra: {
      ...(config.extra ?? {}),
      apiUrl:
        process.env.API_URL || (config.extra as { apiUrl?: string } | undefined)?.apiUrl || 'https://skyterra.cl',
      googleMapsApiKeySet: Boolean(googleMapsApiKey),
      eas: {
        projectId: 'f4cad779-aae6-414c-bc47-d568f9d0cfd3',
      },
    },
    plugins: [...(config.plugins ?? []), 'expo-font'],
  };
};
