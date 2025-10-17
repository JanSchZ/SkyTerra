import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '@context/AuthContext';
import {
  listAvailableJobs,
  listPilotJobs,
  OperatorJob,
  acceptOffer,
  declineOffer,
  fetchPilotProfile,
  setAvailability,
  PilotProfile,
} from '@services/operatorJobs';

type JobsScreenNav = NativeStackNavigationProp<RootStackParamList, 'Jobs'>;

const JobListScreen = () => {
  const navigation = useNavigation<JobsScreenNav>();
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);
  const [activeJob, setActiveJob] = useState<OperatorJob | null>(null);

  const loadJobs = async (refreshOnly = false) => {
    if (!refreshOnly) setLoading(true);
    setRefreshing(refreshOnly);
    try {
      const [profileData, jobData, myJobs] = await Promise.all([
        fetchPilotProfile(),
        listAvailableJobs(),
        listPilotJobs(),
      ]);
      setPilotProfile(profileData);
      setIsAvailable(profileData.is_available);
      setJobs(jobData);
      const nextActive = myJobs.find((item) =>
        ['assigned', 'scheduling', 'scheduled', 'shooting'].includes(item.status)
      );
      setActiveJob(nextActive ?? null);
    } catch (error) {
      console.error('Error fetching jobs', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      await setAvailability(value);
      await loadJobs(true);
    } catch (error) {
      console.warn('No se pudo actualizar la disponibilidad', error);
      setIsAvailable(!value);
    }
  };

  const handleAccept = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;
    try {
      await acceptOffer(offer.id);
      await loadJobs(true);
      navigation.navigate('JobDetail', { jobId: String(job.id) });
    } catch (error) {
      console.error('Error al aceptar la invitación', error);
    }
  };

  const handleDecline = async (job: OperatorJob) => {
    const offer = job.offers?.find((item) => item.status === 'pending');
    if (!offer) return;
    try {
      await declineOffer(offer.id);
      await loadJobs(true);
    } catch (error) {
      console.error('Error al declinar la invitación', error);
    }
  };

  const renderJobCard = ({ item }: { item: OperatorJob }) => {
    const offer = item.offers?.find((o) => o.status === 'pending');
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('JobDetail', { jobId: String(item.id) })}>
          <Text style={styles.cardPrice}>
            ${item.pilot_payout_amount ? item.pilot_payout_amount.toFixed(0) : item.price_amount?.toFixed(0) ?? '--'}
          </Text>
          <Text style={styles.cardTitle}>{item.property_details?.name ?? 'Terreno sin nombre'}</Text>
          <Text style={styles.cardSubtitle}>
            {item.property_details?.type || 'Tipo no definido'} ·{' '}
            {item.property_details?.size ? `${item.property_details.size} ha` : 'Tamaño por confirmar'}
          </Text>
          <Text style={styles.cardMeta}>{item.plan_details?.name || 'Plan estándar'}</Text>
          {typeof offer?.metadata?.distance_km === 'number' && (
            <Text style={styles.cardDistance}>{offer.metadata.distance_km.toFixed(1)} km del punto de vuelo</Text>
          )}
          {typeof offer?.remaining_seconds === 'number' && offer.remaining_seconds > 0 && (
            <Text style={styles.cardCountdown}>Confirma en {offer.remaining_seconds}s</Text>
          )}
        </TouchableOpacity>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.secondary} onPress={() => handleDecline(item)} disabled={!offer}>
            <Text style={styles.secondaryText}>Pasar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primary} onPress={() => handleAccept(item)} disabled={!offer}>
            <Text style={styles.primaryText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const scoreLabel =
    typeof pilotProfile?.score === 'number' ? pilotProfile.score.toFixed(1) : '—';

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Buscando invitaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Trabajos disponibles</Text>
          <Text style={styles.headerSubtitle}>Responde rápido para asegurar el vuelo</Text>
          {pilotProfile ? (
            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>{pilotProfile.display_name}</Text>
              <Text style={styles.profileScore}>
                {pilotProfile.status === 'active' ? 'Operador activo' : 'Perfil pendiente'} · Score {scoreLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <View style={styles.availabilityToggle}>
            <Text style={styles.availabilityLabel}>Disponible</Text>
            <Switch value={isAvailable} onValueChange={toggleAvailability} thumbColor={isAvailable ? '#2563EB' : '#64748B'} />
          </View>
          <Text style={styles.headerAction} onPress={signOut}>
            Cerrar sesión
          </Text>
        </View>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobs(true)} />}
        renderItem={renderJobCard}
        ListHeaderComponent={
          activeJob ? (
            <ActiveJobBanner job={activeJob} onPress={() => navigation.navigate('JobDetail', { jobId: String(activeJob.id) })} />
          ) : null
        }
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No hay invitaciones disponibles.</Text> : null}
      />
    </View>
  );
};

const ActiveJobBanner: React.FC<{ job: OperatorJob; onPress: () => void }> = ({ job, onPress }) => {
  const statusLabel = job.status_bar?.substate_label || job.status_label || job.status;
  return (
    <TouchableOpacity style={styles.activeBanner} onPress={onPress}>
      <View style={styles.activeHeader}>
        <Text style={styles.activeTitle}>Trabajo en progreso</Text>
        <Text style={styles.activeStatus}>{statusLabel}</Text>
      </View>
      <Text style={styles.activeProperty}>{job.property_details?.name ?? `ID ${job.id}`}</Text>
      <Text style={styles.activeMeta}>
        Agenda: {job.scheduled_start ? new Date(job.scheduled_start).toLocaleString() : 'Sin confirmar'}
      </Text>
      <Text style={styles.activeCta}>Ir al detalle</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#CBD5F5',
    marginTop: 4,
  },
  profileMeta: {
    marginTop: 8,
  },
  profileName: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  profileScore: {
    color: '#94A3B8',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  headerAction: {
    color: '#38BDF8',
    marginTop: 8,
  },
  listContent: {
    padding: 24,
    gap: 16,
  },
  activeBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38BDF833',
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeTitle: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  activeStatus: {
    color: '#FACC15',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  activeProperty: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  activeMeta: {
    color: '#94A3B8',
    marginTop: 6,
  },
  activeCta: {
    color: '#38BDF8',
    marginTop: 12,
    fontWeight: '600',
  },
  empty: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 80,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityLabel: {
    color: '#CBD5F5',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
    gap: 12,
  },
  cardPrice: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#CBD5F5',
  },
  cardMeta: {
    color: '#64748B',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardDistance: {
    color: '#94A3B8',
    marginTop: 4,
    fontSize: 12,
  },
  cardCountdown: {
    color: '#FACC15',
    marginTop: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primary: {
    flex: 1,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
  },
});

export default JobListScreen;
