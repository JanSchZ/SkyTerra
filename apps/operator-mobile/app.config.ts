import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SkyTerra Operators',
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
