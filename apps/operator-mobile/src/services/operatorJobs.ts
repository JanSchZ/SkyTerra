import { api } from './apiClient';

export interface OperatorJobOffer {
  id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'canceled';
  ttl_seconds: number;
  wave: number;
  metadata?: Record<string, unknown>;
  remaining_seconds?: number;
  status_label?: string;
}

export interface OperatorJob {
  id: number;
  status: string;
  status_label: string;
  property_details?: {
    id: number;
    name: string;
    type?: string;
    size?: number;
  };
  plan_details?: {
    id: number;
    name: string;
  };
  price_amount?: number;
  pilot_payout_amount?: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  notes?: string;
  vendor_instructions?: string;
  offers?: OperatorJobOffer[];
  status_bar?: {
    substate_label?: string;
    percent?: number;
  };
  timeline?: Array<{
    id: number;
    kind: string;
    message: string;
    created_at: string;
  }>;
}

export interface PilotProfile {
  id: number;
  display_name: string;
  status: string;
  is_available: boolean;
  rating: number;
  score: number;
}

export const fetchPilotProfile = async (): Promise<PilotProfile> => {
  const { data } = await api.get('/api/pilot-profiles/me/');
  return data;
};

export const setAvailability = async (isAvailable: boolean) => {
  await api.post('/api/pilot-profiles/availability/', { is_available: isAvailable });
};

export const listAvailableJobs = async (): Promise<OperatorJob[]> => {
  const { data } = await api.get('/api/jobs/available/');
  return data ?? [];
};

export const listPilotJobs = async (): Promise<OperatorJob[]> => {
  const { data } = await api.get('/api/jobs/');
  return data ?? [];
};

export const fetchJob = async (jobId: number | string): Promise<OperatorJob> => {
  const { data } = await api.get(`/api/jobs/${jobId}/`);
  return data;
};

export const acceptOffer = async (offerId: number) => {
  await api.post(`/api/job-offers/${offerId}/accept/`);
};

export const declineOffer = async (offerId: number) => {
  await api.post(`/api/job-offers/${offerId}/decline/`);
};

export const scheduleJob = async (jobId: number | string, payload: { scheduled_start: string; scheduled_end: string }) => {
  await api.post(`/api/jobs/${jobId}/schedule/`, payload);
};

export const startFlight = async (jobId: number | string) => {
  await api.post(`/api/jobs/${jobId}/start-flight/`);
};

export const completeFlight = async (jobId: number | string) => {
  await api.post(`/api/jobs/${jobId}/complete-flight/`);
};
