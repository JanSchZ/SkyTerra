import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, footer, children }) => {
  return (
    <LinearGradient colors={['#050608', '#0d0f13', '#050608']} style={styles.gradient}>
      <StatusBar style="light" />
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
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
              style={[styles.blob, styles.blobOne]}
            />
            <LinearGradient
              colors={['rgba(148,163,184,0.18)', 'rgba(148,163,184,0)']}
              style={[styles.blob, styles.blobTwo]}
            />
          </View>
          <BlurView intensity={90} tint="dark" style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </BlurView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(15, 17, 23, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: '#E5E7EB',
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
