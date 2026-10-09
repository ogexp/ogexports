import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

const staticConfig = appJson.expo as ExpoConfig;
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
const currentEasConfig = staticConfig.extra?.eas as Record<string, unknown> | undefined;

const config: ExpoConfig = {
  ...staticConfig,
  plugins: [
    ...(staticConfig.plugins ?? []),
    'expo-audio',
  ],
  extra: {
    ...staticConfig.extra,
    ...(easProjectId
      ? { eas: { ...currentEasConfig, projectId: easProjectId } }
      : {}),
  },
};

export default config;
