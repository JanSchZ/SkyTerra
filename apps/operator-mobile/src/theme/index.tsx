import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const palette = {
  dark: {
    background: '#020617',
    surface: '#0F172A',
    primary: '#38BDF8',
    text: '#F8FAFC',
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    primary: '#0284C7',
    text: '#0F172A',
  },
};

export type Theme = typeof palette.dark;

const ThemeContext = createContext<Theme>(palette.dark);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const value = scheme === 'light' ? palette.light : palette.dark;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
