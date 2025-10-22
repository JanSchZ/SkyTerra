import React from 'react';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import RootNavigator from './navigation/RootNavigator';
import { useDynamicAppIcon } from './hooks/useDynamicAppIcon';

const App = () => {
  useDynamicAppIcon();

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
