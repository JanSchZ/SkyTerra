import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '@navigation/RootNavigator';
import { MainTabParamList } from '@navigation/MainTabsNavigator';
import { useAuth } from '@context/AuthContext';
import {
  OperatorJob,
  PilotProfile,
  fetchPilotProfile,
  listAvailableJobs,
  listPilotJobs,
} from '@services/operatorJobs';
import { useTheme, ThemeColors } from '@theme';
import { DOCUMENT_TOTAL } from '@content/documents';
import GuidedTourOverlay from '@components/GuidedTourOverlay';

type DashboardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatDistance = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  if (value >= 100) {
    return `${value.toFixed(0)} km`;
  }
  if (value >= 10) {
    return `${value.toFixed(1)} km`;
  }
  return `${value.toFixed(2)} km`;
};

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardNavigation>();
  const { user, preferredName, refreshUser, initializing } = useAuth();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [availableOffers, setAvailableOffers] = useState<OperatorJob[]>([]);
  const [pilotJobs, setPilotJobs] = useState<OperatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0b0d11'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );
  const [showTour, setShowTour] = useState(false);
  const hasRequestedProfileName = useRef(false);

  const load = useCallback(
    async (refreshOnly = false) => {
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!refreshOnly) {
        setLoading(true);
      }
      setRefreshing(refreshOnly);
      setError(null);
      try {
        const [profileData, invites, jobs] = await Promise.all([
          fetchPilotProfile(),
          listAvailableJobs(),
          listPilotJobs(),
        ]);
        setProfile(profileData);
        setIsAvailable(profileData.is_available);
        setAvailableOffers(invites);
        setPilotJobs(jobs);
      } catch (err) {
        console.error('Dashboard load error', err);
        setError('No pudimos sincronizar tu panel. Desliza hacia abajo para reintentar.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAvailableOffers([]);
      setPilotJobs([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }
    load();
  }, [load, user]);

  useEffect(() => {
    if (!user) {
      hasRequestedProfileName.current = false;
      return;
    }
    if (!initializing && !preferredName && !hasRequestedProfileName.current) {
      hasRequestedProfileName.current = true;
      refreshUser().catch((err) => {
        console.warn('Dashboard refresh user failed', err);
      });
    }
  }, [initializing, preferredName, refreshUser, user]);

  useEffect(() => {
    const checkTour = async () => {
      try {
        const stored = await AsyncStorage.getItem('skyterra-operator-tour');
        if (!stored) {
          setShowTour(true);
        }
      } catch (err) {
        console.warn('Tour storage error', err);
      }
    };
    checkTour();
  }, []);

  const finishTour = useCallback(async () => {
    try {
      await AsyncStorage.setItem('skyterra-operator-tour', 'done');
    } catch (err) {
      console.warn('Tour dismiss error', err);
    } finally {
      setShowTour(false);
    }
  }, []);

  const activeJob = useMemo(
    () =>
      pilotJobs.find((job) => ['shooting', 'scheduled', 'scheduling'].includes(job.status)) ?? null,
    [pilotJobs]
  );

  const nextScheduledJob = useMemo(() => {
    const candidates = pilotJobs
      .filter((job) => ['assigned', 'scheduled', 'scheduling'].includes(job.status))
      .filter((job) => Boolean(job.scheduled_start));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => {
      const aTime = new Date(a.scheduled_start ?? 0).getTime();
      const bTime = new Date(b.scheduled_start ?? 0).getTime();
      return aTime - bTime;
    })[0];
  }, [pilotJobs]);

  const completedCount = useMemo(
    () => pilotJobs.filter((job) => job.status === 'completed').length,
    [pilotJobs]
  );

  const invitesCount = availableOffers.length;
  const pendingDocuments = profile?.documents?.filter((doc) => doc.status !== 'approved') ?? [];
  const summaryMetrics = useMemo(() => {
    const approvedDocs =
      profile?.documents?.filter((doc) => doc.status === 'approved').length ?? 0;
    return [
      { key: 'invites', label: 'Ofertas', value: String(invitesCount) },
      { key: 'completed', label: 'Completados', value: String(completedCount) },
      {
        key: 'score',
        label: 'Calificación',
        value: typeof profile?.score === 'number' ? profile.score.toFixed(1) : '—',
      },
      {
        key: 'documents',
        label: 'Docs al día',
        value: `${approvedDocs}/${DOCUMENT_TOTAL}`,
      },
    ];
  }, [completedCount, invitesCount, profile?.documents, profile?.score]);
  const offersShowcase = useMemo(() => availableOffers.slice(0, 6), [availableOffers]);

  const ongoingSummaryMessage = useMemo(() => {
    if (!activeJob && !nextScheduledJob) {
      return 'Estamos coordinando nuevas misiones para ti. Te avisaremos en cuanto haya novedades.';
    }
    if (activeJob) {
      return 'Revisa la misión en curso y confirma instrucciones antes de despegar.';
    }
    if (nextScheduledJob) {
      return 'Prepárate para la próxima visita y confirma el horario con el cliente.';
    }
    return 'Mantente atento a nuevas asignaciones.';
  }, [activeJob, nextScheduledJob]);
  const handleOpenJob = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId: String(jobId) });
  };

  const handleViewOffers = () => {
    navigation.navigate('Jobs');
  };

  const greetingName = useMemo(() => {
    const sanitize = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed || trimmed.includes('@')) return null;
      return trimmed;
    };

    const joinNames = (first?: string | null, last?: string | null) => {
      const parts = [first, last].map((part) => part?.trim()).filter(Boolean) as string[];
      if (!parts.length) return null;
      return parts.join(' ');
    };

    const candidates = [
      profile?.display_name,
      joinNames(profile?.user?.first_name, profile?.user?.last_name),
      preferredName,
      joinNames(user?.first_name, user?.last_name),
      profile?.user?.username,
      user?.username,
    ];

    for (const candidate of candidates) {
      const sanitized = sanitize(candidate);
      if (sanitized) return sanitized;
    }

    return '';
  }, [
    preferredName,
    profile?.display_name,
    profile?.user?.first_name,
    profile?.user?.last_name,
    profile?.user?.username,
    user?.first_name,
    user?.last_name,
    user?.username,
  ]);

  const greetingText = greetingName ? `Hola, ${greetingName}` : 'Hola';

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => load(true)}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surfaceMuted}
    />
  );

  return (
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        {loading && !refreshing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando tu panel…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.greeting}>{greetingText}</Text>
                  <Text style={styles.greetingSubtitle}>Centro de operaciones</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>Estado</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isAvailable ? styles.statusBadgeActive : styles.statusBadgePaused,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{isAvailable ? 'Operativo' : 'Pausado'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                {summaryMetrics.map((metric) => (
                  <View key={metric.key} style={styles.metricItem}>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>

              {pendingDocuments.length ? (
                <View style={styles.inlineAlert}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                  <View style={styles.inlineAlertTexts}>
                    <Text style={styles.inlineAlertTitle}>Documentos pendientes</Text>
                    <Text style={styles.inlineAlertSubtitle}>
                      {pendingDocuments.length === 1
                        ? 'Tienes un documento por validar.'
                        : `Tienes ${pendingDocuments.length} documentos pendientes.`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.inlineAlertAction}>Revisar</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.nextStepBox}>
                <Ionicons name="compass-outline" size={18} color={colors.primary} />
                <Text style={styles.nextStepText}>{ongoingSummaryMessage}</Text>
              </View>

              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleViewOffers}>
                  <Ionicons name="briefcase-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.secondaryActionLabel}>Ver ofertas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Ionicons name="person-circle-outline" size={18} color={colors.primaryOn} />
                  <Text style={styles.primaryActionLabel}>Actualizar perfil</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Agenda inmediata</Text>
                {activeJob ? (
                  <TouchableOpacity onPress={() => handleOpenJob(activeJob.id)}>
                    <Text style={styles.sectionLink}>Ver trabajo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.summaryStack}>
                <TouchableOpacity
                  style={[styles.summaryCard, !activeJob && styles.summaryCardMuted]}
                  onPress={() => activeJob && handleOpenJob(activeJob.id)}
                  disabled={!activeJob}
                  activeOpacity={0.9}
                >
                  <Text style={styles.summaryTitle}>Trabajo activo</Text>
                  {activeJob ? (
                    <>
                      <Text style={styles.summaryPrimary}>
                        {activeJob.property_details?.name ?? `Trabajo #${activeJob.id}`}
                      </Text>
                      <Text style={styles.summaryMeta}>
                        {activeJob.scheduled_start
                          ? new Date(activeJob.scheduled_start).toLocaleString()
                          : 'Horario por confirmar'}
                      </Text>
                      <Text style={styles.summaryMeta}>
                        {activeJob.status_bar?.substate_label ||
                          activeJob.status_label ||
                          activeJob.status}
                      </Text>
                      <Text style={styles.summaryFoot}>
                        {activeJob.pilot_payout_amount
                          ? currencyFormatter.format(activeJob.pilot_payout_amount)
                          : 'Pago por confirmar'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.summaryPlaceholder}>
                      No tienes trabajos en progreso en este momento.
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.summaryCard, !nextScheduledJob && styles.summaryCardMuted]}
                  onPress={() => nextScheduledJob && handleOpenJob(nextScheduledJob.id)}
                  disabled={!nextScheduledJob}
                  activeOpacity={0.9}
                >
                  <Text style={styles.summaryTitle}>Próxima visita</Text>
                  {nextScheduledJob ? (
                    <>
                      <Text style={styles.summaryPrimary}>
                        {nextScheduledJob.property_details?.name ?? `Trabajo #${nextScheduledJob.id}`}
                      </Text>
                      <Text style={styles.summaryMeta}>
                        {nextScheduledJob.scheduled_start
                          ? new Date(nextScheduledJob.scheduled_start).toLocaleString()
                          : 'Agenda por confirmar'}
                      </Text>
                      <Text style={styles.summaryMeta}>
                        {nextScheduledJob.location?.formatted_address ?? 'Dirección pendiente'}
                      </Text>
                      <Text style={styles.summaryFoot}>
                        {nextScheduledJob.pilot_payout_amount
                          ? currencyFormatter.format(nextScheduledJob.pilot_payout_amount)
                          : 'Pago por confirmar'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.summaryPlaceholder}>
                      Aún no hay visitas confirmadas en la agenda.
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ofertas disponibles</Text>
                <TouchableOpacity onPress={handleViewOffers}>
                  <Text style={styles.sectionLink}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {offersShowcase.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.inviteCarousel}
                >
                  {offersShowcase.map((job) => {
                    const price = job.pilot_payout_amount ?? job.price_amount ?? null;
                    const distanceLabel = formatDistance(job.travel_estimate?.distance_km);
                    return (
                      <TouchableOpacity
                        key={job.id}
                        style={styles.inviteCard}
                        onPress={() => handleOpenJob(job.id)}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.invitePrice}>
                          {price ? currencyFormatter.format(price) : '$—'}
                        </Text>
                        <Text style={styles.inviteName} numberOfLines={1}>
                          {job.property_details?.name ?? `Trabajo #${job.id}`}
                        </Text>
                        <Text style={styles.inviteLocation} numberOfLines={1}>
                          {job.location?.formatted_address ?? 'Dirección por confirmar'}
                        </Text>
                        <View style={styles.inviteMetaRow}>
                          <Text style={styles.inviteMetaBadge}>
                            {job.plan_details?.name ?? 'Plan estándar'}
                          </Text>
                          {distanceLabel ? (
                            <Text style={styles.inviteMetaBadge}>{distanceLabel}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>Sin ofertas por ahora</Text>
                  <Text style={styles.emptySubtitle}>
                    Estamos buscando nuevas misiones para ti. Te avisaremos apenas tengamos una disponible.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
        {showTour ? <GuidedTourOverlay visible={showTour} onFinish={finishTour} /> : null}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default DashboardScreen;
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
    heroCard: {
      borderRadius: 32,
      padding: 24,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 22,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    greeting: {
      color: colors.heading,
      fontSize: 24,
      fontWeight: '700',
    },
    greetingSubtitle: {
      color: colors.textSecondary,
      marginTop: 6,
    },
    statusContainer: {
      alignItems: 'flex-end',
      gap: 10,
    },
    statusLabel: {
      color: colors.textMuted,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.pillBackground,
    },
    statusBadgeActive: {
      backgroundColor: colors.primarySoft,
    },
    statusBadgePaused: {
      backgroundColor: colors.surfaceMuted,
    },
    statusBadgeText: {
      color: colors.heading,
      fontWeight: '700',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    metricItem: {
      width: '47%',
      borderRadius: 18,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    metricValue: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '600',
    },
    metricLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'none',
      fontWeight: '500',
    },
    inlineAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.cardBorderStrong,
    },
    inlineAlertTexts: {
      flex: 1,
      gap: 2,
    },
    inlineAlertTitle: {
      color: colors.warning,
      fontWeight: '700',
    },
    inlineAlertSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    inlineAlertAction: {
      color: colors.primary,
      fontWeight: '700',
    },
    nextStepBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    nextStepText: {
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    heroActions: {
      flexDirection: 'row',
      gap: 12,
    },
    primaryAction: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    primaryActionLabel: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
    secondaryAction: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surfaceMuted,
    },
    secondaryActionLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    errorCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.danger,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    errorText: {
      color: colors.textPrimary,
      flex: 1,
    },
    section: {
      gap: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    sectionLink: {
      color: colors.primary,
      fontWeight: '600',
    },
    summaryStack: {
      gap: 16,
    },
    summaryCard: {
      borderRadius: 26,
      padding: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    summaryCardMuted: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.cardBorder,
    },
    summaryTitle: {
      color: colors.textSecondary,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    summaryPrimary: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    summaryMeta: {
      color: colors.textSecondary,
    },
    summaryFoot: {
      color: colors.textMuted,
      fontSize: 13,
    },
    summaryPlaceholder: {
      color: colors.textSecondary,
    },
    inviteCarousel: {
      gap: 16,
      paddingRight: 8,
    },
    inviteCard: {
      width: 240,
      borderRadius: 24,
      padding: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 10,
    },
    invitePrice: {
      color: colors.heading,
      fontSize: 20,
      fontWeight: '700',
    },
    inviteName: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    inviteLocation: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    inviteMetaRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    inviteMetaBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.surfaceMuted,
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    emptyCard: {
      borderRadius: 26,
      padding: 24,
      gap: 10,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    emptyTitle: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    emptySubtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
