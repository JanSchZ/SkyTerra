import { NativeModules, Platform } from 'react-native';

type AlternateIconName = 'dark' | null | undefined;

type NativeAppIconManager = {
  setAlternateIcon: (iconName: AlternateIconName) => Promise<boolean>;
};

const nativeModule = NativeModules.AppIconManager as NativeAppIconManager | undefined;

export const setAlternateAppIcon = async (iconName: AlternateIconName) => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  if (!nativeModule || typeof nativeModule.setAlternateIcon !== 'function') {
    return false;
  }

  try {
    return await nativeModule.setAlternateIcon(iconName ?? null);
  } catch (error) {
    console.warn('Failed to update app icon', error);
    return false;
  }
};
