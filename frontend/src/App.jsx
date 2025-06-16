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
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';
import { liquidGlassTheme } from './theme/liquidGlassTheme';
import { ThemeProvider as MuiThemeProvider, createTheme as createMuiTheme } from '@mui/material/styles';
import { api, authService } from './services/api';

import MapView from './components/map/MapView';
import PropertyDetails from './components/property/PropertyDetails';
import TourViewer from './components/tours/TourViewer';
import AuthPage from './components/ui/AuthForms';
import Dashboard from './components/ui/Dashboard';
import AISearchBar from './components/ui/AISearchBar';
import AISuggestionPanel from './components/ui/AISuggestionPanel';
import LandingV2 from './components/ui/LandingV2';
import CreatePublicationWizard from './components/property/CreatePublicationWizard';
import AdminDocumentsReviewPage from './components/admin/AdminDocumentsReviewPage.jsx';
import CompareView from './components/property/CompareView';
import AdminDetailedPropertiesPage from './components/admin/AdminDetailedPropertiesPage.jsx';
import SavedSearchesPage from './components/ui/SavedSearchesPage';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminDashboardPage from './components/admin/AdminDashboardPage.jsx';
import AdminTicketsPage from './components/admin/AdminTicketsPage.jsx';
import AdminUsersListPage from './components/admin/AdminUsersListPage.jsx';
import AdminSettingsPage from './components/admin/AdminSettingsPage.jsx';
import SellerDashboardPage from './components/user/SellerDashboardPage.jsx';
import PricingPage from './components/pricing/PricingPage.jsx';
import './App.css';

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
        <App />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

