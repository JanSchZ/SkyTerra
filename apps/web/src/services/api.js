import axios from 'axios';
import React from 'react';
import compareService from './api/compareService';

// Helper function to validate tour URLs with whitelist approach instead of blacklist
const isValidTourUrl = (url) => {
  if (!url) return false;
  const urlStr = url.toLowerCase();

  // Whitelist: accept URLs that point to media or tour content endpoints
  const validPatterns = [
    '/media/tours/',
    '/api/tours/content/',
    '/content/',
    '/media\\tours\\'
  ];

  const isValid = validPatterns.some(pattern => urlStr.includes(pattern));

  // Reject only if it's exactly a placeholder or test file (not if it contains these words)
  const isPlaceholder = urlStr.includes('placeholder.svg') ||
                       urlStr.includes('/placeholder/') ||
                       urlStr.includes('test.svg') ||
                       urlStr.includes('/test/');

  return isValid && !isPlaceholder;
};

// Configuración dinámica de la URL base
const getBaseURL = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();

  if (typeof window === 'undefined') {
    return envBase || '/api';
  }

  const { hostname, origin, protocol, port } = window.location;

  if (import.meta.env.MODE === 'development') {
    console.log('🔍 Detectando entorno:', { hostname, origin, protocol, port });
  }

  // 1) Desarrollo local: SIEMPRE usa el proxy de Vite para evitar CORS
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (import.meta.env.MODE === 'development') console.log('💻 Desarrollo local: usando proxy /api (ignora VITE_API_BASE_URL)');
    return '/api';
  }

  // 2) Si hay VITE_API_BASE_URL definida, úsala siempre en hosts no locales
  //    (evita forzar subdominios api.* cuando no existen)
  if (envBase) return envBase;

  // 3) Codespaces
  if (hostname.includes('github.dev') || hostname.includes('codespaces.io')) {
    const backendUrl = origin.replace(/:\d+/, ':8000');
    if (import.meta.env.MODE === 'development') console.log('🚀 Configurando para Codespaces:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 4) app.* → api.*
  if (hostname.startsWith('app.')) {
    const backendHost = hostname.replace(/^app\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    if (import.meta.env.MODE === 'development') console.log('🌐 Configurando para sub-dominio app.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 5) www.* → api.*
  if (hostname.startsWith('www.')) {
    const backendHost = hostname.replace(/^www\./, 'api.');
    const backendUrl = `https://${backendHost}`;
    if (import.meta.env.MODE === 'development') console.log('🌐 Configurando para sub-dominio www.* -> api.*:', `${backendUrl}/api`);
    return `${backendUrl}/api`;
  }

  // 6) Producción misma raíz o fallback
  if (import.meta.env.MODE === 'development') console.log('🌐 Producción/Fallback: /api');
  return '/api';
};

// Crear una instancia con configuración base (regla: en local -> proxy /api)
const baseURL = getBaseURL();
if (import.meta.env.MODE === 'development') console.debug('🔧 API configurada con baseURL:', baseURL);

export const api = axios.create({
  baseURL: baseURL,
  withCredentials: true, // Importante para enviar cookies en solicitudes de origen cruzado
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

const setHeaderValue = (headers, key, value) => {
  if (!headers) return;
  if (typeof headers.set === 'function') {
    headers.set(key, value);
  } else {
    headers[key] = value;
  }
};

const removeHeaderValue = (headers, key) => {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete(key);
  } else {
    delete headers[key];
  }
};

const hasHeaderValue = (headers, key) => {
  if (!headers) return false;
  if (typeof headers.has === 'function') {
    return headers.has(key);
  }
  if (typeof headers.get === 'function') {
    const value = headers.get(key);
    return typeof value !== 'undefined' && value !== null;
  }
  const lowerKey = key.toLowerCase();
  return Object.keys(headers).some((existingKey) => existingKey.toLowerCase() === lowerKey);
};

// Interceptor para añadir token en las solicitudes
api.interceptors.request.use(
  config => {
    const headers = config.headers || {};
    const hasFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (hasFormData) {
      removeHeaderValue(headers, 'Content-Type');
      removeHeaderValue(headers, 'content-type');
    } else if (!hasHeaderValue(headers, 'Content-Type') && !hasHeaderValue(headers, 'content-type')) {
      setHeaderValue(headers, 'Content-Type', 'application/json');
    }

    config.headers = headers;

    // Adjuntar JWT/CSRF con lógica para endpoints públicos
    try {
      const url = (config.url || '').toString();
      const method = (config.method || 'get').toLowerCase();
      const skipAuth = config.skipAuth === true;
      const isPublicGet = method === 'get' && !(
        url.includes('/auth/user/') ||
        url.startsWith('/admin/') ||
        url.includes('/my-properties') ||
        url.startsWith('/favorites') ||
        url.startsWith('/saved-searches') ||
        url.startsWith('/recording-orders') ||
        url.startsWith('/ai/')
      );

      if (isPublicGet || skipAuth) {
        // No enviar cookies en GET públicos para evitar 401 por JWT expirado
        config.withCredentials = false;
      }

      if (!skipAuth && !isPublicGet) {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }

      const csrfPersisted = localStorage.getItem('csrfToken');
      if (csrfPersisted) {
        config.headers = config.headers || {};
        config.headers['X-CSRFToken'] = csrfPersisted;
      }
    } catch (error) { void error; }

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
  async error => {
    console.error('[API Response Error]', error?.message || error);

    // Manejo de 401 con intento de refresh
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const isLoginAttempt = url.endsWith('/auth/login/');
      const isAuthCheck = url.endsWith('/auth/user/');
      const isRefresh = url.endsWith('/auth/token/refresh/');

      // Intentar refresh una vez si hay refreshToken
      const originalRequest = error.config || {};
      if (!isLoginAttempt && !isAuthCheck && !isRefresh && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refresh = localStorage.getItem('refreshToken');
          if (refresh) {
            const resp = await api.post('/auth/token/refresh/', { refresh });
            const newAccess = resp?.data?.access;
            if (newAccess) {
              localStorage.setItem('accessToken', newAccess);
              api.defaults.headers['Authorization'] = `Bearer ${newAccess}`;
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
              return api(originalRequest);
            }
          }
        } catch (e) {
          // Falló refresh
        }
      }

      // Intento extra: si es GET público y venía Authorization inválida, reintentar sin Auth
      try {
        const method = (originalRequest.method || 'get').toLowerCase();
        const oUrl = (originalRequest.url || '').toString();
        const isPotentialPublicGet = method === 'get' && (
          oUrl.startsWith('/auth/csrf/') ||
          oUrl.startsWith('/properties/') ||
          oUrl.startsWith('/properties-preview/') ||
          oUrl.startsWith('/tours/')
        );
        if (isPotentialPublicGet && !originalRequest._publicRetry) {
          originalRequest._publicRetry = true;
          if (originalRequest.headers) delete originalRequest.headers['Authorization'];
          originalRequest.skipAuth = true;
          return api(originalRequest);
        }
      } catch (error) { void error; }

      // Si la verificación explícita de sesión falla, limpiamos el usuario en caché.
      if (isAuthCheck) {
        localStorage.removeItem('user');
        // Notificar al resto de la app que la sesión ya no es válida
        try { window.dispatchEvent(new CustomEvent('auth:invalid')); } catch (error) { void error; }
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
      const resp = await api.get('/auth/csrf/', { skipAuth: true });
      const token = resp?.data?.csrfToken;
      if (token) {
      try {
      authService._csrfToken = token;
      api.defaults.headers['X-CSRFToken'] = token;
      localStorage.setItem('csrfToken', token);
      } catch (error) { void error; }
      }
    } catch (e) {
      // Silencioso: en desarrollo puede no ser crítico si ya existe
      console.warn('No se pudo inicializar CSRF (posiblemente ya existe):', e?.response?.status || e?.message);
      try {
      const token = localStorage.getItem('csrfToken');
      if (token) {
      authService._csrfToken = token;
      api.defaults.headers['X-CSRFToken'] = token;
      }
      } catch (error) { void error; }
    }
  },
  // Iniciar sesión
  async login(credentials) {
    try {
      await this.ensureCsrfCookie();
      // Asegurar que no se envíe ningún Authorization previo en el login
      try { if (api.defaults && api.defaults.headers) { delete api.defaults.headers['Authorization']; } } catch (error) { void error; }
      // Necesitamos cookies para CSRF, pero omitimos Authorization
      const response = await api.post('/auth/login/', credentials, { skipAuth: true, withCredentials: true });
      // Guardar tokens JWT si vienen en el cuerpo (además de cookies)
      try {
        const access = response?.data?.access;
        const refresh = response?.data?.refresh;
        if (access) {
          localStorage.setItem('accessToken', access);
          api.defaults.headers['Authorization'] = `Bearer ${access}`;
        }
        if (refresh) {
          localStorage.setItem('refreshToken', refresh);
        }
      } catch (error) { void error; }

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
        hasPassword: !!(userData.password || userData.password1)
      });

      await this.ensureCsrfCookie();
      try {
        if (api.defaults && api.defaults.headers) {
          delete api.defaults.headers['Authorization'];
        }
      } catch (error) { void error; }

      const payload = { ...userData };
      if (payload.password && !payload.password1) {
        payload.password1 = payload.password;
      }
      if (payload.password2 === undefined && payload.password1 !== undefined) {
        payload.password2 = payload.password1;
      }

      const response = await api.post('/auth/registration/', payload, { skipAuth: true, withCredentials: true });
      const data = response?.data || {};
      console.log('✅ Registro exitoso:', data);

      const access = data.access;
      const refresh = data.refresh;
      if (access) {
        localStorage.setItem('accessToken', access);
        api.defaults.headers = api.defaults.headers || {};
        api.defaults.headers['Authorization'] = `Bearer ${access}`;
      }
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }

      let user = data.user;
      if (!user) {
        try {
          const whoami = await api.get('/auth/user/');
          if (whoami?.data) {
            user = whoami.data;
          }
        } catch (whoamiError) {
          console.warn('Registro completado pero no se pudo obtener /auth/user/:', whoamiError?.response?.status || whoamiError?.message);
        }
      }

      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }

      return { ...data, user };
    } catch (error) {
      console.error('❌ Error during registration:', error);

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      try {
        if (api.defaults && api.defaults.headers) {
          delete api.defaults.headers['Authorization'];
        }
      } catch (error) { void error; }

      // Manejo detallado de errores de respuesta
      if (error.response) {
        console.error('Response error details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });

        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            throw new Error(error.response.data);
          } else if (error.response.data.error) {
            throw new Error(error.response.data.error);
          } else {
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
      } catch (error) { void error; }
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
      } catch (error) { void error; }
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
      } catch (error) { void error; }
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
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      try { delete api.defaults.headers['Authorization']; } catch (error) { void error; }
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
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      localStorage.removeItem('user');
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
    return !!(userStr && userStr !== 'undefined' && userStr !== 'null');
  },

  // Obtener usuario del localStorage sin llamada al backend (función helper simple)
  getStoredUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
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
      const response = await api.get('/properties/');
      return response.data;
    } catch (error) {
      console.error('Error fetching properties:', error);
      // Propagar el error para que el componente lo maneje
      throw error;
    }
  },

  // Resumen para Dashboard Admin (propiedades por día, pendientes, tickets, usuarios)
  async getAdminSummary() {
    try {
      const response = await api.get('/admin/dashboard-summary/');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin summary:', error);
      throw error;
    }
  },

  // NUEVA FUNCIÓN PARA OBTENER PROPIEDADES PAGINADAS CON OPTIMIZACIONES
  async getPaginatedProperties(page = 1, filters = {}, pageSize = 20) {
    try {
      // Optimizaciones de parámetros para mejor rendimiento
      const params = { page, page_size: pageSize, ...(filters || {}) };

      // Agregar timestamp para evitar caché del navegador en desarrollo
      if (import.meta.env.MODE === 'development') {
        params._t = Date.now();
      }

      console.log('Fetching paginated properties with optimized params:', params);
      const response = await api.get('/properties/', {
        params,
        // Optimizaciones de red
        timeout: 10000, // 10 segundos timeout
        headers: {
          'Cache-Control': 'max-age=300' // Cache del navegador por 5 minutos
        }
      });

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

  // Nueva función para obtener propiedades con prefetch inteligente
  async getPropertiesOptimized(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        prefetchImages = true,
        prefetchTours = false,
        useCache = true
      } = options;

      const params = { page, page_size: pageSize };

      // Agregar parámetros de optimización
      if (prefetchImages) params.include_images = 'true';
      if (prefetchTours) params.include_tours = 'true';
      if (useCache) params.use_cache = 'true';

      console.log('Fetching optimized properties:', params);

      const response = await api.get('/properties/', {
        params,
        timeout: 15000, // Mayor timeout para consultas optimizadas
        headers: useCache ? {
          'Cache-Control': 'max-age=600' // 10 minutos de cache del navegador
        } : {}
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching optimized properties:', error);
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

  async transitionWorkflow(propertyId, substate, message) {
    try {
      const payload = { substate };
      if (message) {
        payload.message = message;
      }
      const response = await api.post(`/properties/${propertyId}/transition/`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error transitioning property ${propertyId} to ${substate}:`, error);
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || error.response.data.detail || 'Error al actualizar el flujo de publicación.';
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

    // Normalizar colecciones para evitar TypeError en .forEach o .length
    const images = Array.isArray(propertyData?.images) ? propertyData.images : [];
    const imagesToDelete = Array.isArray(propertyData?.imagesToDelete) ? propertyData.imagesToDelete : [];
    const documents = Array.isArray(propertyData?.documents) ? propertyData.documents : [];
    const utilities = Array.isArray(propertyData?.utilities) ? propertyData.utilities : [];
    const boundaryPolygon = propertyData?.boundary_polygon || null;

    Object.keys(propertyData || {}).forEach(key => {
      if (
        key === 'images' ||
        key === 'imagesToDelete' ||
        key === 'boundary_polygon' ||
        key === 'documents' ||
        key === 'utilities' ||
        key === 'tour360'
      ) {
        // Campos tratados de forma especial más abajo
      } else if (propertyData[key] !== null && propertyData[key] !== undefined) {
        dataToSend.append(key, propertyData[key]);
      }
    });

    // Imágenes nuevas
    images.forEach(file => dataToSend.append('new_images', file));
    // IDs de imágenes a eliminar
    if (imagesToDelete.length > 0) {
      dataToSend.append('images_to_delete_ids', JSON.stringify(imagesToDelete));
    }

    // Límite/Polígono
    if (boundaryPolygon) {
      dataToSend.append('boundary_polygon', JSON.stringify(boundaryPolygon.geojson || boundaryPolygon));
    }

    // Tour 360: se sube por endpoint dedicado `/tours/` tras crear la propiedad

    // Documentos nuevos
    documents.forEach(file => dataToSend.append('new_documents', file));

    // Campos adicionales
    if (propertyData?.terrain) {
      dataToSend.append('terrain', propertyData.terrain);
    }
    if (propertyData?.access) {
      dataToSend.append('access', propertyData.access);
    }
    if (propertyData?.legalStatus) {
      // Mapear nombre de frontend a backend
      dataToSend.append('legal_status', propertyData.legalStatus);
    }
    if (utilities.length > 0) {
      dataToSend.append('utilities', JSON.stringify(utilities));
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

export const adminService = {
  async fetchTickets(options = {}) {
    const {
      status,
      priority,
      assignedTo,
      search,
      page = 1,
      pageSize = 200,
    } = options;

    const params = {
      page,
      page_size: pageSize,
      ordering: '-created_at',
    };

    if (status && status !== 'all') {
      params.status = status;
    }
    if (priority && priority !== 'all') {
      params.priority = priority;
    }
    if (typeof assignedTo !== 'undefined') {
      params.assigned_to = assignedTo === null ? 'null' : assignedTo;
    }
    if (search) {
      params.search = search;
    }

    const response = await api.get('/admin/tickets/', { params });
    const list = Array.isArray(response.data?.results)
      ? response.data.results
      : Array.isArray(response.data)
      ? response.data
      : [];
    const count = response.data?.count ?? list.length;
    return { results: list, count };
  },

  async fetchTicket(ticketId) {
    const response = await api.get(`/admin/tickets/${ticketId}/`);
    return response.data;
  },

  async updateTicket(ticketId, payload) {
    const response = await api.patch(`/admin/tickets/${ticketId}/`, payload);
    return response.data;
  },

  async respondTicket(ticketId, message) {
    const response = await api.post('/admin/ticket-responses/', {
      ticket: ticketId,
      message,
    });
    return response.data;
  },

  async fetchTicketResponses(ticketId) {
    const response = await api.get('/admin/ticket-responses/', {
      params: { ticket: ticketId, ordering: 'created_at' },
    });
    return Array.isArray(response.data?.results)
      ? response.data.results
      : Array.isArray(response.data)
      ? response.data
      : [];
  },

  async fetchUsers(options = {}) {
    const { page = 1, pageSize = 200 } = options;
    const response = await api.get('/admin/users/', {
      params: { page, page_size: pageSize },
    });
    const list = Array.isArray(response.data?.results)
      ? response.data.results
      : Array.isArray(response.data)
      ? response.data
      : [];
    const count = response.data?.count ?? list.length;
    return { results: list, count };
  },

  async fetchStaffUsers() {
    const { results } = await this.fetchUsers({ pageSize: 200 });
    return results.filter((user) => user.is_staff);
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
      
      // Validar que el tour sea válido usando whitelist approach
      if (!tour || !tour.url || !isValidTourUrl(tour.url)) {
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
      // Obtener CSRF token explícito y enviar en header
      let csrfToken;
      try {
        const csrfResp = await api.get('/auth/csrf/', { skipAuth: true });
        csrfToken = csrfResp?.data?.csrfToken;
      } catch (error) { void error; }
      const response = await api.post(`/tours/`, tourData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {})
        }
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

// ---------------------
// Recording Orders Service
// ---------------------
export const recordingOrderService = {
  async create(propertyId, payload = {}) {
    await authService.ensureCsrfCookie?.();
    const body = { property: propertyId, ...(payload || {}) };
    const resp = await api.post('/recording-orders/', body);
    return resp.data;
  },
  async list(params = {}) {
    // Admin list
    const resp = await api.get('/recording-orders/', { params });
    return resp.data.results || resp.data;
  },
  async myOrders() {
    const resp = await api.get('/recording-orders/mine/');
    return resp.data.results || resp.data;
  },
  async setStatus(id, status, extra = {}) {
    const resp = await api.post(`/recording-orders/${id}/set-status/`, { status, ...extra });
    return resp.data;
  },
};

// ---------------------
// Operator Service (Pilotos)
// ---------------------
export const operatorService = {
  _normalizeJob(job) {
    if (!job || typeof job !== 'object') {
      return job;
    }
    let pilotRating = null;
    if (typeof job.pilot_rating === 'number') {
      pilotRating = job.pilot_rating;
    } else if (typeof job.pilot_rating === 'string' && job.pilot_rating.trim() !== '') {
      const parsed = Number(job.pilot_rating);
      pilotRating = Number.isFinite(parsed) ? parsed : null;
    }
    return {
      ...job,
      pilot_rating: pilotRating,
    };
  },

  async listOperators(params = {}) {
    const { data } = await api.get('/pilot-profiles/', { params });
    const rawResults = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];


    const results = rawResults.map((item) => ({
      ...item,
      documents: Array.isArray(item?.documents)
        ? item.documents.map((doc) => ({
            ...doc,
            file_url: makeAbsoluteUrl(doc?.file_url || doc?.file),
            file: doc?.file ? makeAbsoluteUrl(doc.file) : doc?.file,
          }))
        : [],
    }));

    const count = typeof data?.count === 'number' ? data.count : results.length;
    return {
      results,
      count,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
    };
  },

  async fetchOperator(operatorId) {
    const { data } = await api.get(`/pilot-profiles/${operatorId}/`);
    const documents = Array.isArray(data?.documents)
      ? data.documents.map((doc) => ({
          ...doc,
          file_url: makeAbsoluteUrl(doc?.file_url || doc?.file),
          file: doc?.file ? makeAbsoluteUrl(doc.file) : doc?.file,
        }))
      : [];
    return { ...data, documents };
  },

  async updateOperator(operatorId, payload = {}) {
    const { data } = await api.patch(`/pilot-profiles/${operatorId}/`, payload);
    return data;
  },

  async updateDocument(documentId, payload = {}) {
    const { data } = await api.patch(`/pilot-documents/${documentId}/`, payload);
    return {
      ...data,
      file_url: makeAbsoluteUrl(data?.file_url || data?.file),
      file: data?.file ? makeAbsoluteUrl(data.file) : data?.file,
    };
  },

  async listOperatorJobs(params = {}) {
    const { data } = await api.get('/jobs/', { params });
    const results = Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : [];
    const normalizedResults = results.map((job) => operatorService._normalizeJob(job));
    const count = typeof data?.count === 'number' ? data.count : results.length;
    return {
      results: normalizedResults,
      count,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
    };
  },

  async rateOperator(jobId, payload = {}) {
    const { data } = await api.post(`/jobs/${jobId}/rate-operator/`, payload);
    return operatorService._normalizeJob(data);
  },
};

// Hook personalizado para gestión optimizada de propiedades
export const usePropertyService = () => {
  const [cache, setCache] = React.useState(new Map());
  const [loadingStates, setLoadingStates] = React.useState(new Map());

  // Función para obtener clave de caché
  const getCacheKey = (filters, page, pageSize) => {
    return JSON.stringify({ filters, page, pageSize });
  };

  // Función para verificar si los datos están en caché y son válidos
  const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached) {
      const now = Date.now();
      const cacheAge = now - cached.timestamp;
      // Cache válido por 5 minutos
      if (cacheAge < 300000) {
        return cached.data;
      } else {
        // Remover datos expirados
        cache.delete(key);
      }
    }
    return null;
  };

  // Función para cachear datos
  const setCachedData = (key, data) => {
    setCache(prev => new Map(prev).set(key, {
      data,
      timestamp: Date.now()
    }));
  };

  // Función optimizada para obtener propiedades con caché
  const getPropertiesCached = React.useCallback(async (filters = {}, page = 1, pageSize = 20) => {
    const cacheKey = getCacheKey(filters, page, pageSize);
    const loadingKey = `loading_${cacheKey}`;

    // Verificar si ya está cargando
    if (loadingStates.get(loadingKey)) {
      // Si ya está cargando, esperar un poco y reintentar
      await new Promise(resolve => setTimeout(resolve, 100));
      return getCachedData(cacheKey);
    }

    // Verificar caché
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Using cached property data');
      return cachedData;
    }

    // Marcar como cargando
    setLoadingStates(prev => new Map(prev).set(loadingKey, true));

    try {
      const data = await propertyService.getPaginatedProperties(page, {}, pageSize);
      setCachedData(cacheKey, data);

      return data;
    } finally {
      // Remover estado de carga
      setLoadingStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(loadingKey);
        return newMap;
      });
    }
  }, [cache, loadingStates]);

  // Función para invalidar caché
  const invalidateCache = React.useCallback(() => {
    setCache(new Map());
  }, []);

  // Función para prefetch de próxima página
  const prefetchNextPage = React.useCallback(async (filters, currentPage, pageSize) => {
    const nextPage = currentPage + 1;
    const cacheKey = getCacheKey(filters, nextPage, pageSize);

    if (!getCachedData(cacheKey)) {
      // Prefetch en background sin bloquear
      propertyService.getPaginatedProperties(nextPage, filters, pageSize)
        .then(data => setCachedData(cacheKey, data))
        .catch(err => console.warn('Prefetch failed:', err));
    }
  }, [cache]);

  return {
    getPropertiesCached,
    invalidateCache,
    prefetchNextPage,
    cacheSize: cache.size
  };
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
  admin: adminService,
  tour: tourService,
  image: imageService,
  recordingOrder: recordingOrderService,
  operator: operatorService,
  savedSearch: savedSearchService,
  favorites: favoritesService,
  compare: compareService,
  aiManagement: aiManagementService,
  usePropertyService
};
