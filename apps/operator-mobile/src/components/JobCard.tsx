import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OperatorJob } from '@services/operatorJobs';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  job: OperatorJob;
  onPress: () => void;
}

const JobCard: React.FC<Props> = ({ job, onPress }) => {
  const timeString = formatDistanceToNow(new Date(job.scheduled_for), { addSuffix: true, locale: es });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.status}>{job.status.toUpperCase()}</Text>
        <Text style={styles.payout}>${job.payout_amount.toFixed(0)} CLP</Text>
      </View>
      <Text style={styles.address}>{job.property_address}</Text>
      <Text style={styles.when}>Programado {timeString}</Text>
      {job.distance_km != null ? <Text style={styles.distance}>{job.distance_km.toFixed(1)} km</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  status: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  payout: {
    color: '#FACC15',
    fontWeight: '700',
  },
  address: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  when: {
    color: '#94A3B8',
  },
  distance: {
    color: '#94A3B8',
  },
});

export default JobCard;
