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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Operators',
  slug: 'skyterra-operators',
  version: '1.0.0',
  extra: {
    ...(config.extra ?? {}),
    apiUrl: process.env.API_URL || (config.extra as { apiUrl?: string } | undefined)?.apiUrl || 'https://skyterra.cl',
    eas: {
      projectId: 'f4cad779-aae6-414c-bc47-d568f9d0cfd3',
    },
  },
  plugins: [...(config.plugins ?? []), 'expo-font'],
});
