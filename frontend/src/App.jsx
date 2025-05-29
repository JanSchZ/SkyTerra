import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
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
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';

import MapView from './components/map/MapView';
import PropertyDetails from './components/property/PropertyDetails';
import TourViewer from './components/tours/TourViewer';
import AuthPage from './components/ui/AuthForms';
import Dashboard from './components/ui/Dashboard';
import AISearchBar from './components/ui/AISearchBar';
import CreateProperty from './components/property/CreateProperty';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminPublicationsPage from './components/admin/AdminPublicationsPage';
import { authService } from './services/api';
import './App.css';

export const ThemeModeContext = React.createContext({
  toggleThemeMode: () => {},
  mode: 'light',
});

const AppWrapper = () => {
  const mode = 'dark';

  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => {},
      mode,
    }),
    [mode],
  );

  const baseFontFamily = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const titleFontFamily = '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#58a6ff',
            light: '#7FBFFF',
            dark: '#005DB3',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#f6d55c',
            contrastText: '#000000',
          },
          background: {
            default: '#0d1117',
            paper: '#161b22',
          },
          text: {
            primary: '#c9d1d9',
            secondary: '#8b949e',
          },
          divider: '#30363d',
          action: {
            hover: 'rgba(88, 166, 255, 0.12)',
            selected: 'rgba(88, 166, 255, 0.20)',
          }
        },
        typography: {
          fontFamily: baseFontFamily,
          h1: { fontFamily: titleFontFamily, fontWeight: 300, letterSpacing: '-0.02em' },
          h2: { fontFamily: titleFontFamily, fontWeight: 300, letterSpacing: '-0.01em' },
          h3: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '-0.01em' },
          h4: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0em' },
          h5: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0em' },
          h6: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0.01em' },
          body1: { fontWeight: 300, lineHeight: 1.65 },
          body2: { fontWeight: 300, lineHeight: 1.55 },
          button: { fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em', fontSize: '0.9rem' },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '8px 20px',
                boxShadow: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                border: '1px solid #30363d',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  backgroundColor: 'rgba(13, 17, 23, 0.7)',
                  backdropFilter: 'blur(5px)',
                  '& fieldset': {
                    borderColor: '#30363d',
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#58a6ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#58a6ff',
                    borderWidth: '2px',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }
            }
          },
        },
        shape: {
          borderRadius: 8,
        },
        shadows: Array(25).fill('none').map((_, index) => {
          if (index === 0) return 'none';
          const y = index;
          const blur = index * 2.5;
          const alpha = 0.2 + index * 0.02;
          return `0 ${y}px ${blur}px rgba(0,0,0, ${Math.min(alpha, 0.7)})`;
        }),
      }),
    [mode],
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
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const mapRef = React.useRef(null);

  // Estado para el Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // No mostramos snackbar aquí para evitarlo en cada carga si ya está logueado
    }
    setLoadingAuth(false);
  }, []);
  
  const handleAISearch = (aiGeneratedFilters) => {
    if (!aiGeneratedFilters) return;
    console.log('AI search response (filters removed):', aiGeneratedFilters);
    if (aiGeneratedFilters.flyToLocation) {
        handleLocationSearch(aiGeneratedFilters.flyToLocation);
    }
  };

  const handleLocationSearch = (locationData) => {
    if (!locationData || !mapRef.current) return;
    console.log('Flying to location:', locationData);
    const map = mapRef.current.getMap();
    if (map) {
      map.flyTo({
        center: locationData.center,
        zoom: locationData.zoom || 12,
        pitch: locationData.pitch || 60,
        bearing: locationData.bearing || 0,
        duration: 2000,
        essential: true,
      });
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const userData = await authService.login(credentials);
      setUser(userData.user || userData);
      setSnackbarMessage('¡Inicio de sesión exitoso! Bienvenido.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      navigate('/');
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
  const handleUserMenuOpen = (event) => setUserMenuAnchorEl(event.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchorEl(null);

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
  const showTopBar = !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/admin'); // Hide on /admin routes too

  return (
    <>
      {/* UI principal siempre visible (Header Minimalista, etc.) */}
      {/* Condición para no mostrar en property, tour, o dashboard */}
      {!location.pathname.startsWith('/property/') && 
       !location.pathname.startsWith('/tour/') && 
       location.pathname !== '/dashboard' && (
        <Box
          sx={{
            position: 'absolute', top: 0, left: 0, right: 0, p: isMobile ? 1 : 2,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1200,
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
            SkyTerra
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: isMobile ? 1: 2 }}>
            <Box sx={{ width: '100%', maxWidth: '700px' }}>
              <AISearchBar 
                onSearch={handleAISearch} 
                onLocationSearch={handleLocationSearch}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <>
                <IconButton
                  onClick={handleUserMenuOpen}
                  sx={{
                    backgroundColor: 'rgba(22, 27, 34, 0.9)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(30, 41, 59, 0.3)', color: '#c9d1d9',
                    '&:hover': { backgroundColor: 'rgba(30, 41, 59, 0.95)' },
                  }}
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  anchorEl={userMenuAnchorEl}
                  open={Boolean(userMenuAnchorEl)}
                  onClose={handleUserMenuClose}
                  MenuListProps={{ sx: { backgroundColor: '#161b22', border: '1px solid #30363d' } }}
                >
                  <MenuItem onClick={() => { navigate('/dashboard'); handleUserMenuClose(); }} sx={{ color: '#c9d1d9' }}>Dashboard</MenuItem>
                  <MenuItem onClick={() => { navigate('/create-property'); handleUserMenuClose(); }} sx={{ color: '#c9d1d9' }}>Crear Propiedad</MenuItem>
                  {user && user.is_staff && (
                    <MenuItem onClick={() => { navigate('/admin/publications'); handleUserMenuClose(); }} sx={{ color: '#c9d1d9' }}>
                      Panel de Admin
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => { handleLogout(); handleUserMenuClose(); }} sx={{ color: '#c9d1d9' }}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: 'rgba(30, 58, 138, 0.7)', color: '#60a5fa', fontWeight: 300,
                  padding: '6px 12px', fontSize: '0.8rem',
                  backgroundColor: 'rgba(22, 27, 34, 0.7)', backdropFilter: 'blur(8px)',
                  '&:hover': { borderColor: '#58a6ff', backgroundColor: 'rgba(30, 58, 138, 0.2)' }
                }}
              >
                Login
              </Button>
            )}
          </Box>
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
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <MapView ref={mapRef} />
              </motion.div>
            }
          />
          <Route
            path="/property/:id"
            element={
              <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <PropertyDetails />
              </motion.div>
            }
          />
          <Route path="/tour/:id" element={
            <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <TourViewer />
            </motion.div>
          } />
          <Route path="/login" element={
            <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <AuthPage formType="login" onLogin={handleLogin} />
            </motion.div>
          } />
          <Route path="/register" element={
            <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <AuthPage formType="register" onRegister={handleRegister} />
            </motion.div>
          } />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                user={user}
                element={
                  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Dashboard user={user} />
                  </motion.div>
                }
              />
            }
          />
          <Route
            path="/create-property"
            element={
              <ProtectedRoute user={user} element={
                  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <CreateProperty />
                  </motion.div>
                }
              />
            }
          />
          <Route path="/edit-property/:id" element={<ProtectedRoute user={user} element={<CreateProperty />} />} />
          <Route 
            path="/admin/publications"
            element={<AdminProtectedRoute element={<AdminPublicationsPage />} />} 
          />
          <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all to redirect to home */}
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default AppWrapper;
