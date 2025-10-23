import { api } from './api';

const paymentsService = {
  async activatePlan({ listingId = null, planId = null, planKey = null, planTitle = null, sessionId = null, couponCode = null, source = null } = {}) {
    const payload = {
      listingId,
      planId,
      planKey,
      planTitle,
      sessionId,
      couponCode,
      source,
    };
    const response = await api.post('/payments/activate-plan/', payload);
    return response?.data ?? response;
  },

  async getMySubscription() {
    const response = await api.get('/payments/my-subscription/');
    return response?.data ?? response;
  },
};

export default paymentsService;
