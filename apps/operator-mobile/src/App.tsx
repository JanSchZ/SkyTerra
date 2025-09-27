import React from 'react';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
