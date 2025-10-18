import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'skyterra-operator-theme-mode';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceHighlight: string;
  cardBorder: string;
  cardBorderStrong: string;
  cardShadow: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  heading: string;
  primary: string;
  primarySoft: string;
  primaryOn: string;
  success: string;
  warning: string;
  danger: string;
  pillBackground: string;
  pillText: string;
  focusRing: string;
  tabBar: {
    background: string;
    border: string;
    active: string;
    inactive: string;
  };
  map: {
    radiusFill: string;
    radiusStroke: string;
    marker: string;
  };
  statusBarStyle: 'light' | 'dark';
}

const palette: Record<ThemeScheme, ThemeColors> = {
  light: {
    background: '#F8F9FB',
    backgroundAlt: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F3F4F6',
    surfaceHighlight: '#E5E7EB',
    cardBorder: 'rgba(107, 114, 128, 0.28)',
    cardBorderStrong: 'rgba(75, 85, 99, 0.38)',
    cardShadow: 'rgba(15, 23, 42, 0.06)',
    divider: 'rgba(107, 114, 128, 0.25)',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textInverse: '#F9FAFB',
    heading: '#0B0F19',
    primary: '#111827',
    primarySoft: 'rgba(17, 24, 39, 0.08)',
    primaryOn: '#F9FAFB',
    success: '#15803D',
    warning: '#C2410C',
    danger: '#B91C1C',
    pillBackground: 'rgba(229, 231, 235, 0.85)',
    pillText: '#111827',
    focusRing: 'rgba(17, 24, 39, 0.25)',
    tabBar: {
      background: 'rgba(255, 255, 255, 0.9)',
      border: 'rgba(107, 114, 128, 0.25)',
      active: '#111827',
      inactive: '#9CA3AF',
    },
    map: {
      radiusFill: 'rgba(55, 65, 81, 0.12)',
      radiusStroke: 'rgba(17, 24, 39, 0.4)',
      marker: '#111827',
    },
    statusBarStyle: 'dark',
  },
  dark: {
    background: '#050505',
    backgroundAlt: '#0B0B0B',
    surface: 'rgba(18, 18, 18, 0.92)',
    surfaceRaised: 'rgba(23, 23, 23, 0.98)',
    surfaceMuted: 'rgba(31, 31, 31, 0.75)',
    surfaceHighlight: 'rgba(55, 55, 55, 0.6)',
    cardBorder: 'rgba(156, 163, 175, 0.2)',
    cardBorderStrong: 'rgba(209, 213, 219, 0.28)',
    cardShadow: 'rgba(0, 0, 0, 0.65)',
    divider: 'rgba(107, 114, 128, 0.2)',
    textPrimary: '#F5F5F5',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textInverse: '#111827',
    heading: '#F5F5F5',
    primary: '#E5E7EB',
    primarySoft: 'rgba(229, 231, 235, 0.16)',
    primaryOn: '#111827',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    pillBackground: 'rgba(55, 65, 81, 0.9)',
    pillText: '#F9FAFB',
    focusRing: 'rgba(229, 231, 235, 0.22)',
    tabBar: {
      background: 'rgba(17, 17, 17, 0.92)',
      border: 'rgba(75, 85, 99, 0.4)',
      active: '#F5F5F5',
      inactive: 'rgba(156, 163, 175, 0.65)',
    },
    map: {
      radiusFill: 'rgba(229, 231, 235, 0.15)',
      radiusStroke: 'rgba(209, 213, 219, 0.45)',
      marker: '#E5E7EB',
    },
    statusBarStyle: 'light',
  },
};

interface ThemeContextValue {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  scheme: ThemeScheme;
  systemScheme: ThemeScheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: palette.light,
  mode: 'auto',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMode: async (_mode: ThemeMode) => {
    throw new Error('ThemeProvider not initialized');
  },
  isDark: false,
  scheme: 'light',
  systemScheme: 'light',
});

const isValidMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'auto';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme() ?? 'light';
  const normalizedSystem: ThemeScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    const loadStoredMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (isValidMode(stored)) {
          setModeState(stored);
        } else if (stored) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setModeState('auto');
        }
      } catch (err) {
        console.warn('Unable to read stored theme mode', err);
      }
    };
    loadStoredMode();
  }, []);

  const appliedScheme = mode === 'auto' ? normalizedSystem : mode;
  const colors = useMemo(() => palette[appliedScheme], [appliedScheme]);

  const handleSetMode = async (next: ThemeMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.warn('Unable to persist theme mode', err);
    }
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      mode,
      setMode: handleSetMode,
      isDark: appliedScheme === 'dark',
      scheme: appliedScheme,
      systemScheme: normalizedSystem,
    }),
    [appliedScheme, colors, mode, normalizedSystem]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
