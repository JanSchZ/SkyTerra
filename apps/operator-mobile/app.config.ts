import 'dotenv/config';
import { ExpoConfig, ConfigContext } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SkyTerra Operators',
  slug: 'skyterra-operators',
  version: '0.1.0',
  extra: {
    apiUrl: process.env.API_URL,
  },
});
