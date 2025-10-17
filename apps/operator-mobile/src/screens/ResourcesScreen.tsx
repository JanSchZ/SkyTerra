import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@navigation/RootNavigator';
import { MainTabParamList } from '@navigation/MainTabsNavigator';

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
    url: 'https://skyterra.cl/recursos/checklist-preflight',
  },
  {
    id: 'safety',
    title: 'Protocolos de seguridad',
    description: 'Actualizaciones sobre normativa DGAC, zonas restringidas y contactos de emergencia.',
    icon: 'shield-checkmark-outline' as const,
    url: 'https://skyterra.cl/recursos/seguridad',
  },
  {
    id: 'billing',
    title: 'Facturación y pagos',
    description: 'Pasos para cargar boletas, plazos de pago y resolución de incidencias.',
    icon: 'document-text-outline' as const,
    url: 'https://skyterra.cl/recursos/pagos',
  },
];

const ResourcesScreen = () => {
  const navigation = useNavigation<ResourcesNavigation>();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      /* noop */
    });
  };

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Centro de recursos</Text>
            <Text style={styles.subtitle}>
              Material de apoyo, estándares visuales y guías operativas para tus misiones.
            </Text>
          </View>

          <BlurView intensity={85} tint="dark" style={styles.callout}>
            <View style={styles.calloutIcon}>
              <Ionicons name="cloud-upload-outline" size={20} color="#0F172A" />
            </View>
            <View style={styles.calloutText}>
              <Text style={styles.calloutTitle}>Entrega tu material</Text>
              <Text style={styles.calloutSubtitle}>
                Sube fotografías, videos y archivos ZIP directo desde el detalle del trabajo en curso.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Jobs')}>
              <Ionicons name="chevron-forward" size={18} color="#F9FAFB" />
            </TouchableOpacity>
          </BlurView>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentos destacados</Text>
            <BlurView intensity={85} tint="dark" style={styles.documentCard}>
              <Text style={styles.documentText}>
                Descarga el kit de estilo, logos y plantillas para compartir tu trabajo con los clientes.
              </Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleOpenLink('https://skyterra.cl/recursos/brand-kit.zip')}
              >
                <Ionicons name="download-outline" size={18} color="#0F172A" />
                <Text style={styles.documentButtonLabel}>Descargar kit</Text>
              </TouchableOpacity>
            </BlurView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guías operativas</Text>
            {resources.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => handleOpenLink(item.url)}>
                <BlurView intensity={80} tint="dark" style={styles.resourceCard}>
                  <View style={styles.resourceIcon}>
                    <Ionicons name={item.icon} size={18} color="#0F172A" />
                  </View>
                  <View style={styles.resourceText}>
                    <Text style={styles.resourceTitle}>{item.title}</Text>
                    <Text style={styles.resourceSubtitle}>{item.description}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#E5E7EB" />
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Necesitas ayuda?</Text>
            <BlurView intensity={85} tint="dark" style={styles.supportCard}>
              <View style={styles.supportRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#38BDF8" />
                <Text style={styles.supportText}>Soporte operaciones: operaciones@skyterra.cl</Text>
              </View>
              <View style={styles.supportRow}>
                <Ionicons name="call-outline" size={18} color="#38BDF8" />
                <Text style={styles.supportText}>Emergencias vuelo: +56 9 7654 3210</Text>
              </View>
              <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Profile')}>
                <Ionicons name="person-circle-outline" size={18} color="#0F172A" />
                <Text style={styles.supportButtonLabel}>Actualizar documentación</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ResourcesScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 28,
    paddingBottom: 120,
  },
  header: {
    gap: 12,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#CBD5F5',
    lineHeight: 20,
  },
  callout: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  calloutIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calloutText: {
    flex: 1,
    gap: 4,
  },
  calloutTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  calloutSubtitle: {
    color: '#CBD5F5',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  documentCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  documentText: {
    color: '#E5E7EB',
    lineHeight: 20,
  },
  documentButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  documentButtonLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  resourceCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceText: {
    flex: 1,
    gap: 4,
  },
  resourceTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  resourceSubtitle: {
    color: '#CBD5F5',
    lineHeight: 20,
  },
  supportCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  supportRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  supportText: {
    color: '#F9FAFB',
    flex: 1,
  },
  supportButton: {
    marginTop: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  supportButtonLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
