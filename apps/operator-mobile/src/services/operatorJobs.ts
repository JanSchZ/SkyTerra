import { api } from './apiClient';

const ensureArray = <T>(input: unknown): T[] => {
  if (Array.isArray(input)) {
    return input as T[];
  }
  if (input && typeof input === 'object') {
    const candidate = input as { results?: unknown; data?: unknown; items?: unknown };
    if (Array.isArray(candidate.results)) return candidate.results as T[];
    if (Array.isArray(candidate.data)) return candidate.data as T[];
    if (Array.isArray(candidate.items)) return candidate.items as T[];
  }
  return [];
};

export interface OperatorJobOffer {
  id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'canceled';
  ttl_seconds: number;
  wave: number;
  metadata?: Record<string, unknown>;
  remaining_seconds?: number;
  status_label?: string;
}

export interface OperatorJobLocation {
  address_line?: string;
  formatted_address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  reference_point?: string;
}

export interface OperatorJobTravelEstimate {
  distance_km?: number;
  duration_minutes?: number;
  eta_text?: string;
}

export interface OperatorJobRequirement {
  id: number;
  title: string;
  description?: string;
  is_complete?: boolean;
  completed_at?: string | null;
}

export interface OperatorJobPayoutBreakdown {
  currency?: string;
  base_amount?: number;
  travel_bonus?: number;
  extras?: number;
  total?: number;
  notes?: string;
}

export interface OperatorJobDeliverables {
  status: 'pending' | 'processing' | 'submitted' | 'approved' | 'rejected';
  last_uploaded_at?: string | null;
  download_url?: string | null;
  notes?: string | null;
}

export interface OperatorJobContact {
  name?: string;
  phone?: string;
  email?: string;
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
  location?: OperatorJobLocation;
  travel_estimate?: OperatorJobTravelEstimate;
  requirements?: OperatorJobRequirement[];
  payout_breakdown?: OperatorJobPayoutBreakdown;
  deliverables?: OperatorJobDeliverables;
  contact?: OperatorJobContact;
}

export interface PilotDocument {
  id: number;
  type: 'id' | 'license' | 'insurance' | 'drone_registration' | string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  uploaded_at?: string | null;
  expires_at?: string | null;
  file_url?: string | null;
}

export interface PilotProfile {
  id: number;
  display_name: string;
  status: string;
  is_available: boolean;
  rating: number;
  score: number;
  phone_number?: string | null;
  base_city?: string | null;
  coverage_radius_km?: number | null;
  drone_model?: string | null;
  experience_years?: number | null;
  website?: string | null;
  portfolio_url?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  documents?: PilotDocument[];
  pending_requirements?: string[];
}

export const fetchPilotProfile = async (): Promise<PilotProfile> => {
  const { data } = await api.get('/api/pilot-profiles/me/');
  return data;
};

export const setAvailability = async (isAvailable: boolean): Promise<boolean> => {
  const { data } = await api.post('/api/pilot-profiles/availability/', { is_available: isAvailable });
  if (data && typeof data.is_available === 'boolean') {
    return data.is_available;
  }
  return isAvailable;
};

export const listAvailableJobs = async (): Promise<OperatorJob[]> => {
  const { data } = await api.get('/api/jobs/available/');
  return ensureArray<OperatorJob>(data);
};

export const listPilotJobs = async (): Promise<OperatorJob[]> => {
  const { data } = await api.get('/api/jobs/');
  return ensureArray<OperatorJob>(data);
};

export const fetchJob = async (jobId: number | string): Promise<OperatorJob> => {
  const { data } = await api.get(`/api/jobs/${jobId}/`);
  return data as OperatorJob;
};

export const acceptOffer = async (offerId: number) => {
  await api.post(`/api/job-offers/${offerId}/accept/`);
};

export const declineOffer = async (offerId: number) => {
  await api.post(`/api/job-offers/${offerId}/decline/`);
};

export const scheduleJob = async (
  jobId: number | string,
  payload: { scheduled_start: string; scheduled_end: string }
) => {
  await api.post(`/api/jobs/${jobId}/schedule/`, payload);
};

export const startFlight = async (jobId: number | string) => {
  await api.post(`/api/jobs/${jobId}/start-flight/`);
};

export const completeFlight = async (jobId: number | string) => {
  await api.post(`/api/jobs/${jobId}/complete-flight/`);
};

export const updateRequirementStatus = async (
  jobId: number | string,
  requirementId: number,
  isComplete: boolean
) => {
  const { data } = await api.patch(`/api/jobs/${jobId}/requirements/${requirementId}/`, {
    is_complete: isComplete,
  });
  return data as OperatorJobRequirement;
};

export interface DeliverableUploadPayload {
  uri: string;
  name: string;
  mimeType?: string;
  notes?: string;
}

export const uploadJobDeliverables = async (
  jobId: number | string,
  file: DeliverableUploadPayload
) => {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/zip',
  } as unknown as Blob);
  if (file.notes) {
    form.append('notes', file.notes);
  }
  const { data } = await api.post(`/api/jobs/${jobId}/deliverables/`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data as OperatorJobDeliverables;
};

export const updatePilotProfile = async (payload: Partial<PilotProfile>): Promise<PilotProfile> => {
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
  const { data } = await api.patch('/api/pilot-profiles/me/', body);
  return data as PilotProfile;
};

export interface PilotDocumentUploadPayload {
  type: PilotDocument['type'];
  file: DeliverableUploadPayload;
}

export const uploadPilotDocument = async (
  payload: PilotDocumentUploadPayload
): Promise<PilotDocument> => {
  const form = new FormData();
  form.append('type', payload.type);
  form.append('file', {
    uri: payload.file.uri,
    name: payload.file.name,
    type: payload.file.mimeType ?? 'application/pdf',
  } as unknown as Blob);

  const { data } = await api.post('/api/pilot-profiles/documents/', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data as PilotDocument;
};
