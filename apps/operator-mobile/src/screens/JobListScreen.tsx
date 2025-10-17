import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
import { MainTabParamList } from '@navigation/MainTabsNavigator';
import { useAuth } from '@context/AuthContext';
import {
  OperatorJob,
  PilotProfile,
  acceptOffer,
  declineOffer,
  fetchPilotProfile,
  listAvailableJobs,
  listPilotJobs,
  setAvailability,
} from '@services/operatorJobs';
import { useTheme, ThemeColors } from '@theme';

type JobsScreenNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Jobs'>,
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

const formatDuration = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return null;
  }
  if (value < 60) {
    return `${Math.max(1, Math.round(value))} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
};

const JobListScreen = () => {
  const navigation = useNavigation<JobsScreenNav>();
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);
  const [activeJob, setActiveJob] = useState<OperatorJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backgroundGradient = useMemo(
    () => (isDark ? ['#050608', '#0d0f13'] : [colors.background, colors.backgroundAlt]),
    [colors.background, colors.backgroundAlt, isDark]
  );
  const availabilityThumbColor = isAvailable ? (isDark ? colors.surface : colors.primaryOn) : colors.surface;
  const availabilityTrackColor = {
    false: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.45)',
    true: colors.primary,
  };

  const pendingInvites = useMemo(() => jobs.length, [jobs]);

  const loadJobs = async (refreshOnly = false) => {
    if (!refreshOnly) setLoading(true);
    setRefreshing(refreshOnly);
    setError(null);
    try {
      const [profileData, availableJobs, pilotJobs] = await Promise.all([
        fetchPilotProfile(),
        listAvailableJobs(),
        listPilotJobs(),
      ]);

      setPilotProfile(profileData);
      setIsAvailable(profileData.is_available);
      setJobs(availableJobs);
      const nextActive = pilotJobs.find((item) =>
        ['assigned', 'scheduling', 'scheduled', 'shooting'].includes(item.status)
      );
      setActiveJob(nextActive ?? null);
    } catch (err) {
      console.error('Error fetching jobs', err);
      setError('No pudimos cargar los trabajos. Desliza hacia abajo para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const toggleAvailability = async (value: boolean) => {
    const previous = isAvailable;
    setIsAvailable(value);
    try {
      const confirmed = await setAvailability(value);
      setIsAvailable(confirmed);
      setPilotProfile((prev) => (prev ? { ...prev, is_available: confirmed } : prev));
      await loadJobs(true);
    } catch (err) {
      console.warn('No se pudo actualizar la disponibilidad', err);
      setIsAvailable(previous);
      setError('No pudimos actualizar tu disponibilidad. Intenta nuevamente.');
    }
  };

  const handleAccept = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;
    try {
      await acceptOffer(offer.id);
      await loadJobs(true);
      navigation.navigate('JobDetail', { jobId: String(job.id) });
    } catch (err) {
      console.error('Error al aceptar la invitación', err);
    }
  };

  const handleDecline = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;
    try {
      await declineOffer(offer.id);
      await loadJobs(true);
    } catch (err) {
      console.error('Error al declinar la invitación', err);
    }
  };

  const renderJobCard = ({ item }: { item: OperatorJob }) => {
    const offer = item.offers?.find((o) => o.status === 'pending');
    const distance = typeof offer?.metadata?.distance_km === 'number' ? offer.metadata.distance_km : null;
    const travelDistance = item.travel_estimate?.distance_km ?? distance;
    const travelDuration = item.travel_estimate?.duration_minutes ?? null;
    const countdown = typeof offer?.remaining_seconds === 'number' ? offer.remaining_seconds : null;
    const price = item.pilot_payout_amount ?? item.price_amount ?? null;
    const formattedPrice = price ? currencyFormatter.format(price) : '$—';
    const propertyType = item.property_details?.type ?? 'Tipo por confirmar';
    const formattedAddress =
      item.location?.formatted_address ||
      [item.location?.address_line, item.location?.city, item.location?.region].filter(Boolean).join(', ') ||
      null;
    const etaLabel = formatDuration(travelDuration);
    const distanceLabel = formatDistance(travelDistance);

    return (
      <Pressable
        onPress={() => navigation.navigate('JobDetail', { jobId: String(item.id) })}
        style={styles.jobCardWrapper}
      >
        <View style={styles.jobCard}>
          <View style={styles.jobCardHeader}>
            <Text style={styles.jobPrice}>{formattedPrice}</Text>
            {countdown && countdown > 0 ? (
              <View style={styles.jobPill}>
                <Ionicons name="time-outline" size={14} color={colors.primaryOn} />
                <Text style={styles.jobPillText}>{Math.ceil(countdown / 60)} min para aceptar</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.jobTitle}>{item.property_details?.name ?? `Trabajo #${item.id}`}</Text>
          <Text style={styles.jobSubtitle}>{propertyType}</Text>

          <View style={styles.jobMetaRow}>
            <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.jobMetaText}>{item.plan_details?.name ?? 'Plan estándar'}</Text>
          </View>
          {formattedAddress ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText} numberOfLines={1}>
                {formattedAddress}
              </Text>
            </View>
          ) : null}
          {distanceLabel ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText}>{distanceLabel} desde tu radio</Text>
            </View>
          ) : null}
          {etaLabel ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText}>{etaLabel} de traslado estimado</Text>
            </View>
          ) : null}
          {item.property_details?.size ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText}>{item.property_details.size} ha</Text>
            </View>
          ) : null}

          <View style={styles.jobActions}>
            <TouchableOpacity style={styles.secondary} onPress={() => handleDecline(item)} disabled={!offer}>
              <Text style={styles.secondaryText}>Pasar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={() => handleAccept(item)} disabled={!offer}>
              <Text style={styles.primaryText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  const scoreLabel = typeof pilotProfile?.score === 'number' ? pilotProfile.score.toFixed(1) : '—';

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={backgroundGradient} style={styles.gradient}>
        <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando invitaciones…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={backgroundGradient} style={styles.gradient}>
      <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>SkyTerra Operators</Text>
            <Text style={styles.brandSubtitle}>Despachos en tiempo real</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.signOutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadJobs(true)}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surfaceMuted}
            />
          }
          renderItem={renderJobCard}
          ListHeaderComponent={
            <View style={styles.sectionSpacing}>
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View>
                    <Text style={styles.profileWelcome}>
                      {pilotProfile?.display_name ? `Hola, ${pilotProfile.display_name.split(' ')[0]}` : 'Hola, operador'}
                    </Text>
                    <Text style={styles.profileMetaText}>
                      {pilotProfile?.status === 'active' ? 'Activo' : 'Pendiente'} · Score {scoreLabel}
                    </Text>
                  </View>
                  <View style={styles.availabilityCluster}>
                    <Text style={styles.availabilityText}>{isAvailable ? 'Recibiendo trabajos' : 'Pausado'}</Text>
                    <Switch
                      value={isAvailable}
                      onValueChange={toggleAvailability}
                      thumbColor={availabilityThumbColor}
                      trackColor={availabilityTrackColor}
                    />
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Invitaciones</Text>
                    <Text style={styles.metricValue}>{pendingInvites}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Activa</Text>
                    <Text style={styles.metricValue}>{activeJob ? '1' : '0'}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Disponibilidad</Text>
                    <Text style={styles.metricValue}>{isAvailable ? 'ON' : 'OFF'}</Text>
                  </View>
                </View>
              </View>

              {activeJob ? (
                <ActiveJobCard
                  job={activeJob}
                  onPress={() => navigation.navigate('JobDetail', { jobId: String(activeJob.id) })}
                />
              ) : null}

              {error ? (
                <View style={styles.errorCard}>
                  <Ionicons name="warning-outline" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Sin invitaciones nuevas</Text>
              <Text style={styles.emptySubtitle}>Mantén la disponibilidad activa para recibir vuelos cercanos.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const ActiveJobCard: React.FC<{ job: OperatorJob; onPress: () => void }> = ({ job, onPress }) => {
  const { colors, isDark } = useTheme();
  const statusLabel = job.status_bar?.substate_label || job.status_label || job.status;
  const startAt = job.scheduled_start ? new Date(job.scheduled_start).toLocaleString() : 'Agendar';
  const payout = job.pilot_payout_amount ?? job.price_amount ?? null;
  const formattedAddress =
    job.location?.formatted_address ||
    [job.location?.address_line, job.location?.city].filter(Boolean).join(', ');

  return (
    <Pressable onPress={onPress} style={styles.activeWrapper}>
      <LinearGradient
        colors={isDark ? ['rgba(248,250,252,0.08)', 'rgba(248,250,252,0.05)'] : ['#FFFFFF', '#E2E8F0']}
        style={styles.activeGradient}
      >
        <Text style={styles.activeTitle}>Trabajo en progreso</Text>
        <Text style={styles.activeProperty}>{job.property_details?.name ?? `Trabajo #${job.id}`}</Text>
        {formattedAddress ? (
          <View style={styles.activeMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textPrimary} />
            <Text style={styles.activeMeta} numberOfLines={1}>
              {formattedAddress}
            </Text>
          </View>
        ) : null}
        <View style={styles.activeMetaRow}>
          <Ionicons name="flash-outline" size={14} color={colors.textPrimary} />
          <Text style={styles.activeMeta}>{statusLabel}</Text>
        </View>
        <View style={styles.activeMetaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textPrimary} />
          <Text style={styles.activeMeta}>{startAt}</Text>
        </View>
        {payout ? (
          <View style={styles.activeMetaRow}>
            <Ionicons name="cash-outline" size={14} color={colors.textPrimary} />
            <Text style={styles.activeMeta}>{currencyFormatter.format(payout)}</Text>
          </View>
        ) : null}
        <Text style={styles.activeCta}>Ver instrucciones</Text>
      </LinearGradient>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 4,
    },
    brand: {
      color: colors.heading,
      fontSize: 22,
      fontWeight: '700',
    },
    brandSubtitle: {
      color: colors.textSecondary,
      marginTop: 4,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    signOutText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 18,
    },
    sectionSpacing: {
      gap: 18,
      marginBottom: 12,
    },
    profileCard: {
      borderRadius: 28,
      padding: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 16,
    },
    profileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    profileWelcome: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    profileMetaText: {
      color: colors.textSecondary,
      marginTop: 4,
    },
    availabilityCluster: {
      alignItems: 'center',
      gap: 6,
    },
    availabilityText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metric: {
      gap: 4,
      flex: 1,
    },
    metricLabel: {
      color: colors.textMuted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    metricValue: {
      color: colors.heading,
      fontSize: 18,
      fontWeight: '700',
    },
    jobCardWrapper: {
      borderRadius: 26,
      overflow: 'hidden',
    },
    jobCard: {
      padding: 20,
      borderRadius: 26,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 12,
    },
    jobCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    jobPrice: {
      color: colors.heading,
      fontSize: 22,
      fontWeight: '700',
    },
    jobPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    jobPillText: {
      color: colors.primaryOn,
      fontWeight: '600',
      fontSize: 12,
    },
    jobTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    jobSubtitle: {
      color: colors.textSecondary,
    },
    jobMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    jobMetaText: {
      color: colors.textSecondary,
      flex: 1,
    },
    jobActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    primary: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 18,
      alignItems: 'center',
    },
    primaryText: {
      color: colors.primaryOn,
      fontWeight: '700',
    },
    secondary: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    secondaryText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    emptyCard: {
      borderRadius: 26,
      padding: 24,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
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
    activeWrapper: {
      borderRadius: 28,
      overflow: 'hidden',
    },
    activeGradient: {
      padding: 22,
      borderRadius: 28,
    },
    activeTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    activeProperty: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
      marginTop: 4,
    },
    activeMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    activeMeta: {
      color: colors.textPrimary,
      fontSize: 14,
    },
    activeCta: {
      marginTop: 14,
      color: colors.primary,
      fontWeight: '700',
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
  });

export default JobListScreen;
