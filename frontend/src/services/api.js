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
    const token = localStorage.getItem('auth_token');
    
    // Siempre enviar el token si está disponible. 
    // El backend determinará si es necesario y si el usuario tiene los permisos adecuados.
    if (token) {
      config.headers.Authorization = `Token ${token}`;
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

    // Manejo global de error 401: limpiar localStorage y redirigir a login
    if (error.response && error.response.status === 401) {
      // Evitar bucles de redirección si ya estamos en /login o la petición es de login
      const isLoginAttempt = error.config?.url?.endsWith('/auth/login/');
      const isCurrentlyOnLoginPage = window.location.pathname === '/login';

      if (!isLoginAttempt && !isCurrentlyOnLoginPage) {
        console.warn('[401 Unauthorized]', 'Token inválido o expirado. Limpiando sesión y redirigiendo a login.');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Para asegurar que la redirección ocurra después de que el estado se actualice
        // y evitar problemas con el router dentro del interceptor, usamos un pequeño delay.
        // Idealmente, esto se manejaría con un sistema de pub/sub o un estado global
        // que indique que la sesión ha expirado y los componentes reaccionen a ello.
        setTimeout(() => {
          // Asegurarse de que solo redirigimos si no estamos ya en login
          if (window.location.pathname !== '/login') {
             window.location.href = '/login'; // Redirección completa para limpiar estado de la app
          }
        }, 100);
      } else if (isLoginAttempt) {
        console.error('[Login Failed]', 'Intento de login fallido con 401.', error.response.data);
      }
    }

    return Promise.reject(error);
  }
);

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
      // Lanzar el error real en lugar de simular
      if (error.response && error.response.data) {
        const errorMessages = Object.values(error.response.data).flat().join(' ');
        throw new Error(errorMessages || 'Error en el registro.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error de conexión con el servidor durante el registro.');
      }
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
  // Para admin, el backend ya devuelve todas si el token es de un staff user.
  async getProperties(filters = {}) {
    try {
      console.log('Aplicando filtros:', filters);
      const response = await api.get('/properties/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching properties:', error);
      // Propagar el error para que el componente lo maneje
      throw error;
    }
  },

  // Obtener detalle de una propiedad
  async getProperty(id) {
    try {
      const response = await api.get(`/properties/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching property ${id}:`, error);
      // Propagar el error
      throw error;
    }
  },

  // Obtener detalle de una propiedad para edición
  async getPropertyDetails(id) {
    try {
      const response = await api.get(`/properties/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching property details ${id}:`, error);
      throw error;
    }
  },

  // Obtener propiedades del usuario actual
  async getUserProperties() {
    try {
      const response = await api.get('/properties/my-properties/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user properties:', error);
      throw error; // Lanzar error para que el componente pueda manejarlo
    }
  },

  // Crear nueva propiedad
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
      
      // Si no es un error de respuesta HTTP (ej. error de red), relanzar el original
      throw error;
    }
  },

  // Actualizar datos y/o imágenes de una propiedad
  async updateProperty(id, propertyData) {
    try {
      // Preparar los datos para envío
      const dataToSend = this.preparePropertyData(propertyData, true); // true para indicar que es update
      
      console.log(`Actualizando propiedad ${id} con datos:`, dataToSend);

      const response = await api.put(`/properties/${id}/`, dataToSend, {
        headers: {
          'Content-Type': 'application/json' 
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating property ${id}:`, error);
      // Propagar el error con más detalles si es posible
      if (error.response && error.response.data) {
        const errorMessages = Object.values(error.response.data).flat().join(' ');
        throw new Error(errorMessages || 'Error al actualizar la propiedad.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error de conexión con el servidor al actualizar la propiedad.');
      }
    }
  },

  // Nueva función para que el admin cambie el estado de publicación
  async setPropertyStatus(propertyId, publicationStatus) {
    try {
      console.log(`Admin: Setting property ${propertyId} status to ${publicationStatus}`);
      const response = await api.post(`/properties/${propertyId}/set-status/`, { status: publicationStatus });
      console.log('Set property status successful:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error setting property ${propertyId} status to ${publicationStatus}:`, error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || error.response.data.detail || 'Error al cambiar el estado de la propiedad.';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  // Eliminar una propiedad
  async deleteProperty(id) {
    try {
      await api.delete(`/properties/${id}/`);
      return { success: true }; // Mantener esto para que el Dashboard funcione como espera
    } catch (error) {
      console.error(`Error deleting property ${id}:`, error);
      // Propagar el error
      throw error;
    }
  },

  // Método auxiliar para preparar datos de propiedad
  preparePropertyData(propertyData, isUpdate = false) {
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