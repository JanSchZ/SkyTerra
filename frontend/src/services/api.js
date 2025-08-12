import axios from 'axios';
import compareService from './api/compareService';

// Configuración dinámica de la URL base
const getBaseURL = () => {
  const hostname = window.location.hostname;
  const origin = window.location.origin;

  if (import.meta.env.MODE === 'development') {
    console.log('🔍 Detectando entorno:', { hostname, origin, protocol: window.location.protocol, port: window.location.port });
  }

  // 1) Desarrollo local: SIEMPRE usa el proxy de Vite para evitar CORS
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (import.meta.env.MODE === 'development') console.log('💻 Desarrollo local: usando proxy /api (ignora VITE_API_BASE_URL)');
    return '/api';
  }

  // 2) Codespaces
  if (hostname.includes('github.dev') || hostname.includes('codespaces.io')) {
    const backendUrl = origin.replace(/:\d+/, ':8000');
    if (import.meta.env.MODE === 'development') console.log('🚀 Configurando para Codespaces:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 3) app.* → api.*
  if (hostname.startsWith('app.')) {
    const backendHost = hostname.replace(/^app\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    if (import.meta.env.MODE === 'development') console.log('🌐 Configurando para sub-dominio app.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 4) www.* → api.*
  if (hostname.startsWith('www.')) {
    const backendHost = hostname.replace(/^www\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    if (import.meta.env.MODE === 'development') console.log('🌐 Configurando para sub-dominio www.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 5) Producción misma raíz o fallback
  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) return envBase;
  if (import.meta.env.MODE === 'development') console.log('🌐 Producción/Fallback: /api');
  return '/api';
};

// Crear una instancia con configuración base (regla: en local -> proxy /api)
const baseURL = getBaseURL();
  if (import.meta.env.MODE === 'development') console.debug('🔧 API configurada con baseURL:', baseURL);

export const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Importante para enviar cookies en solicitudes de origen cruzado
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

// Interceptor para añadir token en las solicitudes
api.interceptors.request.use(
  config => {
    // Debug: verificar cookies JWT antes de cada request
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    const hasJwtToken = cookies['jwt-access-token'];
    const hasCsrfToken = cookies['csrftoken'];
    
    if (import.meta.env.MODE === 'development') console.debug('🌐 [API Request]', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      cookies: {
        hasJwtToken: !!hasJwtToken,
        hasCsrfToken: !!hasCsrfToken,
        jwtTokenLength: hasJwtToken ? hasJwtToken.length : 0,
        csrfTokenLength: hasCsrfToken ? hasCsrfToken.length : 0
      },
      withCredentials: config.withCredentials
    });
    
    return config;
  },
  error => {
    console.error('[API Request Error]', error?.message || error);
    return Promise.reject(error);
  }
);

// Interceptor para manejo y logging de respuestas
api.interceptors.response.use(
  response => {
    if (import.meta.env.MODE === 'development') console.debug('[API Response]', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('[API Response Error]', error?.message || error);

    // Manejo global de 401 sin redirigir agresivamente
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isLoginAttempt = url.endsWith('/auth/login/');
      const isAuthCheck = url.endsWith('/auth/user/');

      // Si la verificación explícita de sesión falla, limpiamos el usuario en caché.
      if (isAuthCheck) {
        localStorage.removeItem('user');
        // Notificar al resto de la app que la sesión ya no es válida
        try { window.dispatchEvent(new CustomEvent('auth:invalid')); } catch (_) {}
      }

      // No redirigimos automáticamente. Dejamos que las rutas protegidas gestionen la navegación.
      if (isLoginAttempt) {
        console.warn('[Login Failed] 401');
      }
    }

    return Promise.reject(error);
  }
);

// Servicio de autenticación
export const authService = {
  // Garantiza que exista la cookie CSRF para peticiones POST/PUT en modo JWT con cookies
  async ensureCsrfCookie() {
    try {
      await api.get('/auth/csrf/');
    } catch (e) {
      // Silencioso: en desarrollo puede no ser crítico si ya existe
      console.warn('No se pudo inicializar CSRF (posiblemente ya existe):', e?.response?.status || e?.message);
    }
  },
  // Iniciar sesión
  async login(credentials) {
    try {
      await this.ensureCsrfCookie();
      const response = await api.post('/auth/login/', credentials);

      // Tras login, pide el usuario para confirmar que las cookies se guardaron
      try {
        const whoami = await api.get('/auth/user/');
        if (whoami?.data) {
          localStorage.setItem('user', JSON.stringify(whoami.data));
          return { user: whoami.data };
        }
      } catch (e) {
        console.warn('Login OK pero /auth/user/ falló. Manteniendo datos de respuesta directa.');
      }

      // Fallback: si el backend devolvió user en el body
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      
      // Lanzar el error real en lugar de simular
      if (error.response && error.response.data) {
        let errorMessage = 'Error de autenticación';
        if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors[0];
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else {
          // Si hay errores de campo específicos, combinarlos
          const fieldErrors = Object.values(error.response.data).flat().join('; ');
          if (fieldErrors) {
            errorMessage = fieldErrors;
          }
        }
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
  async googleLogin(googleResponse) {
    try {
      // googleResponse puede ser:
      // - { code: '...' } cuando usamos flow="auth-code"
      // - { credential: 'id_token' } para One Tap
      // - string directamente (token)
      let payload = {};
      if (typeof googleResponse === 'string') {
        // heurística: si parece JWT, enviarlo como id_token
        if (googleResponse.startsWith('eyJ')) payload = { id_token: googleResponse };
        else payload = { access_token: googleResponse };
      } else if (googleResponse?.code) {
        payload = { code: googleResponse.code };
      } else if (googleResponse?.credential) {
        payload = { id_token: googleResponse.credential };
      } else {
        throw new Error('Respuesta de Google inválida');
      }

      console.log('🔄 Intentando iniciar sesión con Google con payload:', Object.keys(payload));
      await this.ensureCsrfCookie();
      const response = await api.post('/auth/google/', payload);
      // Refrescar datos del usuario desde /auth/user/
      try {
        const whoami = await api.get('/auth/user/');
        if (whoami?.data) {
          localStorage.setItem('user', JSON.stringify(whoami.data));
          return { user: whoami.data };
        }
      } catch (_) {}
      if (response.data?.user) localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('❌ Error durante el inicio de sesión con Google:', error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || error.response.data.detail || error.response.data.non_field_errors?.[0] || 'Error de autenticación con Google';
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
      await this.ensureCsrfCookie();
      const response = await api.post('/auth/twitter/', { // El endpoint del backend sigue siendo 'twitter'
        access_token: authData.oauth_token,
        token_secret: authData.oauth_token_secret, 
      });
      try {
        const whoami = await api.get('/auth/user/');
        if (whoami?.data) {
          localStorage.setItem('user', JSON.stringify(whoami.data));
          return { user: whoami.data };
        }
      } catch (_) {}
      const fallbackUser = response.data.user || response.data;
      localStorage.setItem('user', JSON.stringify(fallbackUser));
      return response.data;
    } catch (error) {
      console.error('❌ Error durante el inicio de sesión con X:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                           error.response?.data?.error || 
                           error.response?.data?.detail ||
                           'Error de autenticación con X';
      throw new Error(errorMessage);
    }
  },

  // Iniciar sesión con Apple
  async appleLogin(authData) {
    try {
      console.log('🔄 Intentando iniciar sesión con Apple');
      // 'code' es el token de autorización de Apple
      await this.ensureCsrfCookie();
      const response = await api.post('/auth/apple/', {
        code: authData.authorization.code,
        id_token: authData.authorization.id_token,
      });
      // Refrescar usuario desde /auth/user/
      try {
        const whoami = await api.get('/auth/user/');
        if (whoami?.data) {
          localStorage.setItem('user', JSON.stringify(whoami.data));
        }
      } catch (_) {}
      const user = response.data.user || response.data;
      if (user) localStorage.setItem('user', JSON.stringify(user));

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
  async getCurrentUser() {
    try {
      // Siempre verificar con el backend para asegurar que la sesión JWT sigue siendo válida
      const response = await api.get('/auth/user/');
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch (error) {
      // Si hay error 401, la sesión no es válida
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        return null;
      }
      // Para otros errores, intentar usar el usuario en caché como fallback
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          localStorage.removeItem('user');
        }
      }
      return null;
    }
  },

  // Verificar el estado de autenticación con el backend
  async checkAuthStatus() {
    // Primero verificar si hay un usuario en localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      // No hay usuario guardado, no hacer llamada al backend
      return null;
    }
    
    try {
      const response = await api.get('/auth/user/'); // Endpoint para obtener detalles del usuario actual
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch (error) {
      // Si hay error 401, no mostrar como error en consola ya que es esperado cuando no hay sesión
      if (error.response?.status !== 401) {
        console.error('Error checking auth status:', error);
      }
      localStorage.removeItem('user'); // Limpiar si la sesión no es válida
      return null;
    }
  },

  // Verificar si hay sesión activa
  isAuthenticated() {
    const userStr = localStorage.getItem('user');
    return !!userStr;
  },

  // Obtener usuario del localStorage sin llamada al backend (función helper simple)
  getStoredUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch (error) {
      console.warn('Error parsing stored user:', error);
      return null;
    }
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
  },

  // Solicitar restablecimiento de contraseña
  async requestPasswordReset(email) {
    try {
      console.log('🔄 Solicitando restablecimiento de contraseña para:', email);
      const response = await api.post('/auth/password/reset/', { email });
      console.log('✅ Solicitud de restablecimiento de contraseña exitosa:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error durante la solicitud de restablecimiento de contraseña:', error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.email?.[0] || error.response.data.detail || 'Error al solicitar restablecimiento de contraseña.';
        throw new Error(errorMessage);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error de conexión con el servidor.');
      }
    }
  },

  // Método para obtener la URL base de la API
  getBaseURL() {
    return baseURL;
  },
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
      const dataToSend = this.preparePropertyData(propertyData);
      console.log('Enviando datos de propiedad para creación:', dataToSend);

      const response = await api.post('/properties/', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      const dataToSend = this.preparePropertyData(propertyData, true);

      console.log(`Actualizando propiedad ${id} con datos:`, dataToSend);

      const response = await api.put(`/properties/${id}/`, dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
  preparePropertyData(propertyData) {
    const dataToSend = new FormData();

    Object.keys(propertyData).forEach(key => {
      if (key === 'images' || key === 'imagesToDelete' || key === 'boundary_polygon' || key === 'tour360' || key === 'documents' || key === 'utilities') {
        // Handle these special cases below
      } else if (propertyData[key] !== null && propertyData[key] !== undefined) {
        dataToSend.append(key, propertyData[key]);
      }
    });

    // Handle images
    propertyData.images.forEach(file => dataToSend.append('new_images', file));
    if (propertyData.imagesToDelete.length > 0) {
      dataToSend.append('images_to_delete_ids', JSON.stringify(propertyData.imagesToDelete));
    }

    // Handle boundary_polygon
    if (propertyData.boundary_polygon) {
      dataToSend.append('boundary_polygon', JSON.stringify(propertyData.boundary_polygon.geojson || propertyData.boundary_polygon));
    }

    // Handle tour360
    if (propertyData.tour360) {
      dataToSend.append('new_tour_file', propertyData.tour360);
    }
    if (propertyData.tourToDelete && propertyData.existingTourId) {
      dataToSend.append('tour_to_delete_id', propertyData.existingTourId);
    }

    // Handle documents
    propertyData.documents.forEach(file => dataToSend.append('new_documents', file));

    // Handle new fields
    if (propertyData.terrain) {
      dataToSend.append('terrain', propertyData.terrain);
    }
    if (propertyData.access) {
      dataToSend.append('access', propertyData.access);
    }
    if (propertyData.legalStatus) {
      dataToSend.append('legal_status', propertyData.legalStatus); // Map frontend name to backend name
    }
    if (propertyData.utilities && propertyData.utilities.length > 0) {
      dataToSend.append('utilities', JSON.stringify(propertyData.utilities));
    }

    return dataToSend;
  },

  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats/');
    return response.data;
  },

  getPlanMetrics: async () => {
    const response = await api.get('/admin/dashboard/plan-metrics/');
    return response.data;
  },
};

// Servicio para la administración de Sam (IA)
export const aiManagementService = {
  // Obtener el estado y los logs de Sam
  async getStatus() {
    const response = await api.get('/sam/status/');
    return response.data;
  },

  // Obtener los modelos de IA configurados
  async getModels() {
    const response = await api.get('/sam/models/');
    return response.data;
  },

  // Crear un nuevo modelo de IA
  async createModel(modelData) {
    const response = await api.post('/sam/models/', modelData);
    return response.data;
  },

  // Actualizar un modelo de IA
  async updateModel(id, modelData) {
    const response = await api.put(`/sam/models/${id}/`, modelData);
    return response.data;
  },

  // Eliminar un modelo de IA
  async deleteModel(id) {
    await api.delete(`/sam/models/${id}/`);
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
      // JWT via cookies; ensure CSRF then send multipart
      await authService.ensureCsrfCookie?.();
      const response = await api.post(`/tours/`, tourData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
  compare: compareService,
  aiManagement: aiManagementService,
};