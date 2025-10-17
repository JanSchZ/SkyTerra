import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { useAuth } from '@context/AuthContext';
import {
  OperatorJob,
  PilotProfile,
  fetchPilotProfile,
  listAvailableJobs,
  listPilotJobs,
  setAvailability,
} from '@services/operatorJobs';

type DashboardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardNavigation>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PilotProfile | null>(null);
  const [availableJobs, setAvailableJobs] = useState<OperatorJob[]>([]);
  const [pilotJobs, setPilotJobs] = useState<OperatorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (refreshOnly = false) => {
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
      setAvailableJobs(invites);
      setPilotJobs(jobs);
    } catch (err) {
      console.error('Dashboard load error', err);
      setError('No pudimos sincronizar tu panel. Desliza hacia abajo para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAvailability = async (value: boolean) => {
    const previous = isAvailable;
    setIsAvailable(value);
    try {
      await setAvailability(value);
      await load(true);
    } catch (err) {
      console.warn('Toggle availability failed', err);
      setIsAvailable(previous);
    }
  };

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

  const invitesCount = availableJobs.length;
  const pendingDocuments = profile?.documents?.filter((doc) => doc.status !== 'approved') ?? [];

  const handleOpenJob = (jobId: number) => {
    navigation.navigate('JobDetail', { jobId: String(jobId) });
  };

  const handleViewInvites = () => {
    navigation.navigate('Jobs');
  };

  const greetingName = useMemo(() => {
    if (profile?.display_name) {
      return profile.display_name.split(' ')[0];
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return 'Operador';
  }, [profile?.display_name, user?.first_name]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => load(true)}
      tintColor="#FFFFFF"
      progressBackgroundColor="#111827"
    />
  );

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        {loading && !refreshing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Cargando tu panel…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
            <BlurView intensity={90} tint="dark" style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.greeting}>Hola, {greetingName}</Text>
                  <Text style={styles.greetingSubtitle}>Tu centro de operaciones está listo</Text>
                </View>
                <View style={styles.availabilityBox}>
                  <Text style={styles.availabilityLabel}>{isAvailable ? 'Disponible' : 'Pausado'}</Text>
                  <Switch
                    value={isAvailable}
                    onValueChange={toggleAvailability}
                    thumbColor={isAvailable ? '#0F172A' : '#1F2937'}
                    trackColor={{ false: 'rgba(148,163,184,0.4)', true: '#F9FAFB' }}
                  />
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Invitaciones</Text>
                  <Text style={styles.metricValue}>{invitesCount}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Completados</Text>
                  <Text style={styles.metricValue}>{completedCount}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Score</Text>
                  <Text style={styles.metricValue}>
                    {typeof profile?.score === 'number' ? profile.score.toFixed(1) : '—'}
                  </Text>
                </View>
              </View>

              {pendingDocuments.length ? (
                <View style={styles.alertBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#FBBF24" />
                  <Text style={styles.alertText}>
                    {pendingDocuments.length === 1
                      ? 'Tienes un documento pendiente por validar.'
                      : `Tienes ${pendingDocuments.length} documentos pendientes.`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleViewInvites}>
                  <Ionicons name="briefcase-outline" size={16} color="#F9FAFB" />
                  <Text style={styles.secondaryActionLabel}>Ver invitaciones</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Ionicons name="person-circle-outline" size={18} color="#0F172A" />
                  <Text style={styles.primaryActionLabel}>Actualizar perfil</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            {error ? (
              <BlurView intensity={80} tint="dark" style={styles.errorCard}>
                <Ionicons name="warning-outline" size={18} color="#FEE2E2" />
                <Text style={styles.errorText}>{error}</Text>
              </BlurView>
            ) : null}

            {activeJob ? (
              <TouchableOpacity style={styles.cardWrapper} onPress={() => handleOpenJob(activeJob.id)}>
                <LinearGradient colors={['#F9FAFB', '#D1D5DB']} style={styles.activeCard}>
                  <Text style={styles.sectionBadge}>Trabajo en progreso</Text>
                  <Text style={styles.activeTitle}>{activeJob.property_details?.name ?? `Trabajo #${activeJob.id}`}</Text>
                  <View style={styles.row}>
                    <Ionicons name="flash-outline" size={16} color="#111827" />
                    <Text style={styles.rowText}>
                      {activeJob.status_bar?.substate_label || activeJob.status_label || activeJob.status}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={16} color="#111827" />
                    <Text style={styles.rowText}>
                      {activeJob.scheduled_start
                        ? new Date(activeJob.scheduled_start).toLocaleString()
                        : 'Agenda por confirmar'}
                    </Text>
                  </View>
                  <Text style={styles.linkCta}>Ver instrucciones</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            {nextScheduledJob ? (
              <BlurView intensity={85} tint="dark" style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name="calendar" size={18} color="#0F172A" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.cardTitle}>Próxima visita</Text>
                    <Text style={styles.cardSubtitle}>
                      {nextScheduledJob.scheduled_start
                        ? new Date(nextScheduledJob.scheduled_start).toLocaleString()
                        : 'Agenda por definir'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleOpenJob(nextScheduledJob.id)}>
                    <Ionicons name="chevron-forward" size={18} color="#E5E7EB" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardProperty}>
                  {nextScheduledJob.property_details?.name ?? `Trabajo #${nextScheduledJob.id}`}
                </Text>
                {nextScheduledJob.location?.formatted_address ? (
                  <View style={styles.row}>
                    <Ionicons name="location-outline" size={16} color="#CBD5F5" />
                    <Text style={styles.rowText}>{nextScheduledJob.location.formatted_address}</Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Ionicons name="cash-outline" size={16} color="#CBD5F5" />
                  <Text style={styles.rowText}>
                    {nextScheduledJob.pilot_payout_amount
                      ? currencyFormatter.format(nextScheduledJob.pilot_payout_amount)
                      : 'Pago a confirmar'}
                  </Text>
                </View>
              </BlurView>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invitaciones cerca tuyo</Text>
                <TouchableOpacity onPress={handleViewInvites}>
                  <Text style={styles.sectionLink}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {availableJobs.slice(0, 2).map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.inviteCard}
                  onPress={() => handleOpenJob(job.id)}
                >
                  <BlurView intensity={85} tint="dark" style={styles.inviteInner}>
                    <View style={styles.inviteHeader}>
                      <Text style={styles.invitePrice}>
                        {job.pilot_payout_amount
                          ? currencyFormatter.format(job.pilot_payout_amount)
                          : job.price_amount
                          ? currencyFormatter.format(job.price_amount)
                          : '$—'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#E5E7EB" />
                    </View>
                    <Text style={styles.inviteTitle} numberOfLines={1}>
                      {job.property_details?.name ?? `Trabajo #${job.id}`}
                    </Text>
                    <Text style={styles.inviteSubtitle} numberOfLines={1}>
                      {job.location?.formatted_address ?? 'Dirección por confirmar'}
                    </Text>
                  </BlurView>
                </TouchableOpacity>
              ))}
              {availableJobs.length === 0 ? (
                <BlurView intensity={80} tint="dark" style={styles.emptyCard}>
                  <Ionicons name="sparkles-outline" size={20} color="#E5E7EB" />
                  <Text style={styles.emptyTitle}>Sin invitaciones por ahora</Text>
                  <Text style={styles.emptySubtitle}>
                    Mantén tu disponibilidad activa y te avisaremos cuando llegue la próxima misión.
                  </Text>
                </BlurView>
              ) : null}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default DashboardScreen;

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
  heroCard: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 22,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  greeting: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: '700',
  },
  greetingSubtitle: {
    color: '#CBD5F5',
    marginTop: 6,
  },
  availabilityBox: {
    alignItems: 'center',
    gap: 6,
  },
  availabilityLabel: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  alertBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    alignItems: 'center',
  },
  alertText: {
    color: '#FBBF24',
    flex: 1,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryActionLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.35)',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryActionLabel: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  errorCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(127,29,29,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#FEE2E2',
    flex: 1,
  },
  cardWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  activeCard: {
    padding: 24,
    borderRadius: 30,
    gap: 14,
  },
  sectionBadge: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  activeTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    color: '#111827',
    flex: 1,
  },
  linkCta: {
    color: '#111827',
    fontWeight: '700',
    marginTop: 6,
  },
  infoCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#CBD5F5',
  },
  cardProperty: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
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
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  inviteCard: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  inviteInner: {
    padding: 20,
    gap: 10,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitePrice: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
  },
  inviteTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteSubtitle: {
    color: '#CBD5F5',
  },
  emptyCard: {
    borderRadius: 26,
    padding: 24,
    gap: 10,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
