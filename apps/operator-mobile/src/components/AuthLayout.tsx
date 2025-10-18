import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeColors } from '@theme';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, footer, children }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gradientColors = isDark
    ? ['#050608', '#0d0f13', '#050608']
    : [colors.background, colors.backgroundAlt, colors.background];
  const accentBlob = isDark
    ? ['rgba(148,163,184,0.18)', 'rgba(148,163,184,0)']
    : ['rgba(14, 116, 144, 0.12)', 'rgba(14, 116, 144, 0)'];
  const secondaryBlob = isDark
    ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']
    : ['rgba(2,132,199,0.16)', 'rgba(255,255,255,0)'];

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={gradientColors[0]} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.decorations}>
            <LinearGradient colors={secondaryBlob} style={[styles.blob, styles.blobOne]} />
            <LinearGradient colors={accentBlob} style={[styles.blob, styles.blobTwo]} />
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      gap: 24,
    },
    decorations: {
      ...StyleSheet.absoluteFillObject,
    },
    blob: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 240,
      transform: [{ rotate: '15deg' }],
    },
    blobOne: {
      top: -120,
      right: -80,
    },
    blobTwo: {
      bottom: -90,
      left: -90,
    },
    card: {
      borderRadius: 32,
      padding: 32,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 22 },
      shadowOpacity: 0.18,
      shadowRadius: 38,
      elevation: 10,
      gap: 0,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.heading,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 24,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    body: {
      gap: 16,
    },
    footer: {
      alignItems: 'center',
      gap: 12,
    },
  });

export default AuthLayout;
