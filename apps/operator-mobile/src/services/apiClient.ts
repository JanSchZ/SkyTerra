import axios from 'axios';
import Constants from 'expo-constants';

const apiBaseUrl = Constants?.expoConfig?.extra?.apiUrl || process.env.API_URL;

if (!apiBaseUrl) {
  console.warn('API_URL is not set. Define it in app.config or .env');
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInResponse {
  refreshToken: string;
}

export interface OperatorUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export const signIn = async (payload: SignInPayload): Promise<SignInResponse> => {
  const { data } = await api.post('/api/auth/login/', payload);
  return {
    refreshToken: data?.refresh_token,
  };
};

export const fetchCurrentUser = async (): Promise<OperatorUser> => {
  const { data } = await api.get('/api/auth/profile/');
  return data;
};
