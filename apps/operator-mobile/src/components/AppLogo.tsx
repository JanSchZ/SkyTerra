import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useTheme } from '@theme';

import logoWhite from '../../assets/Logo_skyterra_blanco.png';
import logoBlack from '../../assets/Logo_Skyterra_negro.png';

const AppLogo: React.FC<{ width?: number; height?: number }> = ({ width = 160, height = 40 }) => {
  const { isDark } = useTheme();
  const source = isDark ? logoWhite : logoBlack;

  return <Image source={source} style={[styles.image, { width, height }]} resizeMode="contain" />;
};

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});

export default AppLogo;

