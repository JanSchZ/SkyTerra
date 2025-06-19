import axios from 'axios';

// Configuración dinámica de la URL base
const getBaseURL = () => {
  const hostname = window.location.hostname;
  const origin = window.location.origin;
  
  console.log('🔍 Detectando entorno:', { hostname, origin, protocol: window.location.protocol, port: window.location.port });
  
  // Si estamos en Codespaces, usar la URL del Codespace
  if (hostname.includes('github.dev') || hostname.includes('codespaces.io')) {
    // Para Codespaces, reemplazar el puerto del frontend (5173) por el del backend (8000)
    const backendUrl = origin.replace(/:\d+/, ':8000');
    console.log('🚀 Configurando para Codespaces:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }
  
  // Para desarrollo local, usar localhost directamente
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const backendUrl = 'http://localhost:8000/api';
    console.log('💻 Configurando para localhost:', backendUrl);
    return backendUrl;
  }
  
  // Detect if we're on a dedicated frontend sub-domain (e.g. app.skyterra.cl) and map to the
  // corresponding API sub-domain (e.g. api.skyterra.cl). This prevents requests from being
  // sent to the same origin (which would 404 when the backend lives elsewhere).
  if (hostname.startsWith('app.')) {
    const backendHost = hostname.replace(/^app\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    console.log('🌐 Configurando para sub-dominio app.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }
  
  // Similar mapping for "www." → "api." (in case the frontend is served from www.domain)
  if (hostname.startsWith('www.')) {
    const backendHost = hostname.replace(/^www\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    console.log('🌐 Configurando para sub-dominio www.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }
  
  // Para producción u otros entornos donde backend y frontend comparten dominio raíz,
  // asumimos que el backend está disponible en la misma raíz bajo /api.
  console.log('🌐 Configurando para producción (misma raíz):', '/api');
  return '/api';
};

// Crear una instancia con configuración base
const baseURL = getBaseURL();
console.log('🔧 API configurada con baseURL:', baseURL);

export const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token en las solicitudes
api.interceptors.request.use(
  config => {
    // Ya no es necesario añadir el token manualmente, las cookies se envían automáticamente.
    console.log('🌐 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
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
      console.log('Attempting login with:', { login_identifier: credentials.login_identifier });
      const response = await api.post('/auth/login/', credentials);
      console.log('Login successful, user data received:', response.data);
      
      // El token JWT se establece en una cookie HttpOnly por el backend.
      // Solo guardamos los datos del usuario en localStorage.
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
      console.log('🔄 Intentando registrar usuario:', { 
        email: userData.email, 
        username: userData.username,
        hasPassword: !!userData.password 
      });
      
      const response = await api.post('/auth/registration/', userData);
      console.log('✅ Registro exitoso:', response.data);
      
      // El backend manejará el login después del registro y enviará la cookie.
      // Guardamos los datos del usuario.
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ Error during registration:', error);
      
      // Manejo detallado de errores de respuesta
      if (error.response) {
        console.error('Response error details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Si hay datos específicos de error
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            throw new Error(error.response.data);
          } else if (error.response.data.error) {
            throw new Error(error.response.data.error);
          } else {
            // Combinar todos los errores de validación
            const errorMessages = Object.entries(error.response.data)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                }
                return `${field}: ${messages}`;
              })
              .join('; ');
            throw new Error(errorMessages || 'Error en el registro.');
          }
        }
      } else if (error.request) {
        console.error('Network error:', error.request);
        throw new Error('Error de conexión con el servidor. Verifica tu conexión a internet.');
      } else {
        console.error('Setup error:', error.message);
        throw new Error(error.message || 'Error desconocido durante el registro.');
      }
    }
  },

  // Iniciar sesión con Google
  async googleLogin(token) {
    try {
      console.log('🔄 Intentando iniciar sesión con Google con ID token');
      const response = await api.post('/auth/google/', { access_token: token });
      console.log('✅ Inicio de sesión con Google exitoso:', response.data);
      
      // El token JWT se establece en una cookie HttpOnly.
      // Solo guardamos los datos del usuario.
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ Error durante el inicio de sesión con Google:', error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || 'Error de autenticación con Google';
        throw new Error(errorMessage);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error de conexión con el servidor');
      }
    }
  },

  // Iniciar sesión con X (anteriormente Twitter)
  async xLogin(authData) {
    try {
      console.log('🔄 Intentando iniciar sesión con X');
      const response = await api.post('/auth/twitter/', { // El endpoint del backend sigue siendo 'twitter'
        access_token: authData.oauth_token,
        token_secret: authData.oauth_token_secret, 
      });
      console.log('✅ Inicio de sesión con X exitoso:', response.data);
      
      const user = response.data.user || response.data;
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.error('❌ Error durante el inicio de sesión con X:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                           error.response?.data?.error || 
                           'Error de autenticación con X';
      throw new Error(errorMessage);
    }
  },

  // Iniciar sesión con Apple
  async appleLogin(authData) {
    try {
      console.log('🔄 Intentando iniciar sesión con Apple');
      // 'code' es el token de autorización de Apple
      const response = await api.post('/auth/apple/', {
        code: authData.authorization.code,
        id_token: authData.authorization.id_token,
      });
      console.log('✅ Inicio de sesión con Apple exitoso:', response.data);
      
      const user = response.data.user || response.data;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Si Apple proporciona datos del usuario (solo la primera vez), podemos usarlos
      if (authData.user) {
        // Podrías enviar estos datos a una API para actualizar el perfil del usuario
        console.log('🍏 Datos del usuario de Apple:', authData.user);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Error durante el inicio de sesión con Apple:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                           error.response?.data?.error || 
                           'Error de autenticación con Apple';
      throw new Error(errorMessage);
    }
  },

  // Cerrar sesión
  async logout() {
    try {
      // Llama al endpoint de logout del backend para invalidar el token/cookie.
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpia el estado del frontend independientemente del resultado del backend.
      localStorage.removeItem('user');
      // No necesitamos quitar 'auth_token' porque ya no lo usamos.
    }
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

  // NUEVA FUNCIÓN PARA OBTENER PROPIEDADES PAGINADAS
  async getPaginatedProperties(page = 1, filters = {}) {
    try {
      const params = { ...filters, page };
      console.log('Fetching paginated properties with params:', params);
      const response = await api.get('/properties/', { params });
      // La respuesta de DRF con PageNumberPagination incluye:
      // response.data.count
      // response.data.next (URL or null)
      // response.data.previous (URL or null)
      // response.data.results (array of items)
      return response.data; 
    } catch (error) {
      console.error('Error fetching paginated properties:', error);
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
      const isFormData = typeof FormData !== 'undefined' && propertyData instanceof FormData;
      const dataToSend = isFormData ? propertyData : this.preparePropertyData(propertyData);
      console.log('Enviando datos de propiedad:', dataToSend);

      const response = await api.post('/properties/', dataToSend, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
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
      const isFormData = typeof FormData !== 'undefined' && propertyData instanceof FormData;
      const dataToSend = isFormData ? propertyData : this.preparePropertyData(propertyData, true);

      console.log(`Actualizando propiedad ${id} con datos:`, dataToSend);

      const response = await api.put(`/properties/${id}/`, dataToSend, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
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
    
    if (prepared.listingType) {
      prepared.listing_type = prepared.listingType;
      delete prepared.listingType;
    }
    if (prepared.rentPrice !== undefined) {
      if (prepared.rentPrice === '') prepared.rentPrice = null;
      if (prepared.rentPrice !== null) prepared.rent_price = parseFloat(prepared.rentPrice);
      delete prepared.rentPrice;
    }
    if (prepared.rentalTerms !== undefined) {
      prepared.rental_terms = prepared.rentalTerms;
      delete prepared.rentalTerms;
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
  },

  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard/stats/');
    return response.data;
  },

  getPlanMetrics: async () => {
    const response = await api.get('/api/admin/dashboard/plan-metrics/');
    return response.data;
  },
};

// Servicio para tours 360°
export const tourService = {
  // Obtener tours de una propiedad
  async getTours(propertyId) {
    try {
      // Traemos todos los tours asociados a la propiedad, sin filtrar por tipo en la solicitud.
      // El filtrado se hará posteriormente en el cliente para descartar placeholders o tours de prueba.
      const response = await api.get(`/tours/?property=${propertyId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching tours for property ${propertyId}:`, error);
      return { results: [] };
    }
  },

  // Obtener un tour específico por ID
  async getTour(tourId) {
    try {
      const response = await api.get(`/tours/${tourId}/`);
      const tour = response.data;
      
      // Validar que el tour sea válido y no sea un tour de prueba o placeholder
      if (!tour || !tour.url ||
          tour.url.includes('placeholder') || tour.url.includes('test')) {
        throw new Error('Invalid tour');
      }
      
      return tour;
    } catch (error) {
      console.error(`Error fetching tour ${tourId}:`, error);
      throw error;
    }
  },

  // Subir nuevo tour
  async uploadTour(tourData) {
    try {
      const token = localStorage.getItem('auth_token');
      const axiosConfig = {
        headers: {
          ...(token ? { Authorization: `Token ${token}` } : {})
        }
      };
      const response = await axios.post(`${baseURL}/tours/`, tourData, axiosConfig);
      return response.data;
    } catch (error) {
      console.error('Error uploading tour:', error);
      throw error;
    }
  },

  async getPropertyTours(propertyId) {
    const data = await this.getTours(propertyId);
    // `data` puede venir como { results: [...] } (paginado) o como lista directa.
    let arr = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    
    // Aceptamos cualquier tour que tenga URL válida
    arr = arr.filter(tour => typeof tour.url === 'string' && tour.url.trim() !== '');
    
    // Ordenar por fecha de subida (uploaded_at) descendente
    arr.sort((a, b) => {
      const dateA = new Date(a.uploaded_at || a.created_at || 0).getTime();
      const dateB = new Date(b.uploaded_at || b.created_at || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const idA = typeof a.id === 'number' ? a.id : parseInt(a.id, 10);
      const idB = typeof b.id === 'number' ? b.id : parseInt(b.id, 10);
      if (!isNaN(idA) && !isNaN(idB)) return idB - idA;
      return 0;
    });
    
    // Asegurar URLs absolutas
    arr = arr.map((t) => ({ ...t, url: makeAbsoluteUrl(t.url) }));
    
    return arr;
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
            title: 'Vista aérea',
            type: 'aerial',
            url: 'https://via.placeholder.com/800x600?text=Vista+Aerea',
            property_id: propertyId,
          },
          {
            id: 2,
            title: 'Mapa topográfico',
            type: 'topography',
            url: 'https://via.placeholder.com/800x600?text=Mapa+Topografico',
            property_id: propertyId,
          },
        ],
      };
    }
  },
};

// ---------------------
// Saved Search Service
// ---------------------
export const savedSearchService = {
  async getAll() {
    const resp = await api.get('/saved-searches/');
    return resp.data;
  },
  async create(payload) {
    const resp = await api.post('/saved-searches/', payload);
    return resp.data;
  },
  async update(id, payload) {
    const resp = await api.patch(`/saved-searches/${id}/`, payload);
    return resp.data;
  },
  async delete(id) {
    await api.delete(`/saved-searches/${id}/`);
  },
};

// ---------------------
// Favorites Service
// ---------------------
export const favoritesService = {
  async list() {
    const resp = await api.get('/favorites/');
    return resp.data.results || resp.data;
  },
  async add(propertyId) {
    return (await api.post('/favorites/', { property: propertyId })).data;
  },
  async remove(favoriteId) {
    return (await api.delete(`/favorites/${favoriteId}/`)).data;
  },
  async removeByProperty(propertyId) {
    const favs = await favoritesService.list();
    const fav = favs.find((f) => f.property === propertyId);
    if (fav) return favoritesService.remove(fav.id);
  },
};

const makeAbsoluteUrl = (partialUrl) => {
  if (!partialUrl) return partialUrl;
  if (partialUrl.startsWith('http://') || partialUrl.startsWith('https://')) return partialUrl;
  // Ensure leading slash
  const path = partialUrl.startsWith('/') ? partialUrl : `/${partialUrl}`;
  // Remove trailing '/api' from baseURL if present
  const root = baseURL.replace(/\/api$/, '');
  return `${root}${path}`;
};

export default {
  property: propertyService,
  auth: authService,
  tour: tourService,
  image: imageService,
  savedSearch: savedSearchService,
  favorites: favoritesService,
};