import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@navigation/RootNavigator';
import { MainTabParamList } from '@navigation/MainTabsNavigator';
import { useTheme, ThemeColors } from '@theme';

type ResourcesNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Resources'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const resources = [
  {
    id: 'preflight',
    title: 'Checklist de pre-vuelo',
    description: 'Guía rápida para revisar clima, perímetro y permisos antes de despegar.',
    icon: 'checkbox-outline' as const,
  },
  {
    id: 'shooting',
    title: 'Instructivo de grabación',
    description: 'Ajustes de cámara, modos de dron y flujo de captura para foto y video.',
    icon: 'camera-outline' as const,
  },
  {
    id: 'safety',
    title: 'Protocolos de seguridad',
    description: 'Actualizaciones sobre normativa DGAC, zonas restringidas y contactos de emergencia.',
    icon: 'shield-checkmark-outline' as const,
  },
  {
    id: 'billing',
    title: 'Facturación y pagos',
    description: 'Pasos para cargar boletas, plazos de pago y resolución de incidencias.',
    icon: 'document-text-outline' as const,
  },
];

const ResourcesScreen = () => {
  const navigation = useNavigation<ResourcesNavigation>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0b0d11'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );

  const handleOpenGuide = (id: string) => {
    navigation.navigate('Guide', { guideId: id });
  };

  return (
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Centro de recursos</Text>
            <Text style={styles.subtitle}>
              Material de apoyo, estándares visuales y guías operativas para tus misiones.
            </Text>
          </View>

          <View style={styles.callout}>
            <View style={styles.calloutIcon}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primaryOn} />
            </View>
            <View style={styles.calloutText}>
              <Text style={styles.calloutTitle}>Entrega tu material</Text>
              <Text style={styles.calloutSubtitle}>
                Sube fotografías, videos y archivos ZIP directo desde el detalle del trabajo en curso.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guías operativas</Text>
            {resources.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => handleOpenGuide(item.id)}>
                <View style={styles.resourceCard}>
                  <View style={styles.resourceIcon}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={styles.resourceText}>
                    <Text style={styles.resourceTitle}>{item.title}</Text>
                    <Text style={styles.resourceSubtitle}>{item.description}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Necesitas ayuda?</Text>
            <View style={styles.supportCard}>
              <View style={styles.supportRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                <Text style={styles.supportText}>Soporte operaciones: operaciones@skyterra.cl</Text>
              </View>
              <View style={styles.supportRow}>
                <Ionicons name="call-outline" size={18} color={colors.primary} />
                <Text style={styles.supportText}>Emergencias vuelo: +56 9 7654 3210</Text>
              </View>
              <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Profile')}>
                <Ionicons name="person-circle-outline" size={18} color={colors.primaryOn} />
                <Text style={styles.supportButtonLabel}>Actualizar documentación</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ResourcesScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      gap: 28,
      paddingBottom: 120,
    },
    header: {
      gap: 12,
    },
    title: {
      color: colors.heading,
      fontSize: 26,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSecondary,
      lineHeight: 20,
    },
    callout: {
      borderRadius: 28,
      padding: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
    },
    calloutIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    calloutText: {
      flex: 1,
      gap: 4,
    },
    calloutTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    calloutSubtitle: {
      color: colors.textSecondary,
    },
    section: {
      gap: 14,
    },
    sectionTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    resourceCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    resourceIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
    },
    resourceText: {
      flex: 1,
      gap: 4,
    },
    resourceTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    resourceSubtitle: {
      color: colors.textSecondary,
      lineHeight: 18,
    },
    supportCard: {
      borderRadius: 26,
      padding: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    supportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    supportText: {
      color: colors.textSecondary,
      flex: 1,
    },
    supportButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    supportButtonLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
  });
