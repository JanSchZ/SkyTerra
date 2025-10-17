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
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@navigation/RootNavigator';
import { MainTabParamList } from '@navigation/MainTabsNavigator';
import { OperatorJob, listPilotJobs } from '@services/operatorJobs';
import { useTheme, ThemeColors } from '@theme';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0b0d11'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );

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
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => load(true)}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surfaceMuted}
    />
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
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        {loading && !refreshing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
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
                <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                <Text style={styles.allInvitesText}>Ofertas</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {nextJob ? (
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View style={styles.badge}>
                    <Ionicons name="calendar" size={18} color={colors.primaryOn} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.heroProperty}>
                  {nextJob.property_details?.name ?? `Trabajo #${nextJob.id}`}
                </Text>
                {nextJob.location?.formatted_address ? (
                  <View style={styles.heroRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.heroRowText} numberOfLines={2}>
                      {nextJob.location.formatted_address}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.heroRow}>
                  <Ionicons name="flash-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.heroRowText}>
                    {nextJob.status_bar?.substate_label || nextJob.status_label || nextJob.status}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyHero}>
                <Ionicons name="sparkles-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.emptyHeroTitle}>Aún no tienes visitas agendadas</Text>
                <Text style={styles.emptyHeroSubtitle}>
                  Acepta ofertas desde la pestaña Órdenes para completar tu calendario.
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calendario</Text>
              {upcomingJobs.length ? (
                upcomingJobs.map((job) => (
                  <TouchableOpacity key={job.id} onPress={() => handleOpenJob(job.id)}>
                    <View style={styles.listCard}>
                      <View style={styles.listHeader}>
                        <Text style={styles.listDate}>
                          {job.scheduled_start
                            ? new Date(job.scheduled_start).toLocaleString()
                            : 'Por confirmar'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
                          <Ionicons name="flash-outline" size={12} color={colors.primaryOn} />
                          <Text style={styles.tagText}>
                            {job.status_bar?.substate_label || job.status_label || job.status}
                          </Text>
                        </View>
                        {job.plan_details?.name ? (
                          <View style={styles.tag}>
                            <Ionicons name="layers-outline" size={12} color={colors.primaryOn} />
                            <Text style={styles.tagText}>{job.plan_details.name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Tu calendario está libre. ¡Es buen momento para aceptar nuevos vuelos!</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimos vuelos completados</Text>
              {completedJobs.length ? (
                completedJobs.map((job) => (
                  <View key={job.id} style={styles.completedCard}>
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
                  </View>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Cuando finalices vuelos aparecerán aquí con su historial.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ScheduleScreen;

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
      paddingBottom: 120,
      gap: 24,
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
    },
    loadingText: {
      color: colors.textSecondary,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      color: colors.heading,
      fontSize: 24,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: 6,
    },
    allInvites: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
    },
    allInvitesText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    errorCard: {
      borderRadius: 24,
      padding: 16,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.danger,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      color: colors.textPrimary,
      flex: 1,
    },
    heroCard: {
      borderRadius: 28,
      padding: 22,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTexts: {
      flex: 1,
      gap: 4,
    },
    heroTitle: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '700',
    },
    heroSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    heroProperty: {
      color: colors.heading,
      fontSize: 20,
      fontWeight: '700',
    },
    heroRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    heroRowText: {
      color: colors.textSecondary,
      flex: 1,
    },
    emptyHero: {
      borderRadius: 28,
      padding: 24,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      gap: 12,
    },
    emptyHeroTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    emptyHeroSubtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    section: {
      gap: 14,
    },
    sectionTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    listCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    listDate: {
      color: colors.textSecondary,
    },
    listTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    listSubtitle: {
      color: colors.textSecondary,
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
      backgroundColor: colors.primarySoft,
    },
    tagText: {
      color: colors.primaryOn,
      fontSize: 12,
      fontWeight: '600',
    },
    emptyList: {
      borderRadius: 24,
      padding: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyListText: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    completedCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    completedTitle: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    completedMeta: {
      color: colors.textSecondary,
    },
  });
