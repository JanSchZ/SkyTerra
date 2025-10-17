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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/RootNavigator';
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

type JobsScreenNav = NativeStackNavigationProp<RootStackParamList, 'Jobs'>;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

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
      await setAvailability(value);
      await loadJobs(true);
    } catch (err) {
      console.warn('No se pudo actualizar la disponibilidad', err);
      setIsAvailable(previous);
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
    const countdown = typeof offer?.remaining_seconds === 'number' ? offer.remaining_seconds : null;
    const price = item.pilot_payout_amount ?? item.price_amount ?? null;
    const formattedPrice = price ? currencyFormatter.format(price) : '$—';
    const propertyType = item.property_details?.type ?? 'Tipo por confirmar';

    return (
      <Pressable
        onPress={() => navigation.navigate('JobDetail', { jobId: String(item.id) })}
        style={styles.jobCardWrapper}
      >
        <BlurView intensity={90} tint="dark" style={styles.jobCard}>
          <View style={styles.jobCardHeader}>
            <Text style={styles.jobPrice}>{formattedPrice}</Text>
            {countdown && countdown > 0 ? (
              <View style={styles.jobPill}>
                <Ionicons name="time-outline" size={14} color="#111827" />
                <Text style={styles.jobPillText}>{Math.ceil(countdown / 60)} min para aceptar</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.jobTitle}>{item.property_details?.name ?? `Trabajo #${item.id}`}</Text>
          <Text style={styles.jobSubtitle}>{propertyType}</Text>

          <View style={styles.jobMetaRow}>
            <Ionicons name="map-outline" size={16} color="#CBD5F5" />
            <Text style={styles.jobMetaText}>{item.plan_details?.name ?? 'Plan estándar'}</Text>
          </View>
          {distance !== null ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="navigate-outline" size={16} color="#CBD5F5" />
              <Text style={styles.jobMetaText}>{distance.toFixed(1)} km desde tu radio</Text>
            </View>
          ) : null}
          {item.property_details?.size ? (
            <View style={styles.jobMetaRow}>
              <Ionicons name="resize-outline" size={16} color="#CBD5F5" />
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
        </BlurView>
      </Pressable>
    );
  };

  const scoreLabel = typeof pilotProfile?.score === 'number' ? pilotProfile.score.toFixed(1) : '—';

  if (loading && !refreshing) {
    return (
      <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe}>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Buscando invitaciones…</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>SkyTerra Operators</Text>
            <Text style={styles.brandSubtitle}>Despachos en tiempo real</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color="#F5F5F5" />
            <Text style={styles.signOutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} tintColor="#FFFFFF" />}
          renderItem={renderJobCard}
          ListHeaderComponent={
            <View style={styles.sectionSpacing}>
              <BlurView intensity={90} tint="dark" style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View>
                    <Text style={styles.profileWelcome}>
                      {pilotProfile ? `Hola, ${pilotProfile.display_name.split(' ')[0]}` : 'Hola, operador'}
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
                      thumbColor={isAvailable ? '#0F172A' : '#1F2937'}
                      trackColor={{ false: 'rgba(148,163,184,0.4)', true: '#F9FAFB' }}
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
              </BlurView>

              {activeJob ? (
                <ActiveJobCard
                  job={activeJob}
                  onPress={() => navigation.navigate('JobDetail', { jobId: String(activeJob.id) })}
                />
              ) : null}

              {error ? (
                <BlurView intensity={80} tint="dark" style={styles.errorCard}>
                  <Ionicons name="warning-outline" size={18} color="#FEE2E2" />
                  <Text style={styles.errorText}>{error}</Text>
                </BlurView>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <BlurView intensity={80} tint="dark" style={styles.emptyCard}>
              <Ionicons name="sparkles-outline" size={22} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>Sin invitaciones nuevas</Text>
              <Text style={styles.emptySubtitle}>Mantén la disponibilidad activa para recibir vuelos cercanos.</Text>
            </BlurView>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const ActiveJobCard: React.FC<{ job: OperatorJob; onPress: () => void }> = ({ job, onPress }) => {
  const statusLabel = job.status_bar?.substate_label || job.status_label || job.status;
  const startAt = job.scheduled_start ? new Date(job.scheduled_start).toLocaleString() : 'Agendar';
  const payout = job.pilot_payout_amount ?? job.price_amount ?? null;

  return (
    <Pressable onPress={onPress} style={styles.activeWrapper}>
      <LinearGradient colors={['#F9FAFB', '#D1D5DB']} style={styles.activeGradient}>
        <Text style={styles.activeTitle}>Trabajo en progreso</Text>
        <Text style={styles.activeProperty}>{job.property_details?.name ?? `Trabajo #${job.id}`}</Text>
        <View style={styles.activeMetaRow}>
          <Ionicons name="flash-outline" size={14} color="#111827" />
          <Text style={styles.activeMeta}>{statusLabel}</Text>
        </View>
        <View style={styles.activeMetaRow}>
          <Ionicons name="calendar-outline" size={14} color="#111827" />
          <Text style={styles.activeMeta}>{startAt}</Text>
        </View>
        {payout ? (
          <View style={styles.activeMetaRow}>
            <Ionicons name="cash-outline" size={14} color="#111827" />
            <Text style={styles.activeMeta}>{currencyFormatter.format(payout)}</Text>
          </View>
        ) : null}
        <Text style={styles.activeCta}>Ver instrucciones</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
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
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: '#9CA3AF',
    marginTop: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  signOutText: {
    color: '#F9FAFB',
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
    backgroundColor: 'rgba(10,11,15,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileWelcome: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  profileMetaText: {
    color: '#E5E7EB',
    marginTop: 4,
  },
  availabilityCluster: {
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    color: '#F9FAFB',
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
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    color: '#F9FAFB',
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
    backgroundColor: 'rgba(15,17,23,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobPrice: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
  jobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  jobPillText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 12,
  },
  jobTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
  },
  jobSubtitle: {
    color: '#D1D5DB',
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobMetaText: {
    color: '#CBD5F5',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primary: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  secondary: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 26,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  emptyTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
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
  activeWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  activeGradient: {
    padding: 22,
    borderRadius: 28,
  },
  activeTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeProperty: {
    color: '#111827',
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
    color: '#111827',
    fontSize: 14,
  },
  activeCta: {
    marginTop: 14,
    color: '#111827',
    fontWeight: '700',
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
});

export default JobListScreen;