const ProtectedRoute = ({ user, element }) => {
  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

const StaffRoute = ({ user, element }) => {
  if (!user?.is_staff) {
    return <Navigate to="/" replace />;
  }
  return element;
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [aiAppliedFilters, setAiAppliedFilters] = useState(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const mapRef = React.useRef(null);

  // Estado para el Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Failed to load user from local storage:", error);
        setUser(null); // Ensure user is null on error
      } finally {
        setLoadingAuth(false);
      }
    };
    loadUser();
  }, []);
  
  const handleAISearch = (aiGeneratedFilters) => {
    if (!aiGeneratedFilters) return;
    // console.log('AI search response (raw):', aiGeneratedFilters); // Debug log

    if (aiGeneratedFilters.recommendations && aiGeneratedFilters.recommendations.length > 0 && aiGeneratedFilters.suggestedFilters) {
      setAiAppliedFilters(aiGeneratedFilters.suggestedFilters);
    }

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

  const handleSearchStart = () => {
    setAiSearchLoading(true);
    setAiSearchResult(null);
  };

  const handleSearchComplete = (result) => {
    setAiSearchLoading(false);
    if (result && result.type !== 'error') {
      setAiSearchResult(result);
      if (result.flyToLocation) {
        handleLocationSearch(result.flyToLocation);
      } else if (result.recommendations && result.recommendations.length > 0) {
        // fly to first recommendation automatically
        const first = result.recommendations[0];
        if (first.latitude && first.longitude) {
          handleLocationSearch({ center:[first.longitude, first.latitude], zoom:12, pitch:60, bearing:0 });
        }
      }
    }
  };

  const handleSuggestionClick = (rec) => {
    if (rec.latitude && rec.longitude) {
      handleLocationSearch({ center:[rec.longitude, rec.latitude], zoom:14, pitch:60, bearing:0 });
    }
    navigate(`/property/${rec.id}`);
  };

  const handleLogin = async (credentials) => {
    try {
      const userData = await authService.login(credentials);
      setUser(userData.user || userData);
      setSnackbarMessage('¡Inicio de sesión exitoso! Bienvenido.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Check if the logged-in user is staff/admin
      if (userData?.user?.is_staff) {
        navigate('/admin'); // Redirect admins to the new Admin dashboard
      } else {
        navigate('/'); // Redirect regular users to the home page
      }
    } catch (error) {
      console.error("Login failed:", error);
      setSnackbarMessage(error.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      // No navegamos en caso de error, el usuario permanece en la página de login
    }
  };

  const handleRegister = async (userData) => {
    try {
      await authService.register(userData);
      setSnackbarMessage('¡Registro exitoso! Por favor, inicia sesión.');
      setSnackbarSeverity('success');
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

  const handleLogout = () => {
    authService.logout();
    setUser(null);
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
    setConversationHistory(newHistory);
    try {
      setAiSearchLoading(true);
      const response = await api.post('ai-search/', { query: text, conversation_history: newHistory });
      if (response.data) {
        setAiSearchResult(response.data);
        if(response.data.assistant_message){
           setConversationHistory([...newHistory,{ role:'assistant', content: response.data.assistant_message }]);
        }
      }
    } catch (err) { console.error(err); }
    finally { setAiSearchLoading(false); }
  };

  if (loadingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0d1117' }}>
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

  // Ensure finalUser is safely determined
  const finalUser = user?.user || user; // Safely access user.user or use user directly

  const mainContent = (
    <Routes>
      <Route 
        path="/" 
        element={
          <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <MapView ref={mapRef} appliedFilters={aiAppliedFilters} filters={{}} />
          </motion.div>
        } 
      />
      <Route path="/login" element={<AuthPage onLogin={handleLogin} onRegister={handleRegister} />} />
      <Route path="/register" element={<AuthPage onLogin={handleLogin} onRegister={handleRegister} initialForm="register" />} />
      <Route path="/property/:id" element={<PropertyDetails user={finalUser} />} />
      <Route path="/tour/:tourId" element={<TourViewer />} />
      <Route path="/compare" element={<ProtectedRoute user={finalUser} element={<CompareView user={finalUser} />} />} />
      <Route path="/new-publication" element={<ProtectedRoute user={finalUser} element={<CreatePublicationWizard user={finalUser} />} />} />
      <Route path="/my-searches" element={<ProtectedRoute user={finalUser} element={<SavedSearchesPage />} />} />
      <Route path="/dashboard" element={<ProtectedRoute user={finalUser} element={<SellerDashboardPage user={finalUser} />} />} />
      <Route path="/pricing" element={<ProtectedRoute user={finalUser} element={<PricingPage />} />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<StaffRoute user={finalUser} element={<AdminLayout />} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="properties" element={<AdminDetailedPropertiesPage />} />
        <Route path="tickets" element={<AdminTicketsPage />} />
        <Route path="documents" element={<AdminDocumentsReviewPage />} />
        <Route path="users" element={<AdminUsersListPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );

  return (
    <>
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
              sx={{
                color: '#e0e0e0',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 300,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                userSelect: 'none',
                paddingRight: 2,
                paddingLeft: isMobile ? 1 : 3,
                transition: 'color 0.3s ease-in-out',
                '&:hover': {
                  color: '#ffffff',
                }
              }}
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

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {user ? (
                <>
                  <IconButton
                    onClick={openUserMenu}
                    onMouseEnter={handleAvatarMouseEnter}
                    onMouseLeave={handleAvatarMouseLeave}
                    sx={(theme) => ({
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(18px)',
                      WebkitBackdropFilter: 'blur(18px)',
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
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                        color: 'white',
                        '& .MuiMenuItem-root': {
                          color: 'white',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          '&:last-child': {
                            borderBottom: 'none',
                          },
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
                    <MenuItem onClick={() => { navigate('/dashboard'); closeUserMenu(); }} sx={{ color: 'white', pt: user ? 1.5 : 0.5 }}>Dashboard</MenuItem>
                    <MenuItem onClick={() => { navigate('/wizard-create'); closeUserMenu(); }} sx={{ color: 'white' }}>Crear Propiedad</MenuItem>
                    <MenuItem onClick={() => { navigate('/my-searches'); closeUserMenu(); }} sx={{ color: 'white' }}>Búsquedas Guardadas</MenuItem>
                    <MenuItem onClick={() => { navigate('/pricing'); closeUserMenu(); }} sx={{ color: 'white' }}>Planes</MenuItem>
                    <MenuItem onClick={() => { handleLogout(); closeUserMenu(); }} sx={{ color: 'white', borderTop: user ? '1px solid rgba(255,255,255,0.15)' : 'none', mt: user ? 1 : 0 }}>Logout</MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={(theme)=>({
                    borderColor: 'rgba(120, 120, 120, 0.7)', color: theme.palette.primary.main, fontWeight: 300,
                    padding: '6px 12px', fontSize: '0.8rem',
                    backgroundColor: 'rgba(22, 27, 34, 0.7)', backdropFilter: 'blur(8px)',
                    '&:hover': { borderColor: '#58a6ff', backgroundColor: 'rgba(30, 58, 138, 0.2)' }
                  })}
                >
                  Login
                </Button>
              )}
            </Box>
          </Box>
          {/* Removed AppliedFiltersDisplay to keep filters internal and invisible to user */}
        </Box>
      )}

      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
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

      {/* Render AI suggestion panel on left */}
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
    </>
  );
}

export default AppWrapper;
