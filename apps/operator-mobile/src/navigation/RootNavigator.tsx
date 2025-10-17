import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import SignInScreen from '@screens/SignInScreen';
import JobListScreen from '@screens/JobListScreen';
import JobDetailScreen from '@screens/JobDetailScreen';
import { useAuth } from '@context/AuthContext';

export type RootStackParamList = {
  SignIn: undefined;
  Jobs: undefined;
  JobDetail: { jobId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Preparando tu sesión…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Jobs" component={JobListScreen} />
            <Stack.Screen name="JobDetail" component={JobDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
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
