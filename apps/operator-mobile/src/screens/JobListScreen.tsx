import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import JobCard from '@components/JobCard';
import { listNearbyJobs, OperatorJob } from '@services/operatorJobs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '@context/AuthContext';

type JobsScreenNav = NativeStackNavigationProp<RootStackParamList, 'Jobs'>;

const JobListScreen = () => {
  const navigation = useNavigation<JobsScreenNav>();
  const { signOut } = useAuth();
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = async () => {
    setRefreshing(true);
    try {
      const data = await listNearbyJobs();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trabajos disponibles</Text>
        <Text style={styles.headerAction} onPress={signOut}>
          Cerrar sesión
        </Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadJobs} />}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
          />
        )}
        ListEmptyComponent={
          !refreshing ? <Text style={styles.empty}>No hay trabajos cercanos ahora.</Text> : null
        }
      />
    </View>
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
  headerAction: {
    color: '#38BDF8',
  },
  listContent: {
    padding: 24,
    gap: 16,
  },
  empty: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 80,
  },
});

export default JobListScreen;
