import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const apiBaseUrl = Constants?.expoConfig?.extra?.apiUrl || process.env.API_URL;

if (!apiBaseUrl) {
  console.warn('API_URL is not set. Define it in app.config or .env');
}

const ACCESS_TOKEN_KEY = 'skyterra-operator-access-token';
const REFRESH_TOKEN_KEY = 'skyterra-operator-refresh-token';
const LEGACY_REFRESH_KEY = 'refreshToken';

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

const rawClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
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

export interface OperatorUser {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}

export const signIn = async (payload: SignInPayload): Promise<SignInTokens> => {
  const { data } = await rawClient.post('/api/auth/login/', payload);
  const tokens: SignInTokens = {
    access: data?.access ?? data?.access_token,
    refresh: data?.refresh ?? data?.refresh_token,
  };
  if (!tokens.access || !tokens.refresh) {
    throw new Error('La respuesta de autenticacion no contiene tokens JWT.');
  }
  await persistTokens(tokens);
  return tokens;
};

export const fetchCurrentUser = async (): Promise<OperatorUser> => {
  const { data } = await api.get('/api/auth/profile/');
  return {
    id: data?.id ?? data?.pk ?? 0,
    email: data?.email ?? '',
    username: data?.username,
    first_name: data?.first_name,
    last_name: data?.last_name,
    is_staff: data?.is_staff,
  };
};
