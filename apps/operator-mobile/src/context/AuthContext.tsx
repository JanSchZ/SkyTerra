import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  signIn,
  fetchCurrentUser,
  SignInPayload,
  OperatorUser,
  loadStoredTokens,
  clearStoredTokens,
  setUnauthorizedHandler,
} from '@services/apiClient';

interface AuthContextValue {
  user: OperatorUser | null;
  /** true mientras se ejecuta una acción explícita (login/logout) */
  loading: boolean;
  /** true únicamente durante la rehidratación/autologin inicial */
  initializing: boolean;
  signInWithCredentials: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearStoredTokens();
      setUser(null);
      setLoading(false);
      setInitializing(false);
    });
    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const tokens = await loadStoredTokens();
        if (tokens.refreshToken) {
          const me = await fetchCurrentUser();
          setUser(me);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.warn('Auth bootstrap error', error);
        await clearStoredTokens();
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, []);

  const signInWithCredentials = async (payload: SignInPayload) => {
    setLoading(true);
    try {
      const result = await signIn(payload);
      if (result.user) {
        setUser(result.user);
        return;
      }
      const me = await fetchCurrentUser();
      setUser(me);
    } catch (error) {
      await clearStoredTokens();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await clearStoredTokens();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, initializing, signInWithCredentials, signOut }),
    [user, loading, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
