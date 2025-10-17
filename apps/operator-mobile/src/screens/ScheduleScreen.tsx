import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { OperatorJob, listPilotJobs } from '@services/operatorJobs';

type ScheduleNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Schedule'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ScheduleScreen = () => {
  const navigation = useNavigation<ScheduleNavigation>();
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refreshOnly = false) => {
    if (!refreshOnly) setLoading(true);
    setRefreshing(refreshOnly);
    setError(null);
    try {
      const data = await listPilotJobs();
      setJobs(data);
    } catch (err) {
      console.error('Schedule load error', err);
      setError('No pudimos actualizar tu agenda. Desliza hacia abajo para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FFFFFF" />
  );

  const upcomingJobs = useMemo(() => {
    const relevantStatuses = ['assigned', 'scheduled', 'scheduling'];
    return jobs
      .filter((job) => relevantStatuses.includes(job.status))
      .sort((a, b) => {
        const aTime = new Date(a.scheduled_start ?? 0).getTime();
        const bTime = new Date(b.scheduled_start ?? 0).getTime();
        return aTime - bTime;
      });
  }, [jobs]);

  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === 'completed').slice(0, 4),
    [jobs]
  );

  const nextJob = upcomingJobs[0];

  const handleOpenJob = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId: String(jobId) });
  };

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        {loading && !refreshing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Actualizando tu agenda…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Agenda de vuelos</Text>
                <Text style={styles.subtitle}>Coordina tus misiones confirmadas</Text>
              </View>
              <TouchableOpacity style={styles.allInvites} onPress={() => navigation.navigate('Jobs')}>
                <Ionicons name="briefcase-outline" size={16} color="#F9FAFB" />
                <Text style={styles.allInvitesText}>Invitaciones</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <BlurView intensity={80} tint="dark" style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color="#FEE2E2" />
                <Text style={styles.errorText}>{error}</Text>
              </BlurView>
            ) : null}

            {nextJob ? (
              <BlurView intensity={90} tint="dark" style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.badge}>
                    <Ionicons name="calendar" size={18} color="#0F172A" />
                  </View>
                  <View style={styles.heroTexts}>
                    <Text style={styles.heroTitle}>Próxima visita</Text>
                    <Text style={styles.heroSubtitle}>
                      {nextJob.scheduled_start
                        ? new Date(nextJob.scheduled_start).toLocaleString()
                        : 'Agenda por confirmar'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleOpenJob(nextJob.id)}>
                    <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.heroProperty}>
                  {nextJob.property_details?.name ?? `Trabajo #${nextJob.id}`}
                </Text>
                {nextJob.location?.formatted_address ? (
                  <View style={styles.heroRow}>
                    <Ionicons name="location-outline" size={16} color="#CBD5F5" />
                    <Text style={styles.heroRowText} numberOfLines={2}>
                      {nextJob.location.formatted_address}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.heroRow}>
                  <Ionicons name="flash-outline" size={16} color="#CBD5F5" />
                  <Text style={styles.heroRowText}>
                    {nextJob.status_bar?.substate_label || nextJob.status_label || nextJob.status}
                  </Text>
                </View>
              </BlurView>
            ) : (
              <BlurView intensity={80} tint="dark" style={styles.emptyHero}>
                <Ionicons name="sparkles-outline" size={22} color="#E5E7EB" />
                <Text style={styles.emptyHeroTitle}>Aún no tienes visitas agendadas</Text>
                <Text style={styles.emptyHeroSubtitle}>
                  Acepta invitaciones desde la pestaña Órdenes para completar tu calendario.
                </Text>
              </BlurView>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calendario</Text>
              {upcomingJobs.length ? (
                upcomingJobs.map((job) => (
                  <TouchableOpacity key={job.id} onPress={() => handleOpenJob(job.id)}>
                    <BlurView intensity={85} tint="dark" style={styles.listCard}>
                      <View style={styles.listHeader}>
                        <Text style={styles.listDate}>
                          {job.scheduled_start
                            ? new Date(job.scheduled_start).toLocaleString()
                            : 'Por confirmar'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
                      </View>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {job.property_details?.name ?? `Trabajo #${job.id}`}
                      </Text>
                      {job.location?.formatted_address ? (
                        <Text style={styles.listSubtitle} numberOfLines={1}>
                          {job.location.formatted_address}
                        </Text>
                      ) : null}
                      <View style={styles.listTags}>
                        <View style={styles.tag}>
                          <Ionicons name="flash-outline" size={12} color="#F9FAFB" />
                          <Text style={styles.tagText}>
                            {job.status_bar?.substate_label || job.status_label || job.status}
                          </Text>
                        </View>
                        {job.plan_details?.name ? (
                          <View style={styles.tag}>
                            <Ionicons name="layers-outline" size={12} color="#F9FAFB" />
                            <Text style={styles.tagText}>{job.plan_details.name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                ))
              ) : (
                <BlurView intensity={80} tint="dark" style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Tu calendario está libre. ¡Es buen momento para aceptar nuevos vuelos!</Text>
                </BlurView>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimos vuelos completados</Text>
              {completedJobs.length ? (
                completedJobs.map((job) => (
                  <BlurView key={job.id} intensity={80} tint="dark" style={styles.completedCard}>
                    <Text style={styles.completedTitle} numberOfLines={1}>
                      {job.property_details?.name ?? `Trabajo #${job.id}`}
                    </Text>
                    <Text style={styles.completedMeta}>
                      {job.scheduled_end
                        ? new Date(job.scheduled_end).toLocaleString()
                        : job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleString()
                        : 'Fecha no disponible'}
                    </Text>
                  </BlurView>
                ))
              ) : (
                <BlurView intensity={75} tint="dark" style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Cuando finalices vuelos aparecerán aquí con su historial.</Text>
                </BlurView>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ScheduleScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 24,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#CBD5F5',
    marginTop: 6,
  },
  allInvites: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.25)',
    alignItems: 'center',
  },
  allInvitesText: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(127,29,29,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#FEE2E2',
    flex: 1,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTexts: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#CBD5F5',
    fontSize: 14,
  },
  heroProperty: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  heroRowText: {
    color: '#CBD5F5',
    flex: 1,
  },
  emptyHero: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 12,
  },
  emptyHeroTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHeroSubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  listCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listDate: {
    color: '#E5E7EB',
  },
  listTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  listSubtitle: {
    color: '#CBD5F5',
  },
  listTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  tagText: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyList: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyListText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  completedCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: 'rgba(15,17,23,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  completedTitle: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  completedMeta: {
    color: '#CBD5F5',
  },
});
