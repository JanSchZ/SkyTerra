import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { signIn, fetchCurrentUser, SignInPayload, OperatorUser } from '@services/apiClient';

interface AuthContextValue {
  user: OperatorUser | null;
  loading: boolean;
  signInWithCredentials: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const me = await fetchCurrentUser();
          setUser(me);
        }
      } catch (error) {
        console.warn('Auth bootstrap error', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const signInWithCredentials = async (payload: SignInPayload) => {
    setLoading(true);
    try {
      const { refreshToken } = await signIn(payload);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      const me = await fetchCurrentUser();
      setUser(me);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('refreshToken');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, signInWithCredentials, signOut }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
