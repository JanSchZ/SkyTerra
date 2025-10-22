import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { extractMessageFromData, getErrorMessage } from '@utils/errorMessages';

const apiBaseUrl = Constants?.expoConfig?.extra?.apiUrl || process.env.API_URL;

if (!apiBaseUrl) {
  console.warn('API_URL is not set. Define it in app.config or .env');
}

const ACCESS_TOKEN_KEY = 'skyterra-operator-access-token';
const REFRESH_TOKEN_KEY = 'skyterra-operator-refresh-token';
const LEGACY_REFRESH_KEY = 'refreshToken';
const CREDENTIAL_EMAIL_KEY = 'skyterra-operator-cred-email';
const CREDENTIAL_PASSWORD_KEY = 'skyterra-operator-cred-password';
const PREFERRED_NAME_KEY = 'skyterra-operator-preferred-name';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setUnauthorizedHandler = (handler?: () => void) => {
  unauthorizedHandler = handler ?? null;
};

const applyAccessHeader = (config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }
  return config;
};

export const loadStoredTokens = async () => {
  const [storedAccess, storedRefresh, legacyRefresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(LEGACY_REFRESH_KEY),
  ]);
  accessToken = storedAccess;
  refreshToken = storedRefresh ?? legacyRefresh;

  if (!storedRefresh && legacyRefresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh);
    await SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY);
  }

  return { accessToken, refreshToken };
};

export const persistTokens = async ({ access, refresh }: { access: string; refresh: string }) => {
  accessToken = access;
  refreshToken = refresh;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
};

export const clearStoredTokens = async () => {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY),
  ]);
};

export const persistCredentials = async ({ email, password }: { email: string; password: string }) => {
  await Promise.all([
    SecureStore.setItemAsync(CREDENTIAL_EMAIL_KEY, email),
    SecureStore.setItemAsync(CREDENTIAL_PASSWORD_KEY, password),
  ]);
};

export const loadStoredCredentials = async () => {
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(CREDENTIAL_EMAIL_KEY),
    SecureStore.getItemAsync(CREDENTIAL_PASSWORD_KEY),
  ]);
  return { email, password };
};

export const clearStoredCredentials = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(CREDENTIAL_EMAIL_KEY),
    SecureStore.deleteItemAsync(CREDENTIAL_PASSWORD_KEY),
  ]);
};

export const persistPreferredName = async (name: string | null | undefined) => {
  if (name && name.trim().length > 0) {
    await SecureStore.setItemAsync(PREFERRED_NAME_KEY, name.trim());
  } else {
    await SecureStore.deleteItemAsync(PREFERRED_NAME_KEY);
  }
};

export const loadPreferredName = async () => SecureStore.getItemAsync(PREFERRED_NAME_KEY);

export const clearPreferredName = async () => SecureStore.deleteItemAsync(PREFERRED_NAME_KEY);

const rawClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: false,
});

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshToken) {
    return null;
  }
  try {
    const { data } = await rawClient.post('/api/auth/token/refresh/', { refresh: refreshToken });
    const newAccess: string | undefined = data?.access;
    const newRefresh: string | undefined = data?.refresh;
    if (newAccess) {
      accessToken = newAccess;
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccess);
    }
    if (newRefresh) {
      refreshToken = newRefresh;
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
    }
    return newAccess ?? null;
  } catch (error) {
    await clearStoredTokens();
    return null;
  }
};

const queueRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = await refreshAccessToken();
      refreshPromise = null;
      return token;
    })();
  }
  return refreshPromise;
};

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: false,
  timeout: 15000,
});

api.interceptors.request.use((config) => applyAccessHeader(config));

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const originalRequest = config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (response?.status === 401 && originalRequest && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      const token = await queueRefresh();
      if (token) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        return api(originalRequest);
      }
      unauthorizedHandler?.();
    } else if (response?.status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInTokens {
  access: string;
  refresh: string;
}

export interface SignInResult {
  tokens: SignInTokens | null;
  user: OperatorUser | null;
}

export interface SignUpPayload {
  email: string;
  password1: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface SignUpResult {
  detail?: string;
  requiresVerification?: boolean;
  tokens?: SignInTokens | null;
}

export interface OperatorUser {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}

interface RawUser {
  id?: number;
  pk?: number;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}

const mapUser = (data: RawUser | null | undefined): OperatorUser => ({
  id: data?.id ?? data?.pk ?? 0,
  email: data?.email ?? '',
  username: data?.username,
  first_name: data?.first_name,
  last_name: data?.last_name,
  is_staff: data?.is_staff,
});

export const signIn = async (payload: SignInPayload): Promise<SignInResult> => {
  try {
    const loginIdentifier = payload.email?.trim();
    const submission: Record<string, string> = {
      password: payload.password,
    };

    if (loginIdentifier) {
      submission.email = loginIdentifier;
      submission.username = loginIdentifier;
      submission.login_identifier = loginIdentifier;
    }

    const { data } = await rawClient.post('/api/auth/operator/login/', submission);
    const tokens: SignInTokens = {
      access: data?.access ?? data?.access_token,
      refresh: data?.refresh ?? data?.refresh_token,
    };
    const hasTokens = Boolean(tokens.access && tokens.refresh);
    const responseUser = data?.user ? mapUser(data.user) : null;

    if (hasTokens) {
      await persistTokens(tokens);
      return { tokens, user: responseUser };
    }

    if (responseUser) {
      return { tokens: null, user: responseUser };
    }

    try {
      const profileResponse = await rawClient.get('/api/auth/profile/');
      return { tokens: null, user: mapUser(profileResponse.data) };
    } catch {
      await clearStoredTokens();
      const detail =
        extractMessageFromData(data) ??
        'No recibimos credenciales de acceso. Verifica tu cuenta o intenta nuevamente.';
      const error = new Error(detail);
      error.name = 'AuthError';
      throw error;
    }
  } catch (error) {
    await clearStoredTokens();
    const message = getErrorMessage(
      error,
      'No pudimos iniciar sesión. Verifica tus credenciales o intenta nuevamente.'
    );
    const authError = new Error(message);
    authError.name = 'AuthError';
    throw authError;
  }
};

export const signUp = async (payload: SignUpPayload): Promise<SignUpResult> => {
  const submission = {
    email: payload.email?.trim(),
    username: payload.username?.trim() || payload.email?.trim(),
    password1: payload.password1,
    password2: payload.password2,
    first_name: payload.first_name?.trim() || undefined,
    last_name: payload.last_name?.trim() || undefined,
  };

  const body = Object.fromEntries(
    Object.entries(submission).filter(([, value]) => value !== undefined && value !== '')
  );

  const { data } = await rawClient.post('/api/auth/operator/registration/', body);

  const tokens: SignInTokens = {
    access: data?.access ?? data?.access_token,
    refresh: data?.refresh ?? data?.refresh_token,
  };

  const hasTokens = Boolean(tokens.access && tokens.refresh);
  const detail: string | undefined = data?.detail;
  const requiresVerification =
    typeof detail === 'string' && detail.toLowerCase().includes('verification');

  return {
    detail,
    requiresVerification,
    tokens: hasTokens ? tokens : null,
  };
};

export const fetchCurrentUser = async (): Promise<OperatorUser> => {
  const { data } = await api.get('/api/auth/profile/');
  return mapUser(data);
};

export const updateAccountProfile = async (
  payload: Partial<Pick<OperatorUser, 'first_name' | 'last_name' | 'username'>>
): Promise<OperatorUser> => {
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => typeof value === 'string')
  );
  const { data } = await api.put('/api/auth/profile/', body);
  return mapUser(data);
};
