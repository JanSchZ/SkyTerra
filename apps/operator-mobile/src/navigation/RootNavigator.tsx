import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import SignInScreen from '@screens/SignInScreen';
import SignUpScreen from '@screens/SignUpScreen';
import JobDetailScreen from '@screens/JobDetailScreen';
import GuideScreen from '@screens/GuideScreen';
import MainTabsNavigator from './MainTabsNavigator';
import { useAuth } from '@context/AuthContext';
import { useTheme, ThemeColors } from '@theme';
import { StatusBar } from 'expo-status-bar';

export type RootStackParamList = {
  SignIn: { email?: string } | undefined;
  SignUp: undefined;
  MainTabs: undefined;
  JobDetail: { jobId: string };
  Guide: { guideId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, initializing } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusBarStyle = colors.statusBarStyle;

  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        ...NavigationDefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.cardBorder,
        notification: colors.primary,
      },
    }),
    [colors, isDark]
  );

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparando tu sesión…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      gap: 16,
    },
    loadingText: {
      color: colors.textMuted,
    },
  });
