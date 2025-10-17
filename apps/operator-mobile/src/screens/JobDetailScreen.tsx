import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import JobMapPreview from '@components/JobMapPreview';
import RequirementChecklist from '@components/RequirementChecklist';
import DeliverablesUploader from '@components/DeliverablesUploader';
import {
  OperatorJob,
  OperatorJobRequirement,
  OperatorJobDeliverables,
  fetchJob,
  scheduleJob,
  startFlight,
  completeFlight,
  updateRequirementStatus,
} from '@services/operatorJobs';
import { RootStackParamList } from '../navigation/RootNavigator';
import { calculateDistanceInKm, estimateTravelMinutes } from '@utils/geo';
import { getErrorMessage } from '@utils/errorMessages';

type JobDetailRoute = RouteProp<RootStackParamList, 'JobDetail'>;
type JobDetailNavigation = NativeStackNavigationProp<RootStackParamList, 'JobDetail'>;

type ActionLoading = 'schedule' | 'start' | 'complete' | null;

const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const JobDetailScreen = () => {
  const route = useRoute<JobDetailRoute>();
  const navigation = useNavigation<JobDetailNavigation>();
  const { jobId } = route.params;

  const [job, setJob] = useState<OperatorJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [requirementLoadingId, setRequirementLoadingId] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJob(jobId);
      setJob(data);
    } catch (error) {
      console.error('Error loading job', error);
      Alert.alert('Error', getErrorMessage(error, 'No pudimos cargar el detalle del trabajo.'));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    const requestLocation = async () => {
      if (!job?.location?.latitude || !job.location.longitude) {
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermissionDenied(true);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        setCurrentCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (error) {
        console.warn('No pudimos obtener la ubicación del piloto', error);
        setLocationPermissionDenied(true);
      }
    };

    requestLocation();
  }, [job?.location?.latitude, job?.location?.longitude]);

  const computedDistanceKm = useMemo(() => {
    if (!job?.location?.latitude || !job.location.longitude || !currentCoords) {
      return null;
    }
    return calculateDistanceInKm(currentCoords, {
      latitude: job.location.latitude,
      longitude: job.location.longitude,
    });
  }, [currentCoords, job?.location?.latitude, job?.location?.longitude]);

  const computedDurationMinutes = useMemo(() => {
    if (job?.travel_estimate?.duration_minutes) {
      return job.travel_estimate.duration_minutes;
    }
    if (computedDistanceKm) {
      return estimateTravelMinutes(computedDistanceKm);
    }
    return null;
  }, [computedDistanceKm, job?.travel_estimate?.duration_minutes]);

  const statusLabel = job?.status_bar?.substate_label || job?.status_label || job?.status || '—';
  const propertyName = job?.property_details?.name ?? `Trabajo #${job?.id ?? ''}`;
  const propertyType = job?.property_details?.type ?? 'Tipo por confirmar';
  const planName = job?.plan_details?.name ?? 'Plan estándar';

  const scheduleRange = useMemo(() => {
    if (!job?.scheduled_start) {
      return 'Por confirmar';
    }
    const start = new Date(job.scheduled_start);
    const end = job.scheduled_end ? new Date(job.scheduled_end) : null;
    const startLabel = start.toLocaleString();
    const endLabel = end ? end.toLocaleTimeString() : '—';
    return `${startLabel} · Hasta ${endLabel}`;
  }, [job?.scheduled_end, job?.scheduled_start]);

  const totalPayout = job?.payout_breakdown?.total ?? job?.pilot_payout_amount ?? job?.price_amount ?? null;
  const basePayout = job?.payout_breakdown?.base_amount ?? null;
  const extrasPayout = job?.payout_breakdown?.extras ?? null;
  const travelPayout = job?.payout_breakdown?.travel_bonus ?? null;

  const upcomingStep = useMemo(() => {
    if (!job) return 'Mantén tu disponibilidad activa mientras coordinamos los detalles finales.';
    if (job.status === 'assigned') {
      return 'Confirma la ventana propuesta con el cliente y agenda tu visita.';
    }
    if (job.status === 'scheduled') {
      return 'Llega al punto acordado con 15 minutos de antelación para la revisión de seguridad.';
    }
    if (job.status === 'shooting') {
      return 'Captura el material siguiendo el plan de vuelo y verifica los requisitos antes de despegar.';
    }
    return 'Revisa las actualizaciones del historial y mantente atento a nuevas instrucciones.';
  }, [job]);

  const canSchedule = job?.status === 'assigned';
  const canStart = job?.status === 'scheduled';
  const canComplete = job?.status === 'shooting';

  const handleSchedule = async () => {
    if (!job) return;
    try {
      setActionLoading('schedule');
      const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await scheduleJob(job.id, {
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      });
      await loadJob();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo confirmar la agenda.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartFlight = async () => {
    if (!job) return;
    try {
      setActionLoading('start');
      await startFlight(job.id);
      await loadJob();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo iniciar el vuelo.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteFlight = async () => {
    if (!job) return;
    try {
      setActionLoading('complete');
      await completeFlight(job.id);
      await loadJob();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo finalizar el vuelo.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequirementToggle = async (
    requirement: OperatorJobRequirement,
    nextValue: boolean
  ) => {
    if (!job) return;
    try {
      setRequirementLoadingId(requirement.id);
      const updated = await updateRequirementStatus(job.id, requirement.id, nextValue);
      setJob((previous) => {
        if (!previous) return previous;
        const requirements = previous.requirements?.map((item) =>
          item.id === requirement.id
            ? {
                ...item,
                ...updated,
                is_complete: updated?.is_complete ?? nextValue,
                completed_at:
                  updated?.completed_at ?? (nextValue ? new Date().toISOString() : null),
              }
            : item
        );
        return { ...previous, requirements };
      });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No pudimos actualizar el requisito.'));
    } finally {
      setRequirementLoadingId(null);
    }
  };

  const handleDeliverablesUploaded = (deliverables: OperatorJobDeliverables) => {
    setJob((previous) => (previous ? { ...previous, deliverables } : previous));
  };

  if (loading && !job) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando trabajo…</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>No encontramos el trabajo solicitado.</Text>
      </View>
    );
  }

  const locationNotice =
    locationPermissionDenied && job.location?.latitude && job.location.longitude
      ? 'Activa los permisos de ubicación para calcular tiempos de traslado en tiempo real.'
      : null;

  return (
    <LinearGradient colors={['#050608', '#0b0d11']} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
            <Text style={styles.backLabel}>Volver</Text>
          </TouchableOpacity>

          <BlurView intensity={90} tint="dark" style={styles.heroCard}>
            <View style={styles.statusBadge}>
              <Ionicons name="rocket-outline" size={16} color="#F8FAFC" />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <Text style={styles.title}>{propertyName}</Text>
            <Text style={styles.subtitle}>{propertyType}</Text>
            <Text style={styles.planLabel}>{planName}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Agenda</Text>
                <Text style={styles.metricValue}>{scheduleRange}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Pago estimado</Text>
                <Text style={styles.metricValue}>
                  {totalPayout !== null ? currencyFormatter.format(totalPayout) : '$—'}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              {canSchedule ? (
                <TouchableOpacity
                  style={[styles.primaryAction, actionLoading && styles.disabled]}
                  onPress={handleSchedule}
                  disabled={actionLoading !== null}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0F172A" />
                  <Text style={styles.primaryActionLabel}>
                    {actionLoading === 'schedule' ? 'Confirmando…' : 'Confirmar horario sugerido'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {canStart ? (
                <TouchableOpacity
                  style={[styles.primaryAction, actionLoading && styles.disabled]}
                  onPress={handleStartFlight}
                  disabled={actionLoading !== null}
                >
                  <Ionicons name="airplane-outline" size={18} color="#0F172A" />
                  <Text style={styles.primaryActionLabel}>
                    {actionLoading === 'start' ? 'Iniciando…' : 'Iniciar vuelo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {canComplete ? (
                <TouchableOpacity
                  style={[styles.primaryAction, actionLoading && styles.disabled]}
                  onPress={handleCompleteFlight}
                  disabled={actionLoading !== null}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#0F172A" />
                  <Text style={styles.primaryActionLabel}>
                    {actionLoading === 'complete' ? 'Enviando…' : 'Finalizar vuelo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.nextStepBox}>
              <Ionicons name="compass-outline" size={18} color="#F8FAFC" />
              <Text style={styles.nextStepText}>{upcomingStep}</Text>
            </View>
          </BlurView>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trayecto y punto de encuentro</Text>
            <JobMapPreview
              location={job.location}
              travelEstimate={job.travel_estimate}
              fallbackDistanceKm={computedDistanceKm}
              fallbackDurationMinutes={computedDurationMinutes}
            />
            {locationNotice ? <Text style={styles.helperText}>{locationNotice}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checklist operativo</Text>
            <RequirementChecklist
              requirements={job.requirements}
              onToggle={handleRequirementToggle}
              loadingId={requirementLoadingId}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entrega de contenido</Text>
            <DeliverablesUploader
              jobId={job.id}
              deliverables={job.deliverables}
              onUpload={handleDeliverablesUploaded}
            />
          </View>

          {job.vendor_instructions ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instrucciones del cliente</Text>
              <BlurView intensity={90} tint="dark" style={styles.infoCard}>
                <Text style={styles.infoText}>{job.vendor_instructions}</Text>
              </BlurView>
            </View>
          ) : null}

          {job.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas internas</Text>
              <BlurView intensity={80} tint="dark" style={styles.infoCard}>
                <Text style={styles.infoText}>{job.notes}</Text>
              </BlurView>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pago</Text>
            <BlurView intensity={85} tint="dark" style={styles.payoutCard}>
              <View style={styles.payoutRow}>
                <Text style={styles.payoutLabel}>Total estimado</Text>
                <Text style={styles.payoutValue}>
                  {totalPayout !== null ? currencyFormatter.format(totalPayout) : '$—'}
                </Text>
              </View>
              <View style={styles.payoutBreakdown}>
                {basePayout !== null ? (
                  <View style={styles.payoutLine}>
                    <Text style={styles.payoutLineLabel}>Base</Text>
                    <Text style={styles.payoutLineValue}>{currencyFormatter.format(basePayout)}</Text>
                  </View>
                ) : null}
                {travelPayout !== null ? (
                  <View style={styles.payoutLine}>
                    <Text style={styles.payoutLineLabel}>Viáticos</Text>
                    <Text style={styles.payoutLineValue}>{currencyFormatter.format(travelPayout)}</Text>
                  </View>
                ) : null}
                {extrasPayout !== null ? (
                  <View style={styles.payoutLine}>
                    <Text style={styles.payoutLineLabel}>Extras</Text>
                    <Text style={styles.payoutLineValue}>{currencyFormatter.format(extrasPayout)}</Text>
                  </View>
                ) : null}
                {job.payout_breakdown?.notes ? (
                  <Text style={styles.helperText}>{job.payout_breakdown.notes}</Text>
                ) : null}
              </View>
            </BlurView>
          </View>

          {job.contact ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contacto del cliente</Text>
              <BlurView intensity={90} tint="dark" style={styles.infoCard}>
                {job.contact.name ? <Text style={styles.infoText}>{job.contact.name}</Text> : null}
                {job.contact.phone ? <Text style={styles.infoText}>{job.contact.phone}</Text> : null}
                {job.contact.email ? <Text style={styles.infoText}>{job.contact.email}</Text> : null}
              </BlurView>
            </View>
          ) : null}

          {job.timeline?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Historial</Text>
              <BlurView intensity={80} tint="dark" style={styles.timelineCard}>
                {job.timeline.map((event) => (
                  <View key={event.id} style={styles.timelineRow}>
                    <View style={styles.timelineIcon}>
                      <Ionicons name="ellipse" size={8} color="#F8FAFC" />
                    </View>
                    <View style={styles.timelineTexts}>
                      <Text style={styles.timelineDate}>
                        {new Date(event.created_at).toLocaleString()}
                      </Text>
                      <Text style={styles.timelineMessage}>{event.message || event.kind}</Text>
                    </View>
                  </View>
                ))}
              </BlurView>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 18,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: '#E0F2FE',
    fontWeight: '600',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#E2E8F0',
    fontSize: 16,
  },
  planLabel: {
    color: '#94A3B8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
  },
  primaryActionLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.65,
  },
  nextStepBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  nextStepText: {
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 20,
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  infoText: {
    color: '#E2E8F0',
    lineHeight: 20,
  },
  payoutCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payoutLabel: {
    color: '#CBD5F5',
  },
  payoutValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  payoutBreakdown: {
    gap: 10,
  },
  payoutLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payoutLineLabel: {
    color: '#94A3B8',
  },
  payoutLineValue: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  timelineCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: 'rgba(15,17,23,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineIcon: {
    paddingTop: 6,
  },
  timelineTexts: {
    flex: 1,
    gap: 4,
  },
  timelineDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  timelineMessage: {
    color: '#E2E8F0',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    color: '#94A3B8',
  },
});

export default JobDetailScreen;
