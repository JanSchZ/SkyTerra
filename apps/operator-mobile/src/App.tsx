import React from 'react';
import { ThemeProvider } from './theme';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import RootNavigator from './navigation/RootNavigator';
import ToastContainer from './components/ToastContainer';
import { useDynamicAppIcon } from './hooks/useDynamicAppIcon';

const App = () => {
  useDynamicAppIcon();

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RootNavigator />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
