import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { setAlternateAppIcon } from '../utils/appIcon';

export const useDynamicAppIcon = () => {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !colorScheme) {
      return;
    }

    const iconName = colorScheme === 'dark' ? 'dark' : null;
    void setAlternateAppIcon(iconName);
  }, [colorScheme]);
};
