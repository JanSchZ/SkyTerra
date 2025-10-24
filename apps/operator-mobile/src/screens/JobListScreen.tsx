import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Slider from '@react-native-community/slider';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
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
  acceptOffer,
  declineOffer,
  listAvailableJobs,
  listPilotJobs,
  setAvailability,
  updatePilotProfile,
  getDebugInfo,
} from '@services/operatorJobs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '@theme';
import analytics from '@services/analytics';

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

const RADIUS_BOUNDS = { min: 5, max: 200, step: 5 };
const DEFAULT_RADIUS = 50;
const RADIUS_STORAGE_KEY = 'skyterra-operator-radius-km';

const clampRadius = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_RADIUS;
  }
  const rounded = Math.round(value);
  if (rounded < RADIUS_BOUNDS.min) return RADIUS_BOUNDS.min;
  if (rounded > RADIUS_BOUNDS.max) return RADIUS_BOUNDS.max;
  return rounded;
};

type LoadMode = 'initial' | 'refresh' | 'silent';

const JobListScreen = () => {
  const navigation = useNavigation<JobsScreenNav>();
  const { signOut, pilotProfile, refreshPilotProfile } = useAuth();
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeJob, setActiveJob] = useState<OperatorJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [radiusDraft, setRadiusDraft] = useState<number>(DEFAULT_RADIUS);
  const [radiusCommitted, setRadiusCommitted] = useState<number>(DEFAULT_RADIUS);
  const [radiusSaving, setRadiusSaving] = useState(false);
  const [radiusError, setRadiusError] = useState<string | null>(null);
  const [loadingOffers, setLoadingOffers] = useState<Record<number, 'accepting' | 'declining'>>({});
  const radiusRef = useRef<number>(DEFAULT_RADIUS);
  const lastRefreshTime = useRef<number>(0);
  const REFRESH_INTERVAL = 30 * 1000; // 30 seconds
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

  const pendingOffers = useMemo(() => jobs.length, [jobs]);

  const loadJobs = async (mode: LoadMode = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    setRadiusError(null);
    try {
      // Refresh pilot profile to ensure we have the latest data
      await refreshPilotProfile();

      const [availableJobs, pilotJobs] = await Promise.all([
        listAvailableJobs(),
        listPilotJobs(),
      ]);

      setIsAvailable(pilotProfile?.is_available ?? true);
      const serverRadius =
        typeof pilotProfile?.coverage_radius_km === 'number' && pilotProfile.coverage_radius_km > 0
          ? clampRadius(pilotProfile.coverage_radius_km)
          : null;
      const radiusValue = serverRadius ?? radiusRef.current ?? DEFAULT_RADIUS;
      radiusRef.current = radiusValue;
      setRadiusDraft(radiusValue);
      setRadiusCommitted(radiusValue);
      setJobs(availableJobs);
      const nextActive = pilotJobs.find((item) =>
        ['assigned', 'scheduling', 'scheduled', 'shooting'].includes(item.status)
      );
      setActiveJob(nextActive ?? null);

      // Load debug info if no jobs available and no error
      if (availableJobs.length === 0 && !error) {
        try {
          const debug = await getDebugInfo();
          setDebugInfo(debug);
          console.log('Debug info:', debug);
        } catch (debugErr) {
          console.warn('Could not load debug info:', debugErr);
        }
      }
    } catch (err) {
      console.error('Error fetching jobs', err);
      setError('No pudimos cargar los trabajos. Desliza hacia abajo para reintentar.');
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
      lastRefreshTime.current = Date.now();
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem(RADIUS_STORAGE_KEY);
        if (stored) {
          const parsed = clampRadius(Number(stored));
          radiusRef.current = parsed;
          setRadiusDraft(parsed);
          setRadiusCommitted(parsed);
        }
      } catch (err) {
        console.warn('No se pudo restaurar el radio guardado', err);
      }
      await loadJobs('initial');
    };
    bootstrap();
  }, []);

  // Refresh data when screen comes into focus (but not too frequently)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshTime.current > REFRESH_INTERVAL) {
        loadJobs('silent').catch((err) => {
          console.warn('Focus refresh failed', err);
        });
      }
    }, [loadJobs])
  );

  const toggleAvailability = async (value: boolean) => {
    const previous = isAvailable;
    setIsAvailable(value);
    setError(null); // Clear any previous errors
    try {
      const confirmed = await setAvailability(value);
      // Always use the server response as source of truth
      setIsAvailable(confirmed);

      // Track analytics
      analytics.trackAvailabilityChanged({
        previous_status: previous,
        new_status: confirmed,
      });

      // Refresh profile to get updated data
      await refreshPilotProfile();
      await loadJobs('silent');
    } catch (err) {
      console.warn('No se pudo actualizar la disponibilidad', err);
      // Rollback to previous state on error
      setIsAvailable(previous);
      setError('No pudimos actualizar tu disponibilidad. Intenta nuevamente.');
    }
  };

  const commitRadius = async (value: number) => {
    const normalized = clampRadius(value);
    const previousRadius = radiusCommitted;
    const previousDraft = radiusDraft;

    setRadiusDraft(normalized);
    if (normalized === radiusCommitted && radiusError === null) {
      return;
    }

    setRadiusError(null);
    setRadiusSaving(true);
    try {
      // Optimistic local update
      radiusRef.current = normalized;
      await AsyncStorage.setItem(RADIUS_STORAGE_KEY, String(normalized));

      // Server update
      await updatePilotProfile({ coverage_radius_km: normalized });
      setRadiusCommitted(normalized);

      // Track analytics
      analytics.trackRadiusChanged({
        previous_radius_km: previousRadius,
        new_radius_km: normalized,
      });

      // Refresh profile to get updated data and sync with server
      await refreshPilotProfile();
      await loadJobs('silent');
    } catch (err) {
      console.warn('No se pudo actualizar el radio de cobertura', err);
      // Rollback all changes on error
      setRadiusError('No pudimos actualizar el radio de trabajo. Intenta nuevamente.');
      setRadiusDraft(previousDraft);
      setRadiusCommitted(previousRadius);
      radiusRef.current = previousRadius;
      await AsyncStorage.setItem(RADIUS_STORAGE_KEY, String(previousRadius));
    } finally {
      setRadiusSaving(false);
    }
  };

  const adjustRadius = (delta: number) => {
    if (radiusSaving) {
      return;
    }
    const next = clampRadius(radiusDraft + delta);
    if (next === radiusDraft) {
      return;
    }
    commitRadius(next);
  };

  const handleAccept = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;

    // Prevent double-tap
    if (loadingOffers[job.id]) return;

    setLoadingOffers(prev => ({ ...prev, [job.id]: 'accepting' }));
    try {
      await acceptOffer(offer.id);

      // Track analytics
      analytics.trackOfferAccepted({
        job_id: job.id,
        offer_id: offer.id,
        payout_amount: job.pilot_payout_amount,
        distance_km: job.travel_estimate?.distance_km,
        property_type: job.property_details?.type,
      });

      await loadJobs(true);
      navigateToJobDetail(job, 'jobs_list');
    } catch (err) {
      console.error('Error al aceptar la oferta', err);
      setError('No pudimos aceptar la oferta. Intenta nuevamente.');
    } finally {
      setLoadingOffers(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
    }
  };

  const handleDecline = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;

    // Prevent double-tap
    if (loadingOffers[job.id]) return;

    setLoadingOffers(prev => ({ ...prev, [job.id]: 'declining' }));
    try {
      await declineOffer(offer.id);

      // Track analytics
      analytics.trackOfferDeclined({
        job_id: job.id,
        offer_id: offer.id,
        payout_amount: job.pilot_payout_amount,
        distance_km: job.travel_estimate?.distance_km,
        property_type: job.property_details?.type,
      });

      await loadJobs(true);
    } catch (err) {
      console.error('Error al declinar la oferta', err);
      setError('No pudimos declinar la oferta. Intenta nuevamente.');
    } finally {
      setLoadingOffers(prev => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
    }
  };

  // Helper function to navigate to job detail with analytics
  const navigateToJobDetail = (job: OperatorJob, source: 'dashboard' | 'jobs_list' | 'notification' = 'jobs_list') => {
    analytics.trackJobViewed({
      job_id: job.id,
      source,
    });
    navigation.navigate('JobDetail', { jobId: String(job.id) });
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
        onPress={() => navigateToJobDetail(item, 'jobs_list')}
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
            <TouchableOpacity
              style={[styles.secondary, loadingOffers[item.id] && styles.disabled]}
              onPress={() => handleDecline(item)}
              disabled={!offer || loadingOffers[item.id]}
              accessibilityLabel={`Declinar oferta ${item.property_details?.name ?? `trabajo ${item.id}`}`}
              testID={`decline-offer-${item.id}`}
            >
              {loadingOffers[item.id] === 'declining' ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={styles.secondaryText}>Pasar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primary, loadingOffers[item.id] && styles.disabled]}
              onPress={() => handleAccept(item)}
              disabled={!offer || loadingOffers[item.id]}
              accessibilityLabel={`Aceptar oferta ${item.property_details?.name ?? `trabajo ${item.id}`}`}
              testID={`accept-offer-${item.id}`}
            >
              {loadingOffers[item.id] === 'accepting' ? (
                <ActivityIndicator size="small" color={colors.primaryOn} />
              ) : (
                <Text style={styles.primaryText}>Aceptar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  const scoreLabel = typeof pilotProfile?.score === 'number' ? pilotProfile.score.toFixed(1) : '—';
  const decreaseDisabled = radiusSaving || radiusDraft <= RADIUS_BOUNDS.min;
  const increaseDisabled = radiusSaving || radiusDraft >= RADIUS_BOUNDS.max;

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={backgroundGradient} style={styles.gradient}>
        <StatusBar style={colors.statusBarStyle} backgroundColor={backgroundGradient[0]} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando ofertas…</Text>
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
          <View style={styles.topRowBrand}>
            <Text style={styles.brand}>Ofertas</Text>
            <Text style={styles.brandSubtitle}>Ajusta tu radio para ver misiones cercanas</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.signOutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Profile and settings section - outside FlatList for better scrolling */}
        <View style={styles.sectionSpacing}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View>
                <Text style={styles.profileHeading}>Ofertas disponibles</Text>
                <Text style={styles.profileMetaText}>
                  {pilotProfile?.display_name ?? 'Completa tu perfil'} · Calificación {scoreLabel}
                </Text>
              </View>
              <View style={styles.availabilityCluster}>
                <Text style={styles.availabilityText}>{isAvailable ? 'Operativo' : 'Pausado'}</Text>
                <Switch
                  value={isAvailable}
                  onValueChange={toggleAvailability}
                  thumbColor={availabilityThumbColor}
                  trackColor={availabilityTrackColor}
                  accessibilityLabel={`Cambiar disponibilidad: ${isAvailable ? 'Operativo' : 'Pausado'}`}
                  testID="availability-switch"
                />
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Ofertas</Text>
                <Text style={styles.metricValue}>{pendingOffers}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Activa</Text>
                <Text style={styles.metricValue}>{activeJob ? '1' : '0'}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Disponibilidad</Text>
                <Text style={styles.metricValue}>{isAvailable ? 'Operativo' : 'Pausado'}</Text>
              </View>
            </View>
            <View style={styles.radiusBlock}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusTitle}>Radio de trabajo</Text>
                <View style={styles.radiusValueGroup}>
                  {radiusSaving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                  <Text style={styles.radiusValue}>{radiusDraft} km</Text>
                </View>
              </View>
              <Text style={styles.radiusHint}>
                Ajusta tu radio para recibir ofertas cercanas en tiempo real.
              </Text>
              <Slider
                value={radiusDraft}
                onValueChange={(value) => setRadiusDraft(clampRadius(value))}
                onSlidingComplete={commitRadius}
                minimumValue={RADIUS_BOUNDS.min}
                maximumValue={RADIUS_BOUNDS.max}
                step={RADIUS_BOUNDS.step}
                thumbTintColor={isDark ? colors.surface : colors.primary}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.cardBorder}
                disabled={radiusSaving}
                accessibilityLabel={`Radio de cobertura: ${radiusDraft} kilómetros`}
                testID="coverage-radius-slider"
              />
              <View style={styles.radiusActions}>
                <TouchableOpacity
                  style={[styles.radiusButton, decreaseDisabled && styles.radiusButtonDisabled]}
                  onPress={() => adjustRadius(-RADIUS_BOUNDS.step)}
                  disabled={decreaseDisabled}
                  accessibilityLabel="Disminuir radio de cobertura 5 km"
                  testID="decrease-radius-button"
                >
                  <Ionicons
                    name="remove-outline"
                    size={16}
                    color={decreaseDisabled ? colors.textMuted : colors.textPrimary}
                  />
                  <Text style={styles.radiusButtonText}>-5 km</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radiusButton, increaseDisabled && styles.radiusButtonDisabled]}
                  onPress={() => adjustRadius(RADIUS_BOUNDS.step)}
                  disabled={increaseDisabled}
                  accessibilityLabel="Aumentar radio de cobertura 5 km"
                  testID="increase-radius-button"
                >
                  <Ionicons
                    name="add-outline"
                    size={16}
                    color={increaseDisabled ? colors.textMuted : colors.textPrimary}
                  />
                  <Text style={styles.radiusButtonText}>+5 km</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.radiusAssist}>
                Rango {RADIUS_BOUNDS.min}–{RADIUS_BOUNDS.max} km
              </Text>
              {radiusError ? <Text style={styles.radiusError}>{radiusError}</Text> : null}
            </View>
          </View>

          {activeJob ? (
            <ActiveJobCard
              job={activeJob}
              onPress={() => navigateToJobDetail(activeJob, 'jobs_list')}
            />
          ) : null}
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadJobs('refresh')}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surfaceMuted}
            />
          }
          renderItem={renderJobCard}
          ListHeaderComponent={
            <View style={styles.sectionSpacing}>
              {error ? (
                <View style={styles.errorCard}>
                  <Ionicons name="warning-outline" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.sectionSpacing}>
              {debugInfo && (
                <View style={styles.debugCard}>
                  <Text style={styles.debugTitle}>🔍 Información del sistema</Text>
                  <Text style={styles.debugText}>Piloto: {debugInfo.pilot?.status} ({debugInfo.pilot?.is_available ? 'Disponible' : 'No disponible'})</Text>
                  <Text style={styles.debugText}>Propiedades aprobadas: {debugInfo.system?.approved_properties}</Text>
                  <Text style={styles.debugText}>En approved_for_shoot: {debugInfo.system?.approved_for_shoot}</Text>
                  <Text style={styles.debugText}>Jobs totales: {debugInfo.system?.total_jobs}</Text>
                  <Text style={styles.debugText}>Jobs del piloto: {debugInfo.system?.pilot_jobs}</Text>
                  <Text style={styles.debugText}>Ofertas del piloto: {debugInfo.system?.pilot_offers}</Text>
                  <Text style={styles.debugText}>Ofertas pendientes: {debugInfo.system?.pending_offers}</Text>
                  <Text style={styles.debugText}>Pilotos disponibles: {debugInfo.system?.available_pilots}</Text>
                  <Text style={styles.debugText}>Propiedades con coordenadas: {debugInfo.system?.properties_with_coordinates}</Text>
                </View>
              )}
              <View style={styles.emptyCard}>
                <Ionicons name="sparkles-outline" size={22} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Sin ofertas nuevas</Text>
                <Text style={styles.emptySubtitle}>Mantén la disponibilidad activa para recibir vuelos cercanos.</Text>
              </View>
            </View>
          }
          scrollEnabled={true}
          bounces={true}
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
    topRowBrand: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    brand: {
      color: colors.heading,
      fontSize: 22,
      fontWeight: '700',
    },
    brandSubtitle: {
      color: colors.textSecondary,
      marginTop: 4,
      flexShrink: 1,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexShrink: 0,
    },
    signOutText: {
      color: colors.textPrimary,
      fontWeight: '600',
      flexShrink: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      gap: 18,
      paddingTop: 12,
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
    profileHeading: {
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
    radiusBlock: {
      marginTop: 16,
      gap: 12,
    },
    radiusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    radiusTitle: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '700',
    },
    radiusValueGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    radiusValue: {
      color: colors.heading,
      fontSize: 16,
      fontWeight: '700',
    },
    radiusHint: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    radiusActions: {
      flexDirection: 'row',
      gap: 12,
    },
    radiusButton: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 12,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    radiusButtonDisabled: {
      opacity: 0.6,
    },
    radiusButtonText: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    radiusAssist: {
      color: colors.textMuted,
      fontSize: 12,
    },
    radiusError: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
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
    disabled: {
      opacity: 0.6,
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
    debugCard: {
      borderRadius: 20,
      padding: 16,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.warning,
      gap: 8,
      marginBottom: 16,
    },
    debugTitle: {
      color: colors.warning,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    debugText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontFamily: 'monospace',
    },
  });

export default JobListScreen;
