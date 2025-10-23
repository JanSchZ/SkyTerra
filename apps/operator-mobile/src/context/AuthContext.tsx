import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import axios from 'axios';
import {
  signIn,
  fetchCurrentUser,
  SignInPayload,
  OperatorUser,
  loadStoredTokens,
  clearStoredTokens,
  setUnauthorizedHandler,
  persistCredentials,
  loadStoredCredentials,
  clearStoredCredentials,
  loadPreferredName,
  persistPreferredName,
  clearPreferredName,
} from '@services/apiClient';
import { PilotProfile, fetchPilotProfile } from '@services/operatorJobs';
import { usePushNotifications } from '@hooks/usePushNotifications';

interface AuthContextValue {
  user: OperatorUser | null;
  /** true mientras se ejecuta una acción explícita (login/logout) */
  loading: boolean;
  /** true únicamente durante la rehidratación/autologin inicial */
  initializing: boolean;
  signInWithCredentials: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshPilotProfile: () => Promise<void>;
  pilotProfile: PilotProfile | null;
  preferredName: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OperatorUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preferredName, setPreferredName] = useState<string | null>(null);
  const [pilotProfile, setPilotProfile] = useState<PilotProfile | null>(null);
  const autoLoginPromiseRef = useRef<Promise<boolean> | null>(null);
  const { registerForPushNotifications } = usePushNotifications();

  useEffect(() => {
    const loadName = async () => {
      const stored = await loadPreferredName();
      if (stored) setPreferredName(stored);
    };
    loadName();
  }, []);

  const computePreferredName = useCallback((candidate: OperatorUser | null | undefined) => {
    if (!candidate) return null;
    const first = candidate.first_name?.trim();
    const last = candidate.last_name?.trim();
    const parts = [first, last].filter((part): part is string => Boolean(part && part.length));
    if (parts.length) {
      return parts.join(' ');
    }
    return null;
  }, []);

  const performSignIn = useCallback(
    async (payload: SignInPayload, options: { remember: boolean; markLoading: boolean } = { remember: false, markLoading: false }) => {
      const trimmedEmail = payload.email.trim();
      const effectivePayload: SignInPayload = { email: trimmedEmail, password: payload.password };
      if (options.markLoading) {
        setLoading(true);
      }
      try {
        const result = await signIn(effectivePayload);
        let resolvedUser: OperatorUser | null = null;
        if (result.user) {
          setUser(result.user);
          resolvedUser = result.user;
        } else {
          const me = await fetchCurrentUser();
          setUser(me);
          resolvedUser = me;
        }
        const name = computePreferredName(resolvedUser);
        setPreferredName(name);
        if (options.remember) {
          await persistCredentials(effectivePayload);
        }
        await persistPreferredName(name);

        // Load pilot profile after successful sign in
        try {
          const profile = await fetchPilotProfile();
          setPilotProfile(profile);

          // Register for push notifications after successful sign in
          try {
            await registerForPushNotifications();
          } catch (notificationError) {
            console.warn('Failed to register for push notifications after sign in', notificationError);
          }
        } catch (error) {
          console.warn('Failed to load pilot profile after sign in', error);
        }

        return true;
      } catch (error) {
        if (options.remember) {
          await clearStoredCredentials();
        }
        await clearStoredTokens();
        await clearPreferredName();
        throw error;
      } finally {
        if (options.markLoading) {
          setLoading(false);
        }
      }
    },
    [computePreferredName]
  );

  const attemptStoredCredentialLogin = useCallback(async () => {
    try {
      const { email, password } = await loadStoredCredentials();
      if (!email || !password) {
        return false;
      }
      await performSignIn({ email, password }, { remember: false, markLoading: false });
      return true;
    } catch (error) {
      console.warn('Auto-login con credenciales guardadas falló', error);
      await clearStoredCredentials();
      await clearPreferredName();
      return false;
    }
  }, [performSignIn]);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearStoredTokens();
      setUser(null);
      setPilotProfile(null);
      setLoading(false);
      if (!autoLoginPromiseRef.current) {
        autoLoginPromiseRef.current = attemptStoredCredentialLogin().finally(() => {
          autoLoginPromiseRef.current = null;
        });
      }
      const restored = await autoLoginPromiseRef.current;
      if (!restored) {
        setInitializing(false);
      }
    });
    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, [attemptStoredCredentialLogin]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const tokens = await loadStoredTokens();
        let authenticated = false;
        if (tokens.refreshToken) {
          try {
            const me = await fetchCurrentUser();
            setUser(me);
            const name = computePreferredName(me);
            if (name) {
              setPreferredName(name);
              await persistPreferredName(name);
            }
            authenticated = true;

            // Load pilot profile after successful authentication
            try {
              const profile = await fetchPilotProfile();
              setPilotProfile(profile);

              // Register for push notifications after successful authentication
              try {
                await registerForPushNotifications();
              } catch (notificationError) {
                console.warn('Failed to register for push notifications during bootstrap', notificationError);
              }
            } catch (error) {
              console.warn('Failed to load pilot profile during bootstrap', error);
            }
          } catch (error) {
            console.warn('Auth bootstrap fetch user failed', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              await clearStoredTokens();
              setUser(null);
            }
          }
        }
        if (!authenticated) {
          const restored = await attemptStoredCredentialLogin();
          if (!restored) {
            setUser(null);
            setPilotProfile(null);
          }
        }
      } catch (error) {
        console.warn('Auth bootstrap error', error);
        const shouldClear = axios.isAxiosError(error) && error.response?.status === 401;
        if (shouldClear) {
          await clearStoredTokens();
        }
        setUser(null);
        setPilotProfile(null);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, [attemptStoredCredentialLogin, computePreferredName]);

  const signInWithCredentials = useCallback(
    async (payload: SignInPayload) => {
      await performSignIn(payload, { remember: true, markLoading: true });
    },
    [performSignIn]
  );

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      const name = computePreferredName(me);
      setPreferredName(name);
      await persistPreferredName(name);
    } catch (error) {
      console.warn('refreshUser failed', error);
      throw error;
    }
  }, [computePreferredName]);

  const refreshPilotProfile = useCallback(async () => {
    try {
      const profile = await fetchPilotProfile();
      setPilotProfile(profile);
    } catch (error) {
      console.warn('refreshPilotProfile failed', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredTokens();
    await clearStoredCredentials();
    await clearPreferredName();
    autoLoginPromiseRef.current = null;
    setUser(null);
    setPreferredName(null);
    setPilotProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, initializing, signInWithCredentials, signOut, refreshUser, refreshPilotProfile, pilotProfile, preferredName }),
    [user, loading, initializing, signInWithCredentials, signOut, refreshUser, refreshPilotProfile, pilotProfile, preferredName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
