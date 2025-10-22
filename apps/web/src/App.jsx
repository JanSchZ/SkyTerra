import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useTheme as useMuiTheme,
  useMediaQuery,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Grow,
  Fade,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { liquidGlassTheme } from './theme/liquidGlassTheme';
import { ThemeProvider as MuiThemeProvider, createTheme as createMuiTheme } from '@mui/material/styles';
import { api, authService, propertyService } from './services/api';
import { GoogleOAuthProvider } from '@react-oauth/google';

import MapView from './components/map/MapView';
import PropertyDetails from './components/property/PropertyDetails';
import TourViewer from './components/tours/TourViewer';
import AuthPage from './components/ui/AuthForms';
import Dashboard from './components/ui/Dashboard';
import AISearchBar from './components/ui/AISearchBar';
import AISuggestionPanel from './components/ui/AISuggestionPanel';
import LandingV2 from './components/ui/LandingV2';
import AppHeader from './components/ui/AppHeader.jsx';

import CompareView from './components/property/CompareView';
import PropertyApprovalPage from './components/adminV2/PropertyApprovalPage.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminDashboardPage from './components/admin/AdminDashboardPage.jsx';
import AdminTicketsPage from './components/admin/AdminTicketsPage.jsx';
import AdminUsersListPage from './components/admin/AdminUsersListPage.jsx';
import AdminSettingsPage from './components/admin/AdminSettingsPage.jsx';
import AdminDetailedPropertiesPage from './components/admin/AdminDetailedPropertiesPage.jsx';
import AdminCouponsPage from './components/admin/AdminCouponsPage.jsx';
import SamAdminPage from './components/admin/SamAdminPage.jsx';
import AdminAnalyticsPage from './components/admin/AdminAnalyticsPage.jsx';
import SellerDashboardPage from './components/user/SellerDashboardPage.jsx';
import SellerListingWizardPage from './components/seller/SellerListingWizardPage.jsx';
import PricingPage from './components/pricing/PricingPage.jsx';
import CheckoutPage from './components/checkout/CheckoutPage.jsx';
import PaymentSuccess from './components/checkout/PaymentSuccess.jsx';
import PaymentCancelled from './components/checkout/PaymentCancelled.jsx';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import './App.css';
import SavedAndRecent from './components/ui/SavedAndRecent';

export const ThemeModeContext = React.createContext({
  toggleThemeMode: () => {},
  mode: 'light',
});

export const AuthContext = React.createContext(null);

const AppWrapper = () => {
  const [mode, setMode] = React.useState('light');

  const theme = useMemo(() => liquidGlassTheme(mode), [mode]);

  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
      mode,
      theme,
    }),
    [mode, theme],
  );

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <style>
          {`
            .page-transition-enter {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            .page-transition-enter-active {
              opacity: 1;
              transform: translateY(0) scale(1);
              transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .page-transition-exit {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            .page-transition-exit-active {
              opacity: 0;
              transform: translateY(-20px) scale(1.02);
              transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
          `}
        </style>
        <App />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

const ProtectedRoute = ({ user, element }) => {
  const finalUser = user?.user || user;
  if (!finalUser?.id) {
    return <Navigate to="/login" replace />;
  }
  return React.cloneElement(element, { user: finalUser });
};

