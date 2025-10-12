import { api } from './api';

const unwrap = (response) => response?.data ?? null;

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value?.results && Array.isArray(value.results)) return value.results;
  return [];
};

const marketplaceService = {
  async fetchPlans() {
    const response = await api.get('/plans/');
    return ensureArray(unwrap(response));
  },

  async listMyProperties(params = {}) {
    const response = await api.get('/properties/my-properties/', { params });
    const data = unwrap(response);
    return {
      items: ensureArray(data),
      count: data?.count ?? ensureArray(data).length,
      raw: data,
    };
  },

  async fetchProperty(propertyId) {
    const response = await api.get(`/properties/${propertyId}/`);
    return unwrap(response);
  },

  async createProperty(payload) {
    const response = await api.post('/properties/', payload);
    return unwrap(response);
  },

  async updateProperty(propertyId, payload) {
    const response = await api.patch(`/properties/${propertyId}/`, payload);
    return unwrap(response);
  },

  async submitProperty(propertyId, payload = {}) {
    const response = await api.post(`/properties/${propertyId}/submit/`, payload);
    return unwrap(response);
  },

  async fetchStatusHistory(propertyId) {
    const response = await api.get(`/properties/${propertyId}/status-history/`);
    return ensureArray(unwrap(response));
  },

  async fetchStatusBar(propertyId) {
    const response = await api.get(`/properties/${propertyId}/status-bar/`);
    return unwrap(response);
  },

  async uploadPropertyDocument({ propertyId, file, docType, description }) {
    const formData = new FormData();
    formData.append('property', propertyId);
    formData.append('file', file);
    formData.append('doc_type', docType);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(response);
  },

  async deletePropertyDocument(documentId) {
    await api.delete(`/documents/${documentId}/`);
    return true;
  },
};

export default marketplaceService;
