import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { acceptJob, completeJob, OperatorJob, startJob } from '@services/operatorJobs';
import { api } from '@services/apiClient';
import { format } from 'date-fns';

const JobDetailScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'JobDetail'>>();
  const { jobId } = route.params;
  const [job, setJob] = useState<OperatorJob | null>(null);

  const load = async () => {
    const { data } = await api.get(`/api/operator/jobs/${jobId}/`);
    setJob(data);
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const handleAction = async (action: 'accept' | 'start' | 'complete') => {
    try {
      if (action === 'accept') await acceptJob({ jobId, etaMinutes: 30 });
      if (action === 'start') await startJob({ jobId });
      if (action === 'complete') await completeJob({ jobId });
      await load();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No pudimos actualizar el trabajo.');
    }
  };

  if (!job) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando trabajo...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.status}>{job.status.toUpperCase()}</Text>
      <Text style={styles.title}>{job.property_address}</Text>
      <Text style={styles.meta}>
        Programado para: {format(new Date(job.scheduled_for), 'dd/MM/yyyy HH:mm')}
      </Text>
      {job.distance_km != null && (
        <Text style={styles.meta}>{job.distance_km.toFixed(1)} km de distancia</Text>
      )}
      <Text style={styles.meta}>Pago: ${job.payout_amount.toFixed(0)} CLP</Text>
      {job.notes ? <Text style={styles.notes}>{job.notes}</Text> : null}

      <View style={styles.actions}>
        {job.status === 'pending' && (
          <TouchableOpacity style={styles.primary} onPress={() => handleAction('accept')}>
            <Text style={styles.primaryText}>Aceptar</Text>
          </TouchableOpacity>
        )}
        {job.status === 'accepted' && (
          <TouchableOpacity style={styles.primary} onPress={() => handleAction('start')}>
            <Text style={styles.primaryText}>Iniciar</Text>
          </TouchableOpacity>
        )}
        {job.status === 'in_progress' && (
          <TouchableOpacity style={styles.primary} onPress={() => handleAction('complete')}>
            <Text style={styles.primaryText}>Completar</Text>
          </TouchableOpacity>
        )}
      </View>
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
  actions: {
    marginTop: 32,
    gap: 12,
  },
  primary: {
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
