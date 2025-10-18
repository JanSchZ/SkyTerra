import React from 'react';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
