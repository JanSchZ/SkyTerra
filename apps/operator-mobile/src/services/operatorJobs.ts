import { api } from './apiClient';

export interface OperatorJob {
  id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  property_address: string;
  scheduled_for: string;
  payout_amount: number;
  distance_km: number | null;
  notes?: string;
}

export interface JobActionPayload {
  jobId: string;
  note?: string;
  etaMinutes?: number;
}

export const listNearbyJobs = async (): Promise<OperatorJob[]> => {
  const { data } = await api.get('/api/operator/jobs/');
  return data?.results ?? data ?? [];
};

export const acceptJob = async ({ jobId, etaMinutes }: JobActionPayload) => {
  await api.post(`/api/operator/jobs/${jobId}/accept/`, { eta_minutes: etaMinutes });
};

export const startJob = async ({ jobId }: JobActionPayload) => {
  await api.post(`/api/operator/jobs/${jobId}/start/`);
};

export const completeJob = async ({ jobId, note }: JobActionPayload) => {
  await api.post(`/api/operator/jobs/${jobId}/complete/`, { note });
};

export const requestPresignedUpload = async (key: string, contentType: string) => {
  const { data } = await api.post('/api/media/presign-upload/', {
    key,
    content_type: contentType,
  });
  return data;
};
