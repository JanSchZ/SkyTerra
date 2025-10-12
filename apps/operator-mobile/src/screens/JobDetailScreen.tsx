import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { fetchJob, OperatorJob, scheduleJob, startFlight, completeFlight } from '@services/operatorJobs';
import { format } from 'date-fns';

const JobDetailScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'JobDetail'>>();
  const { jobId } = route.params;
  const [job, setJob] = useState<OperatorJob | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJob = async () => {
    try {
      setLoading(true);
      const data = await fetchJob(jobId);
      setJob(data);
    } catch (error) {
      console.error('Error loading job', error);
      Alert.alert('Error', 'No pudimos cargar el detalle del trabajo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const handleSchedule = async () => {
    if (!job) return;
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    try {
      await scheduleJob(job.id, {
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
      });
      await loadJob();
    } catch (error) {
      console.error('Error scheduling job', error);
      Alert.alert('Error', 'No se pudo confirmar la agenda.');
    }
  };

  const handleStartFlight = async () => {
    if (!job) return;
    try {
      await startFlight(job.id);
      await loadJob();
    } catch (error) {
      console.error('Error starting flight', error);
      Alert.alert('Error', 'No se pudo iniciar el vuelo.');
    }
  };

  const handleCompleteFlight = async () => {
    if (!job) return;
    try {
      await completeFlight(job.id);
      await loadJob();
    } catch (error) {
      console.error('Error completing flight', error);
      Alert.alert('Error', 'No se pudo finalizar el vuelo.');
    }
  };

  if (loading || !job) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando trabajo...</Text>
      </View>
    );
  }

  const scheduledRange = job.scheduled_start
    ? `${format(new Date(job.scheduled_start), 'dd/MM HH:mm')} - ${job.scheduled_end ? format(new Date(job.scheduled_end), 'HH:mm') : ''}`
    : 'Sin confirmar';
  const statusLabel = job.status_bar?.substate_label || job.status_label || job.status;
  const canSchedule = job.status === 'assigned';
  const canStart = job.status === 'scheduled';
  const canComplete = job.status === 'shooting';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.status}>{statusLabel}</Text>
      <Text style={styles.title}>{job.property_details?.name ?? 'Terreno sin nombre'}</Text>
      <Text style={styles.meta}>{job.property_details?.type || 'Tipo no especificado'}</Text>
      <Text style={styles.meta}>Plan: {job.plan_details?.name || '—'}</Text>
      <Text style={styles.meta}>Agenda: {scheduledRange}</Text>
      <Text style={styles.meta}>
        Pago estimado: ${job.pilot_payout_amount ? job.pilot_payout_amount.toFixed(0) : job.price_amount?.toFixed(0) ?? '--'}
      </Text>
      {job.notes ? <Text style={styles.notes}>{job.notes}</Text> : null}
      {job.vendor_instructions ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instrucciones del vendedor</Text>
          <Text style={styles.sectionBody}>{job.vendor_instructions}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Qué sigue</Text>
        <Text style={styles.sectionBody}>
          {canSchedule
            ? 'Confirma la fecha propuesta con el vendedor para coordinar el vuelo.'
            : canStart
            ? 'Prepara el equipo y confirma condiciones antes de la hora agendada.'
            : canComplete
            ? 'Realiza la grabación siguiendo el plan de vuelo acordado.'
            : 'Revisa los detalles y mantente disponible para actualizaciones.'}
        </Text>
      </View>

      {canSchedule && (
        <TouchableOpacity style={styles.primary} onPress={handleSchedule}>
          <Text style={styles.primaryText}>Confirmar horario sugerido</Text>
        </TouchableOpacity>
      )}
      {canStart && (
        <TouchableOpacity style={styles.primary} onPress={handleStartFlight}>
          <Text style={styles.primaryText}>Iniciar vuelo</Text>
        </TouchableOpacity>
      )}
      {canComplete && (
        <TouchableOpacity style={styles.primary} onPress={handleCompleteFlight}>
          <Text style={styles.primaryText}>Finalizar vuelo</Text>
        </TouchableOpacity>
      )}

      {job.timeline?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {job.timeline.map((event) => (
            <View key={event.id} style={styles.timelineEntry}>
              <Text style={styles.timelineLabel}>{format(new Date(event.created_at), 'dd/MM HH:mm')}</Text>
              <Text style={styles.timelineBody}>{event.message || event.kind}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#020617',
    flexGrow: 1,
    gap: 12,
  },
  status: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
  },
  meta: {
    color: '#CBD5F5',
  },
  notes: {
    color: '#E2E8F0',
    marginTop: 16,
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionBody: {
    color: '#CBD5F5',
    lineHeight: 18,
  },
  timelineEntry: {
    marginTop: 12,
  },
  timelineLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 2,
  },
  timelineBody: {
    color: '#E2E8F0',
  },
  primary: {
    marginTop: 32,
    backgroundColor: '#38BDF8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0F172A',
    fontWeight: '700',
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
