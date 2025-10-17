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
    background: '#F8FAFC',
    backgroundAlt: '#EEF2F7',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    surfaceHighlight: '#E2E8F0',
    cardBorder: 'rgba(148, 163, 184, 0.35)',
    cardBorderStrong: 'rgba(100, 116, 139, 0.45)',
    cardShadow: 'rgba(15, 23, 42, 0.08)',
    divider: 'rgba(148, 163, 184, 0.35)',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textInverse: '#F8FAFC',
    heading: '#0F172A',
    primary: '#0284C7',
    primarySoft: 'rgba(2, 132, 199, 0.12)',
    primaryOn: '#FFFFFF',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
    pillBackground: 'rgba(226, 232, 240, 0.9)',
    pillText: '#0F172A',
    focusRing: 'rgba(2, 132, 199, 0.35)',
    tabBar: {
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(148, 163, 184, 0.3)',
      active: '#0284C7',
      inactive: '#94A3B8',
    },
    map: {
      radiusFill: 'rgba(2, 132, 199, 0.15)',
      radiusStroke: 'rgba(2, 132, 199, 0.55)',
      marker: '#0284C7',
    },
    statusBarStyle: 'dark',
  },
  dark: {
    background: '#020617',
    backgroundAlt: '#0B1220',
    surface: 'rgba(15, 23, 42, 0.92)',
    surfaceRaised: 'rgba(15, 23, 42, 0.98)',
    surfaceMuted: 'rgba(30, 41, 59, 0.7)',
    surfaceHighlight: 'rgba(51, 65, 85, 0.6)',
    cardBorder: 'rgba(148, 163, 184, 0.18)',
    cardBorderStrong: 'rgba(148, 163, 184, 0.28)',
    cardShadow: 'rgba(2, 6, 23, 0.65)',
    divider: 'rgba(148, 163, 184, 0.18)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5F5',
    textMuted: '#94A3B8',
    textInverse: '#0F172A',
    heading: '#F8FAFC',
    primary: '#38BDF8',
    primarySoft: 'rgba(56, 189, 248, 0.18)',
    primaryOn: '#0F172A',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    pillBackground: 'rgba(30, 41, 59, 0.85)',
    pillText: '#F9FAFB',
    focusRing: 'rgba(56, 189, 248, 0.28)',
    tabBar: {
      background: 'rgba(15, 23, 42, 0.92)',
      border: 'rgba(148, 163, 184, 0.26)',
      active: '#F8FAFC',
      inactive: 'rgba(203, 213, 225, 0.65)',
    },
    map: {
      radiusFill: 'rgba(56, 189, 248, 0.18)',
      radiusStroke: 'rgba(148, 163, 184, 0.6)',
      marker: '#38BDF8',
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