const StaffRoute = ({ user, element }) => {
  const finalUser = user?.user || user;
  if (!finalUser?.is_staff) {
    return <Navigate to="/" replace />;
  }
  return React.cloneElement(element, { user: finalUser });
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [aiAppliedFilters, setAiAppliedFilters] = useState(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState(null);
  const [conversationHistory, setConversationHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('skyterra.sam.history');
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        try { window.__skyterraConversationHistory = parsed; } catch (error) { void error; }
        return parsed;
      }
    } catch (error) { void error; }
    return [];
  });
  // Removed top-bar save search dialog/button per request

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const mapRef = React.useRef(null);
  const [initialPropertiesData, setInitialPropertiesData] = useState(null);

  // Estado para el Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Estado para navegación fluida
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState(null);

  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Inicializa CSRF para que POST/PUT autenticados funcionen sin 403/401
        try { await authService.ensureCsrfCookie(); } catch (error) { void error; }

        // Primero verificar si hay indicios de sesión antes de hacer llamada al backend
        const localUser = localStorage.getItem('user');
        if (!localUser || localUser === 'undefined' || localUser === 'null') {
          if (localUser === 'undefined' || localUser === 'null') {
            localStorage.removeItem('user');
          }
          // No hay usuario en localStorage, no hacer llamada al backend
          setUser(null);
          setLoadingAuth(false);
          return;
        }

        // Solo si hay usuario en localStorage, verificar con el backend
        const currentUser = await authService.checkAuthStatus();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
          localStorage.removeItem('user'); // Limpiar si la verificación falló
        }
      } catch (error) {
        console.error("Failed to verify user session with backend:", error);
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    };
    
    // Listener para cuando la sesión se invalida desde otros componentes
    const handleAuthInvalid = () => {
      console.log('🔄 [App] Sesión invalidada, limpiando estado del usuario');
      setUser(null);
      localStorage.removeItem('user');
    };

    loadUser();
    
    // Agregar listener para eventos de autenticación inválida
    window.addEventListener('auth:invalid', handleAuthInvalid);
    
    // Cleanup del listener
    return () => {
      window.removeEventListener('auth:invalid', handleAuthInvalid);
    };
  }, []);

  // Prefetch first page of properties on first load to render immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await propertyService.getPaginatedProperties(1, {}, 20);
        if (!cancelled) setInitialPropertiesData(data);
      } catch (error) {
        void error;
        // Silencio: el MapView hará su propio fetch si falla este prefetch
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist conversation history
  useEffect(() => {
    try {
      localStorage.setItem('skyterra.sam.history', JSON.stringify(conversationHistory));
      try { window.__skyterraConversationHistory = conversationHistory; } catch (error) { void error; }
    } catch (error) { void error; }
  }, [conversationHistory]);
  
  const handleAISearch = (aiGeneratedFilters) => {
    if (!aiGeneratedFilters) return;
    // console.log('AI search response (raw):', aiGeneratedFilters); // Debug log

    // Eliminamos el uso de filtros sugeridos: Sam decide internamente
    setAiAppliedFilters(null);

    if (aiGeneratedFilters.flyToLocation) {
        handleLocationSearch(aiGeneratedFilters.flyToLocation);
    } else if (aiGeneratedFilters.recommendations && aiGeneratedFilters.recommendations.length > 0) {
      // If no direct flyToLocation, but we have recommendations, try to fly to the first one
      const firstReco = aiGeneratedFilters.recommendations[0];
      if (firstReco && typeof firstReco.latitude === 'number' && typeof firstReco.longitude === 'number') {
        // console.log('Flying to first recommendation:', firstReco); // Debug log
        const locationData = {
          center: [firstReco.longitude, firstReco.latitude],
          zoom: 12, // Default zoom for recommended property
          pitch: 60,
          bearing: 0
        };
        handleLocationSearch(locationData);
      }
    }
  };

  const handleLocationSearch = (locationData) => {
    if (!locationData || !mapRef.current) return;
    // console.log('Flying to location:', locationData); // Debug log
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: locationData.center,
        zoom: locationData.zoom || 12,
        pitch: locationData.pitch || 60,
        bearing: 0,
        duration: 4500,
        essential: true,
      });
    }
  };

  const handleSearchStart = (searchText) => {
    setAiSearchLoading(true);
    setAiSearchResult(null);
    if (typeof searchText === 'string' && searchText.trim()) {
      setConversationHistory(prev => [...prev, { role: 'user', content: searchText.trim() }]);
    }
    // Hide the intro overlay when search starts
    if (mapRef.current?.hideIntroOverlay) {
      mapRef.current.hideIntroOverlay();
    }
  };

  const createPropertyHistoryEntry = (recs) => {
    if (!Array.isArray(recs) || recs.length === 0) return null;
    const snapshot = recs
      .slice(0, 5)
      .map(({ id, name, price, latitude, longitude, reason, size, type }) => ({
        id,
        name,
        price,
        latitude,
        longitude,
        reason,
        size,
        type,
      }))
      .filter((item) => Object.values(item).some((value) => value !== undefined && value !== null && value !== ''));
    if (snapshot.length === 0) return null;
    return { role: 'assistant', content: '', properties: snapshot };
  };


  const handleSearchComplete = (result) => {
    setAiSearchLoading(false);
    if (result && result.type !== 'error') {
      setAiSearchResult(result);
      const hasRecs = Array.isArray(result.recommendations) && result.recommendations.length > 0;
      if (result.assistant_message || hasRecs) {
        setConversationHistory((prev) => {
          const next = [...prev];
          if (result.assistant_message) {
            next.push({ role: 'assistant', content: result.assistant_message });
          }
          const propertyEntry = createPropertyHistoryEntry(result.recommendations);
          if (propertyEntry) {
            next.push(propertyEntry);
          }
          return next;
        });
      }
      if (result.search_mode === 'location' && result.flyToLocation) {
        handleLocationSearch(result.flyToLocation);
      } else if (result.search_mode === 'property_recommendation' && hasRecs) {
        // fly to first recommendation automatically
        const first = result.recommendations[0];
        if (first.latitude && first.longitude) {
          handleLocationSearch({ center:[first.longitude, first.latitude], zoom:12, pitch:60, bearing:0 });
        }
      }
    }
  };


  const handleSuggestionClick = async (rec) => {
    try {
      if (mapRef.current?.openPropertyTour) {
        const opened = await mapRef.current.openPropertyTour(rec, { duration: 3000, zoom: 14.8 });
        if (opened) return;
      }

      if (mapRef.current?.openPropertyPanel) {
        const openedPanel = await mapRef.current.openPropertyPanel(rec);
        if (openedPanel) {
          if (rec && typeof rec.latitude === 'number' && typeof rec.longitude === 'number') {
            handleLocationSearch({
              center: [rec.longitude, rec.latitude],
              zoom: 13,
              pitch: 60,
              bearing: 0,
            });
          }
          return;
        }
      }

      if (rec && typeof rec.latitude === 'number' && typeof rec.longitude === 'number') {
        handleLocationSearch({
          center: [rec.longitude, rec.latitude],
          zoom: 13,
          pitch: 60,
          bearing: 0,
        });
        return;
      }

      setSnackbarMessage('No pude abrir esa propiedad. Intenta otra recomendacion.');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
    } catch (e) {
      console.error('Error handling suggestion click:', e);
      setSnackbarMessage('Ocurrio un error al abrir la propiedad.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };


  const handleLogin = async (credentials) => {
    try {
      const authData = await authService.login(credentials);
      const user = authData.user;
      setUser(user);
      setSnackbarMessage('¡Inicio de sesión exitoso! Bienvenido.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      if (user?.is_staff) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error("Login failed:", error);
      setSnackbarMessage(error.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleRegister = async (userData) => {
    try {
      const authData = await authService.register(userData);
      const user = authData?.user?.user || authData?.user;

      if (user?.id) {
        setUser(user);
        setSnackbarMessage('¡Registro exitoso! Bienvenido.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        if (user.is_staff) {
          navigate('/admin');
        } else {
          navigate('/');
        }
        return;
      }

      const detailMessage = authData?.detail || 'Registro completado. Revisa tu correo e inicia sesión para continuar.';
      setSnackbarMessage(detailMessage);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      navigate('/login');
    } catch (error) {
      console.error("Registration failed:", error);
      const errorMessage = typeof error.response?.data === 'string' ? error.response.data : (error.response?.data?.detail || error.message || 'Error desconocido durante el registro.');
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    // Clear Sam conversation history on logout
    try { localStorage.removeItem('skyterra.sam.history'); } catch (error) { void error; }
    setConversationHistory([]);
    setSnackbarMessage('Has cerrado sesión.');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
    navigate('/login');
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Función para navegación fluida con animación
  const handleSmoothNavigation = async (targetPath) => {
    if (isNavigating) return; // Prevenir múltiples clics

    setIsNavigating(true);
    setNavigationTarget(targetPath);

    // Pequeño delay para mostrar el efecto de carga
    await new Promise(resolve => setTimeout(resolve, 200));

    // Navegar a la ruta
    navigate(targetPath);

    // Resetear estado después de la navegación
    setTimeout(() => {
      setIsNavigating(false);
      setNavigationTarget(null);
    }, 500);
  };

  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const openUserMenu = (event) => setUserMenuAnchorEl(event.currentTarget);
  const closeUserMenu = () => setUserMenuAnchorEl(null);

  const handleAvatarMouseEnter = (e) => {
    clearTimeout(hoverTimeoutRef.current);
    openUserMenu(e);
  };
  const handleAvatarMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      closeUserMenu();
    }, 300);
  };

  const handleMenuMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); };
  const handleMenuMouseLeave = () => { hoverTimeoutRef.current = setTimeout(closeUserMenu, 300); };

  // Trigger cinematic fly-through when new AI recommendations arrive
  useEffect(() => {
    if (aiSearchResult && aiSearchResult.search_mode === 'property_recommendation' && Array.isArray(aiSearchResult.recommendations) && aiSearchResult.recommendations.length > 0) {
      mapRef.current?.showRecommendationsTour?.(aiSearchResult.recommendations.slice(0, 3)); // focus on top 3
    }
  }, [aiSearchResult]);

  const handleFollowUpQuery = async (text) => {
    const greetingRegex = /^(hola|buenas|hello|hi|qué tal|que tal|hey)(\s+.*)?$/i;
    // Local quick response for greetings to avoid unnecessary backend call and map tours
    if (greetingRegex.test(text.trim())) {
      const assistantMsg = '¡Hola! ¿En qué puedo ayudarte a buscar propiedades o ubicaciones?';
      const chatResponse = {
        search_mode: 'chat',
        assistant_message: assistantMsg,
        recommendations: [],
        suggestedFilters: null,
      };
      setConversationHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: assistantMsg }]);
      setAiSearchResult(chatResponse);
      return;
    }

    const newHistory = [...conversationHistory, { role: 'user', content: text }];
    try { window.__skyterraConversationHistory = newHistory; } catch (error) { void error; }
    setConversationHistory(newHistory);
    try {
      setAiSearchLoading(true);
      const response = await api.post('/ai-search/', { query: text, conversation_history: newHistory });
      if (response.data) {
        const { assistant_message, suggestedFilters, interpretation, recommendations, flyToLocation, search_mode } = response.data;
        
        // Process location navigation
        if (search_mode === 'location' && flyToLocation) {
          handleLocationSearch({
            center: flyToLocation.center,
            zoom: flyToLocation.zoom || 12,
            locationName: flyToLocation.name || text,
            pitch: flyToLocation.pitch,
            bearing: flyToLocation.bearing,
          });
        } else if (search_mode === 'property_recommendation' && recommendations && recommendations.length > 0) {
          // If no direct flyToLocation, but we have recommendations, try to fly to the first one
          const firstReco = recommendations[0];
          if (firstReco && typeof firstReco.latitude === 'number' && typeof firstReco.longitude === 'number') {
            handleLocationSearch({
              center: [firstReco.longitude, firstReco.latitude],
              zoom: 12,
              pitch: 60,
              bearing: 0
            });
          }
        }

        // Process recommendations and filters
        const hasRecs = recommendations && recommendations.length > 0;
        // No aplicar ni mostrar filtros
        setAiAppliedFilters(null);

        // Create processed result similar to AISearchBar
        const processedResult = {
          type: hasRecs ? 'properties' : (flyToLocation ? 'location' : 'ai_response'),
          search_mode: search_mode || (hasRecs ? 'property_recommendation' : (flyToLocation ? 'location' : 'chat')),
          assistant_message: assistant_message || (hasRecs ? 'Resultados de búsqueda:' : 'Respuesta de IA:'),
          suggestedFilters: null,
          interpretation: interpretation || assistant_message,
          recommendations: hasRecs ? (recommendations || []) : [],
          flyToLocation
        };

        setAiSearchResult(processedResult);
        
        if (assistant_message || hasRecs) {
          const updatedHistory = [...newHistory];
          if (assistant_message) {
            updatedHistory.push({ role: 'assistant', content: assistant_message });
          }
          const propertyEntry = createPropertyHistoryEntry(recommendations);
          if (propertyEntry) {
            updatedHistory.push(propertyEntry);
          }
          setConversationHistory(updatedHistory);
          try { window.__skyterraConversationHistory = updatedHistory; } catch (error) { void error; }
        }
      }
    } catch (err) { console.error(err); }
    finally { setAiSearchLoading(false); }
  };

  const handleGoogleLoginSuccess = async (response) => {
    if (import.meta.env.MODE === 'development') console.debug('Google login success response:', response);
    try {
      const authData = await authService.googleLogin(response);
      const user = authData.user;
      setUser(user);
      setSnackbarMessage('¡Inicio de sesión con Google exitoso! Bienvenido.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      if (user?.is_staff) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error("Google login failed:", error);
      setSnackbarMessage(error.message || 'Error al iniciar sesión con Google.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google login failed.');
    setSnackbarMessage('Fallo el inicio de sesión con Google. Inténtalo de nuevo.');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  const handleXLoginSuccess = async (response) => {
    // La respuesta de react-login-with-twitter es una URL con parámetros
    const params = new URLSearchParams(response.split('?')[1]);
    const authData = {
      oauth_token: params.get('oauth_token'),
      oauth_verifier: params.get('oauth_verifier'),
      // La librería no nos devuelve el oauth_token_secret, dj-rest-auth lo gestiona.
    };

    try {
      const data = await authService.xLogin(authData);
      const authenticatedUser = data.user;
      setUser(authenticatedUser);
      setSnackbarMessage('¡Inicio de sesión con X exitoso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      if (authenticatedUser?.is_staff) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      handleAuthError(error, 'Error al iniciar sesión con X.');
    }
  };

  const handleXLoginError = (error) => {
    console.error("X login failed:", error);
    handleAuthError(error, 'El proceso de inicio de sesión con X fue cancelado o falló.');
  };

  const handleAppleLoginSuccess = async (response) => {
    if (response.error) {
      console.error("Apple login error:", response.error);
      handleAuthError({ message: response.error }, 'El proceso de inicio de sesión con Apple falló.');
      return;
    }

    try {
      const data = await authService.appleLogin(response);
      const authenticatedUser = data.user;
      setUser(authenticatedUser);
      setSnackbarMessage('¡Inicio de sesión con Apple exitoso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      if (authenticatedUser?.is_staff) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      handleAuthError(error, 'Error al iniciar sesión con Apple.');
    }
  };

  const handleAuthError = (error, defaultMessage) => {
    console.error("Auth error:", error);
    setSnackbarMessage(error.message || defaultMessage);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  if (loadingAuth) {
    return (
      <Box sx={(theme)=>({ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: theme.palette.background.default })}>
        <CircularProgress />
      </Box>
    );
  }

  const pageVariants = {
    initial: {
      opacity: 0,
      // x: "-100vw"
    },
    in: {
      opacity: 1,
      // x: 0
    },
    out: {
      opacity: 0,
      // x: "100vw"
    }
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4
  };

  // Determine if the top bar should be shown
  const showTopBar = 
    location.pathname === '/' || 
    location.pathname.startsWith('/property/');

  // Helper function to format ranges (price, size)
  const formatRange = (range, unit = '', prefix = '') => {
    if (!range || range.length !== 2) return 'N/A';
    const [min, max] = range;
    if (min === null && max === null) return 'Cualquiera';
    if (min === null) return `Hasta ${prefix}${max?.toLocaleString()}${unit}`;
    if (max === null) return `Desde ${prefix}${min?.toLocaleString()}${unit}`;
    return `${prefix}${min?.toLocaleString()}${unit} - ${prefix}${max?.toLocaleString()}${unit}`;
  };

  // Component to display applied AI filters
  const AppliedFiltersDisplay = ({ filters, onClear }) => {
    if (!filters || Object.keys(filters).length === 0) {
      return null;
    }

    const hasContent = Object.values(filters).some(value => 
      Array.isArray(value) ? value.length > 0 : value !== null
    );

    if (!hasContent) return null;

    return (
      <Paper 
        elevation={3} 
        className="no-shine"
        sx={{ 
          p: 1.5, 
          mt: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          flexWrap: 'wrap',
          backgroundColor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.25)',
          maxWidth: '700px', // Match AISearchBar width
          mx: 'auto', // Center it like AISearchBar
        }}
      >
        <Typography variant="subtitle2" sx={{ color: muiTheme.palette.text.secondary, mr: 1 }}>Filtros IA:</Typography>
        {filters.propertyTypes && filters.propertyTypes.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="body2" sx={{color: muiTheme.palette.text.secondary}}>Tipo:</Typography>
            {filters.propertyTypes.map(type => <Chip key={type} label={type} size="small" />)}
          </Box>
        )}
        {filters.priceRange && (filters.priceRange[0] !== null || filters.priceRange[1] !== null) && (
          <Typography variant="body2">Precio: {formatRange(filters.priceRange, '', '$')}</Typography>
        )}
        {filters.sizeRange && (filters.sizeRange[0] !== null || filters.sizeRange[1] !== null) && (
          <Typography variant="body2">Tamaño: {formatRange(filters.sizeRange, ' ha')}</Typography>
        )}
        {filters.features && filters.features.length > 0 && (
           <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="body2" sx={{color: muiTheme.palette.text.secondary}}>Caract.:</Typography>
            {filters.features.map(feature => <Chip key={feature} label={feature} size="small" />)}
          </Box>
        )}
        <IconButton onClick={onClear} size="small" sx={{ ml: 'auto', color: muiTheme.palette.text.secondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };

  const mainContent = (
    <Routes>
      <Route 
        path="/" 
        element={
          <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <AppHeader />
            <MapView ref={mapRef} appliedFilters={aiAppliedFilters} filters={{}} initialData={initialPropertiesData} />
          </motion.div>
        } 
      />
      {/* Autenticación clásica dentro de un modal */}
      <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
      <Route path="/landing" element={
        <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
          <LandingV2 />
        </motion.div>
      } />
      <Route path="/map" element={<ProtectedRoute user={user} element={<MapView />} />} />
      <Route path="/property/:id" element={<PropertyDetails user={user?.user || user} />} />
      <Route path="/tour/:tourId" element={<TourViewer />} />
      <Route path="/compare" element={<ProtectedRoute user={user} element={<CompareView />} />} />
      <Route path="/saved" element={<ProtectedRoute user={user} element={<SavedAndRecent />} />} />
      <Route path="/dashboard" element={<ProtectedRoute user={user} element={<SellerDashboardPage />} />} />
      <Route path="/seller/listings/new" element={<ProtectedRoute user={user} element={<SellerListingWizardPage />} />} />
      <Route path="/seller/listings/:listingId" element={<ProtectedRoute user={user} element={<SellerListingWizardPage />} />} />
      <Route path="/pricing" element={<ProtectedRoute user={user} element={<PricingPage />} />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<StaffRoute user={user} element={<AdminLayout />} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="approvals" element={<PropertyApprovalPage />} />
        <Route path="properties" element={<AdminDetailedPropertiesPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        {/** Eliminado: Gestión de tours ahora vive dentro de Propiedades */}
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="ai-management" element={<SamAdminPage />} />
        
        <Route path="users" element={<AdminUsersListPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="/checkout" element={<ProtectedRoute user={user} element={<CheckoutPage />} />} />
      <Route path="/payment-success" element={<ProtectedRoute user={user} element={<PaymentSuccess />} />} />
      <Route path="/payment-cancelled" element={<ProtectedRoute user={user} element={<PaymentCancelled />} />} />

      {/* Página de Login dedicada */}
      <Route path="/login" element={
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.02 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }}
        >
          <Login />
        </motion.div>
      } />

      {/* Página de Registro dedicada */}
      <Route path="/signup" element={
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.02 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }}
        >
          <SignUp />
        </motion.div>
      } />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser: user, 
        isAuthenticated: !!user, 
        loading: loadingAuth,
        handleLogin, 
        handleRegister, 
        handleLogout, 
        handleGoogleLoginSuccess, 
        handleGoogleLoginError, 
        handleXLoginSuccess, 
        handleXLoginError, 
        handleAppleLoginSuccess 
      }}
    >
      <AnimatePresence mode="wait">
        <Box
          className="App"
          sx={(theme)=>({
            position: 'relative',
            minHeight: '100vh',
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            fontFamily: '"Helvetica", Arial, sans-serif',
            overflowX: 'hidden',
          })}
        >
          {/* UI principal siempre visible (Header Minimalista, etc.) */}
          {/* Condición para no mostrar en property, tour, o dashboard */}
          {showTopBar && (
            <Box // This Box is the main container for the top bar elements
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                p: isMobile ? 1 : 2,
                zIndex: 1200,
                display: 'flex', // Changed to flex to allow vertical stacking of AISearchBar and FiltersDisplay
                flexDirection: 'column', // Stack vertically
                alignItems: 'center', // Center items horizontally in the column
              }}
            >
              <Box // This Box wraps the original top bar content (Logo, Search, UserMenu)
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Typography
                  variant={isMobile ? "h6" : "h5"}
                  component="div"
                  onClick={() => navigate('/')}
                  sx={(theme)=>({
                    color: theme.palette.common.white,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    fontWeight: 400,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    userSelect: 'none',
                    paddingRight: 2,
                    paddingLeft: isMobile ? 1 : 3,
                    transition: 'color 0.3s ease-in-out',
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                    '&:hover': {
                      color: '#ffffff',
                    }
                  })}
                >
                  SKYTERRA
                </Typography>

                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: isMobile ? 1 : 2 }}>
                  <Box sx={{ width: '100%', maxWidth: '700px' }}> {/* This ensures AISearchBar keeps its width */}
                    <AISearchBar 
                      onSearch={handleAISearch} 
                      onLocationSearch={handleLocationSearch}
                      onSearchStart={handleSearchStart}
                      onSearchComplete={handleSearchComplete}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  {user ? (
                    <>
                      <IconButton
                        onClick={openUserMenu}
                        onMouseEnter={handleAvatarMouseEnter}
                        onMouseLeave={handleAvatarMouseLeave}
                        sx={(theme) => ({
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.25)',
                          color: theme.palette.common.white,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          transition: 'box-shadow 0.8s ease, transform 0.25s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.15) 100%)',
                            backgroundSize: '200% 100%',
                            opacity: 0,
                            transform: 'scale(0.9)',
                            transition: 'opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1), background-position 5s ease',
                            pointerEvents: 'none',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            transform: 'scale(1.05)',
                            boxShadow: '0 0 12px rgba(255,255,255,0.3)',
                            '&::before': {
                              opacity: 0.4,
                              transform: 'scale(1)',
                              backgroundPosition: '180% 0',
                            },
                          },
                        })}
                      >
                        <AccountCircleIcon />
                      </IconButton>
                        <Menu
                          id="user-menu"
                          anchorEl={userMenuAnchorEl}
                          open={Boolean(userMenuAnchorEl)}
                          onClose={closeUserMenu}
                          onMouseEnter={handleMenuMouseEnter}
                          onMouseLeave={handleMenuMouseLeave}
                          TransitionComponent={Grow}
                          PaperProps={{
                            sx: {
                              backgroundColor: 'rgba(255,255,255,0.18)',
                              borderRadius: '12px',
                              backdropFilter: 'blur(14px)',
                              WebkitBackdropFilter: 'blur(14px)',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                              color: 'white',
                              '& .MuiMenuItem-root': {
                                color: 'white',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                                '&:last-child': { borderBottom: 'none' },
                              }
                            }
                          }}
                        >
                          {user && (
                            <MenuItem sx={{ color: 'text.primary', pt: 1.5, pb: 0.5, opacity: 0.8, cursor: 'default', '&:hover': { backgroundColor: 'transparent' } }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{user.username}</Typography>
                            </MenuItem>
                          )}
                          {user && user.groups && user.groups.length > 0 && (
                            <MenuItem sx={{ color: 'text.secondary', pb: 1.5, pt: 0.5, borderBottom: '1px solid rgba(255,255,255,0.15)', opacity: 0.8, cursor: 'default', '&:hover': { backgroundColor: 'transparent' } }}>
                              <Typography variant="caption">{user.groups[0]}</Typography>
                            </MenuItem>
                          )}
                          {(user?.is_staff
                            ? [
                                <MenuItem key="admin-dashboard" onClick={() => { navigate('/admin/dashboard'); closeUserMenu(); }} sx={{ color: 'white' }}>Admin Dashboard</MenuItem>,
                                <MenuItem key="admin-approvals" onClick={() => { navigate('/admin/approvals'); closeUserMenu(); }} sx={{ color: 'white' }}>Moderación</MenuItem>,
                                <MenuItem key="admin-properties" onClick={() => { navigate('/admin/properties'); closeUserMenu(); }} sx={{ color: 'white' }}>Catálogo</MenuItem>,
                                <MenuItem key="admin-analytics" onClick={() => { navigate('/admin/analytics'); closeUserMenu(); }} sx={{ color: 'white' }}>Analítica</MenuItem>,
                                <MenuItem key="admin-tickets" onClick={() => { navigate('/admin/tickets'); closeUserMenu(); }} sx={{ color: 'white' }}>Tickets de Soporte</MenuItem>,
                                <MenuItem key="admin-users" onClick={() => { navigate('/admin/users'); closeUserMenu(); }} sx={{ color: 'white' }}>Gestionar Usuarios</MenuItem>,
                                <MenuItem key="admin-sam" onClick={() => { navigate('/admin/ai-management'); closeUserMenu(); }} sx={{ color: 'white' }}>Sam</MenuItem>,
                              ]
                            : [
                                <MenuItem key="dashboard" onClick={() => { navigate('/dashboard'); closeUserMenu(); }} sx={{ color: 'white' }}>Dashboard</MenuItem>,
                                <MenuItem key="saved" onClick={() => { navigate('/saved'); closeUserMenu(); }} sx={{ color: 'white' }}>Guardados y recientes</MenuItem>,
                                <MenuItem key="pricing" onClick={() => { navigate('/pricing'); closeUserMenu(); }} sx={{ color: 'white' }}>Publicar</MenuItem>,
                              ])}
                          <MenuItem onClick={() => { handleLogout(); closeUserMenu(); }} sx={{ color: 'white', borderTop: '1px solid rgba(255,255,255,0.15)', mt: 1 }}>Cerrar sesión</MenuItem>
                        </Menu>
                    </>
                  ) : (
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                        boxShadow: '0 0 25px rgba(255, 255, 255, 0.6)',
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 17
                      }}
                      style={{
                        display: 'inline-block',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <motion.div
                        animate={isNavigating && navigationTarget === '/login' ? {
                          scale: [1, 1.1, 0.9],
                          opacity: [1, 0.8, 0]
                        } : {}}
                        transition={{
                          duration: 0.6,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                        style={{ display: 'inline-block' }}
                      >
                        <Button
                          variant="outlined"
                          onClick={() => handleSmoothNavigation('/login')}
                          disabled={isNavigating}
                          sx={(theme)=>({
                            borderColor: 'rgba(120, 120, 120, 0.7)',
                            color: '#ffffff',
                            fontWeight: 300,
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            backgroundColor: 'rgba(22, 27, 34, 0.7)',
                            backdropFilter: 'blur(6px)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '4px',
                            opacity: isNavigating && navigationTarget === '/login' ? 0.7 : 1,
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: '-100%',
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                              transition: 'left 0.5s',
                            },
                            '&:hover': {
                              borderColor: 'rgba(255, 255, 255, 0.8)',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '&::before': {
                                left: '100%',
                              }
                            },
                            '&:disabled': {
                              opacity: 0.6,
                              cursor: 'not-allowed'
                            }
                          })}
                        >
                          {isNavigating && navigationTarget === '/login' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.8)' }} />
                              <span>Cargando...</span>
                            </Box>
                          ) : (
                            'Login'
                          )}
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </Box>
              </Box>
              {/* Removed AppliedFiltersDisplay to keep filters internal and invisible to user */}
            </Box>
          )}

          {/* Overlay de transición de navegación */}
          <AnimatePresence>
            {isNavigating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(13, 17, 23, 0.3)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      minWidth: 200,
                    }}
                  >
                    <CircularProgress sx={{ color: 'rgba(255, 255, 255, 0.8)' }} size={32} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 300 }}>
                      Cargando...
                    </Typography>
                  </Paper>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Snackbar para notificaciones */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={3000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
              {snackbarMessage}
            </Alert>
          </Snackbar>

          <AnimatePresence mode="wait">
            {mainContent}
          </AnimatePresence>

          {/* Render AI suggestion panel only on main map route */}
          {location.pathname === '/' && (
            <AISuggestionPanel 
               isLoading={aiSearchLoading}
               assistantMessage={aiSearchResult?.assistant_message}
               recommendations={aiSearchResult?.recommendations}
               searchMode={aiSearchResult?.search_mode}
               flyToLocation={aiSearchResult?.flyToLocation}
               onSuggestionClick={handleSuggestionClick}
               onSuggestionHover={null}
               onClearAISearch={() => { setAiSearchResult(null); setAiAppliedFilters(null);} }
               onFollowUpQuery={handleFollowUpQuery}
               currentQuery={aiSearchResult?.interpretation}
            />
          )}
          {/* SaveSearchDialog removed per request */}
        </Box>
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export default AppWrapper;
