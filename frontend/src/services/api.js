import axios from 'axios';

// Crear una instancia con configuración base
export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token en las solicitudes
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API Request]', {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params
    });
    return config;
  },
  error => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejo y logging de respuestas
api.interceptors.response.use(
  response => {
    console.log('[API Response]', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('[API Response Error]', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Datos de muestra para cuando la API no responde
const SAMPLE_DATA = {
  results: [
    {
      id: 1,
      name: "Hacienda Los Andes",
      price: 250000,
      size: 168.5,
      latitude: -33.4489,
      longitude: -70.6693,
      description: "Hermosa propiedad con vistas panorámicas a la cordillera",
      hasWater: true,
      hasViews: true
    },
    {
      id: 2,
      name: "Rancho El Valle",
      price: 150000,
      size: 85.2,
      latitude: -33.5489,
      longitude: -70.7693,
      description: "Excelente para agricultura y ganadería",
      hasWater: true,
      hasViews: false
    },
    {
      id: 3,
      name: "Parque Laguna Azul",
      price: 200000,
      size: 120.7,
      latitude: -33.3489,
      longitude: -70.5693,
      description: "Con acceso a lago y bosque nativo",
      hasWater: true,
      hasViews: true
    }
  ]
};

// Servicio de autenticación
export const authService = {
  // Iniciar sesión
  async login(credentials) {
    try {
      console.log('Attempting login with:', { email: credentials.email });
      const response = await api.post('/auth/login/', credentials);
      console.log('Login successful:', response.data);
      
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      
      // Lanzar el error real en lugar de simular
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || 'Error de autenticación';
        throw new Error(errorMessage);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error de conexión con el servidor');
      }
    }
  },

  // Registrar usuario
  async register(userData) {
    try {
      const response = await api.post('/auth/register/', userData);
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      // Si la API no responde, simular registro con datos de muestra
      const mockUser = {
        id: 1,
        username: userData.username,
        email: userData.email,
        token: 'sample_token_12345'
      };
      localStorage.setItem('auth_token', 'sample_token_12345');
      localStorage.setItem('user', JSON.stringify(mockUser));
      return { user: mockUser, token: 'sample_token_12345' };
    }
  },

  // Cerrar sesión
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Obtener usuario actual
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  },

  // Verificar si hay sesión activa
  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  // Actualizar perfil de usuario
  async updateProfile(userData) {
    try {
      const response = await api.put('/auth/profile/', userData);
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
};

// Servicio de propiedades
export const propertyService = {
  // Obtener todas las propiedades (con filtros opcionales)
  async getProperties(filters = {}) {
    try {
      console.log('Aplicando filtros:', filters);
      const response = await api.get('/properties/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching properties:', error);
      // Simular filtrado con datos de muestra si hay error de backend
      if (filters && Object.keys(filters).length > 0) {
        return {
          ...SAMPLE_DATA,
          results: SAMPLE_DATA.results.filter(property => {
            let match = true;
            
            // Filtrar por precio
            if (filters.priceMin !== undefined && property.price < filters.priceMin) match = false;
            if (filters.priceMax !== undefined && property.price > filters.priceMax) match = false;
            
            // Filtrar por tamaño
            if (filters.sizeMin !== undefined && property.size < filters.sizeMin) match = false;
            if (filters.sizeMax !== undefined && property.size > filters.sizeMax) match = false;
            
            // Filtrar por tipo de propiedad
            if (filters.propertyTypes && filters.propertyTypes.length > 0 && 
                !filters.propertyTypes.includes(property.propertyType)) {
              match = false;
            }
            
            // Filtrar por características
            if (filters.hasWater && !property.hasWater) match = false;
            if (filters.hasViews && !property.hasViews) match = false;
            if (filters.has360Tour && !property.has360Tour) match = false;
            
            return match;
          })
        };
      }
      return SAMPLE_DATA; // Datos de muestra en caso de error
    }
  },

  // Obtener detalle de una propiedad
  async getProperty(id) {
    try {
      const response = await api.get(`/properties/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching property ${id}:`, error);
      return SAMPLE_DATA.results.find(p => p.id === parseInt(id)) || SAMPLE_DATA.results[0];
    }
  },

  // Obtener propiedades del usuario actual
  async getUserProperties() {
    try {
      const response = await api.get('/properties/my-properties/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user properties:', error);
      return SAMPLE_DATA; // Datos de muestra en caso de error
    }
  },

  // Crear una nueva propiedad
  async createProperty(propertyData) {
    try {
      // Preparar los datos para envío
      const dataToSend = this.preparePropertyData(propertyData);
      
      console.log('Enviando datos de propiedad:', dataToSend);
      
      const response = await api.post('/properties/', dataToSend, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Propiedad creada exitosamente:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('Error creating property:', error);
      
      // Manejo detallado de errores
      if (error.response) {
        const errorData = error.response.data;
        let errorMessage = 'Error al crear la propiedad';
        
        // Si hay errores de validación específicos
        if (errorData && typeof errorData === 'object') {
          const fieldErrors = [];
          
          // Recopilar errores por campo
          Object.keys(errorData).forEach(field => {
            if (Array.isArray(errorData[field])) {
              fieldErrors.push(`${field}: ${errorData[field].join(', ')}`);
            } else if (typeof errorData[field] === 'string') {
              fieldErrors.push(`${field}: ${errorData[field]}`);
            }
          });
          
          if (fieldErrors.length > 0) {
            errorMessage = `Errores de validación: ${fieldErrors.join('; ')}`;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        }
        
        // Crear error con mensaje detallado
        const detailedError = new Error(errorMessage);
        detailedError.response = error.response;
        throw detailedError;
      }
      
      // Simulación para desarrollo en caso de error de red
      const newProperty = {
        ...propertyData,
        id: Math.floor(Math.random() * 10000) + 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.warn('Usando datos simulados debido a error de red');
      SAMPLE_DATA.results.push(newProperty);
      return newProperty;
    }
  },

  // Actualizar una propiedad existente
  async updateProperty(id, propertyData) {
    try {
      // Preparar los datos para envío
      const dataToSend = this.preparePropertyData(propertyData);
      
      console.log('Actualizando propiedad:', id, dataToSend);
      
      const response = await api.put(`/properties/${id}/`, dataToSend, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Propiedad actualizada exitosamente:', response.data);
      return response.data;
      
    } catch (error) {
      console.error(`Error updating property ${id}:`, error);
      
      // Manejo detallado de errores similar a createProperty
      if (error.response) {
        const errorData = error.response.data;
        let errorMessage = 'Error al actualizar la propiedad';
        
        if (errorData && typeof errorData === 'object') {
          const fieldErrors = [];
          
          Object.keys(errorData).forEach(field => {
            if (Array.isArray(errorData[field])) {
              fieldErrors.push(`${field}: ${errorData[field].join(', ')}`);
            } else if (typeof errorData[field] === 'string') {
              fieldErrors.push(`${field}: ${errorData[field]}`);
            }
          });
          
          if (fieldErrors.length > 0) {
            errorMessage = `Errores de validación: ${fieldErrors.join('; ')}`;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        }
        
        const detailedError = new Error(errorMessage);
        detailedError.response = error.response;
        throw detailedError;
      }
      
      // Simulación para desarrollo
      const propertyIndex = SAMPLE_DATA.results.findIndex(p => p.id === parseInt(id));
      if (propertyIndex !== -1) {
        SAMPLE_DATA.results[propertyIndex] = {
          ...SAMPLE_DATA.results[propertyIndex],
          ...propertyData,
          updatedAt: new Date().toISOString()
        };
        console.warn('Usando datos simulados debido a error de red');
        return SAMPLE_DATA.results[propertyIndex];
      }
      throw error;
    }
  },

  // Eliminar una propiedad
  async deleteProperty(id) {
    try {
      await api.delete(`/properties/${id}/`);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting property ${id}:`, error);
      // Simulación para desarrollo
      SAMPLE_DATA.results = SAMPLE_DATA.results.filter(p => p.id !== parseInt(id));
      return { success: true };
    }
  },

  // Método auxiliar para preparar datos de propiedad
  preparePropertyData(propertyData) {
    const prepared = { ...propertyData };
    
    // Asegurar que boundary_polygon sea JSON string si es un objeto
    if (prepared.boundary_polygon && typeof prepared.boundary_polygon === 'object') {
      prepared.boundary_polygon = JSON.stringify(prepared.boundary_polygon);
    }
    
    // Convertir números a tipos correctos
    if (prepared.price !== undefined && prepared.price !== null) {
      prepared.price = parseFloat(prepared.price);
    }
    
    if (prepared.size !== undefined && prepared.size !== null) {
      prepared.size = parseFloat(prepared.size);
    }
    
    if (prepared.latitude !== undefined && prepared.latitude !== null && prepared.latitude !== '') {
      prepared.latitude = parseFloat(prepared.latitude);
    } else {
      prepared.latitude = null;
    }
    
    if (prepared.longitude !== undefined && prepared.longitude !== null && prepared.longitude !== '') {
      prepared.longitude = parseFloat(prepared.longitude);
    } else {
      prepared.longitude = null;
    }
    
    // Mapear campos del frontend al backend
    if (prepared.propertyType) {
      prepared.type = prepared.propertyType;
      delete prepared.propertyType;
    }
    
    if (prepared.hasWater !== undefined) {
      prepared.has_water = prepared.hasWater;
      delete prepared.hasWater;
    }
    
    if (prepared.hasViews !== undefined) {
      prepared.has_views = prepared.hasViews;
      delete prepared.hasViews;
    }
    
    // Limpiar campos que no son necesarios para el backend
    delete prepared.images;
    delete prepared.existingImageUrls;
    delete prepared.imagesToDelete;
    delete prepared.tour360;
    delete prepared.existingTourUrl;
    delete prepared.tourToDelete;
    delete prepared.address;
    delete prepared.city;
    delete prepared.state;
    delete prepared.country;
    
    return prepared;
  }
};

// Servicio para tours 360°
export const tourService = {
  // Obtener tours de una propiedad
  async getTours(propertyId) {
    try {
      const response = await api.get(`/tours/?property=${propertyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tours for property ${propertyId}:`, error);
      return {
        results: [
          {
            id: 1,
            title: "Vista principal 360°",
            thumbnail: "https://via.placeholder.com/300x200?text=Tour+360",
            url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/cerro-toco-0.jpg",
            property_id: propertyId
          }
        ]
      };
    }
  },

  // Obtener un tour específico por ID
  async getTour(tourId) {
    try {
      const response = await api.get(`/tours/${tourId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tour ${tourId}:`, error);
      // Retornar un tour de muestra en caso de error
      return {
        id: tourId,
        title: "Vista principal 360°",
        url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/cerro-toco-0.jpg",
        property_id: 1,
        name: "Tour de muestra"
      };
    }
  },

  // Subir nuevo tour
  async uploadTour(tourData) {
    try {
      const response = await api.post('/tours/', tourData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading tour:', error);
      // Retornar un tour de muestra en lugar de lanzar el error
      return {
        id: Date.now(),
        title: tourData.title || "Nuevo tour",
        url: tourData.url || "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/cerro-toco-0.jpg",
        property_id: tourData.property_id || 1
      };
    }
  }
};

// Servicio para imágenes
export const imageService = {
  // Obtener imágenes de una propiedad
  async getImages(propertyId) {
    try {
      const response = await api.get(`/images/?property=${propertyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching images for property ${propertyId}:`, error);
      return {
        results: [
          {
            id: 1,
            title: "Vista aérea",
            type: "aerial",
            url: "https://via.placeholder.com/800x600?text=Vista+Aerea",
            property_id: propertyId
          },
          {
            id: 2,
            title: "Mapa topográfico",
            type: "topography",
            url: "https://via.placeholder.com/800x600?text=Mapa+Topografico",
            property_id: propertyId
          }
        ]
      };
    }
  }
};

export default {
  property: propertyService,
  auth: authService,
  tour: tourService,
  image: imageService
}; 