import api from '../api';

const compareService = {
  add: async (propertyId) => {
    const response = await api.post('/compare/', { property_ids: [propertyId] });
    return response.data;
  },
  // You might add other methods like list, remove, etc., if needed
};

export default compareService;
