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
import { alpha } from '@mui/material/styles'; // Import alpha
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

  const baseFontFamily = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const titleFontFamily = '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark', // Confirmed
          primary: {
            main: '#2563eb', // Deeper blue
            light: '#3b82f6', // Adjusted light
            dark: '#1e40af', // Adjusted dark
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#64748b', // Muted slate color
            light: '#94a3b8', // Adjusted light
            dark: '#475569', // Adjusted dark
            contrastText: '#ffffff', // Text on secondary should be light now
          },
          background: {
            default: '#0a0f14', // Darker shade
            paper: '#12181f', // Slightly lighter dark shade
          },
          text: {
            primary: '#e2e8f0', // Lighter primary text
            secondary: '#94a3b8', // Adjusted secondary text
          },
          divider: '#30363d', // Keep as is, seems reasonable
          action: {
            hover: 'rgba(88, 166, 255, 0.12)',
            selected: 'rgba(88, 166, 255, 0.20)',
          }
        },
        typography: {
          fontFamily: baseFontFamily,
          h1: { fontFamily: titleFontFamily, fontWeight: 300, letterSpacing: '-0.02em' }, // Keep
          h2: { fontFamily: titleFontFamily, fontWeight: 300, letterSpacing: '-0.01em' }, // Keep
          h3: { fontFamily: titleFontFamily, fontWeight: 300, letterSpacing: '-0.005em' }, // Lighter
          h4: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0em' }, // Keep
          h5: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0em' }, // Keep
          h6: { fontFamily: titleFontFamily, fontWeight: 400, letterSpacing: '0.01em' }, // Keep
          body1: { fontWeight: 400, lineHeight: 1.65 }, // More readable
          body2: { fontWeight: 400, lineHeight: 1.55 }, // More readable
          button: { fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em', fontSize: '0.9rem' }, // Keep
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper, // Default, can be overridden by specific instances
                // Example for blurred AppBar, if needed:
                // backgroundColor: alpha(theme.palette.background.paper, 0.7),
                // backdropFilter: 'blur(10px)',
              }),
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: theme.shape.borderRadius, // Consistent border radius
                padding: '8px 20px', // Keep padding
                boxShadow: 'none', // No shadow by default
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transition
                '&:hover': {
                  transform: 'translateY(-2px)', // Slightly more lift
                  boxShadow: theme.shadows[3], // Use theme shadow for hover
                }
              },
              containedPrimary: ({ theme }) => ({
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.9),
                  boxShadow: theme.shadows[4],
                }
              }),
              outlinedPrimary: ({ theme }) => ({
                borderWidth: '1px', // Ensure outlined buttons have a clear border
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderWidth: '1px',
                }
              }),
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: ({ theme }) => ({
                backgroundColor: theme.palette.background.paper,
                borderRadius: 12,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              }),
            },
          },
          MuiDialog: {
            styleOverrides: {
              root: ({ theme }) => ({
                backdropFilter: 'blur(8px)',
              }),
              paper: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.background.paper, 0.85),
                borderRadius: 12, // Ensure consistency with MuiPaper
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }),
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.background.paper, 0.85),
                backdropFilter: 'blur(10px)', // May have limited effect without a true backdrop for menu itself
                borderRadius: 8, // Standard menu radius
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }),
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme.shape.borderRadius, // Consistent radius
                  backgroundColor: alpha(theme.palette.background.paper, 0.75), // Theme-aware background
                  backdropFilter: 'blur(8px)', // Standardized blur
                  '& fieldset': {
                    borderColor: theme.palette.divider,
                    borderWidth: '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.light, // Lighter primary for hover
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: '2px',
                  },
                  // Ensure the input text itself is readable
                  '& .MuiInputBase-input': {
                    color: theme.palette.text.primary,
                  }
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: ({ theme }) => ({ // Make it theme-aware
                borderRadius: theme.shape.borderRadius * 2, // Larger radius for cards: 16px
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: theme.palette.background.paper, // Default card background
                boxShadow: theme.shadows[1], // Default shadow for cards
                '&:hover': {
                  transform: 'translateY(-4px)', // Lift effect on hover
                  boxShadow: theme.shadows[5], // Stronger shadow on hover
                }
              }),
            }
          },
          MuiAlert: {
            styleOverrides: {
              root: ({ theme }) => ({ // Base style for all alerts
                borderRadius: theme.shape.borderRadius,
                backdropFilter: 'blur(8px)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }),
              standardSuccess: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.success.main, 0.15),
                color: theme.palette.text.primary, // Ensure text is readable
                borderColor: alpha(theme.palette.success.dark, 0.3),
                borderLeft: `5px solid ${theme.palette.success.main}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.success.main,
                },
              }),
              standardError: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                color: theme.palette.text.primary,
                borderColor: alpha(theme.palette.error.dark, 0.3),
                borderLeft: `5px solid ${theme.palette.error.main}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main,
                },
              }),
              standardInfo: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.info.main, 0.15),
                color: theme.palette.text.primary,
                borderColor: alpha(theme.palette.info.dark, 0.3),
                borderLeft: `5px solid ${theme.palette.info.main}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.info.main,
                },
              }),
              standardWarning: ({ theme }) => ({
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.text.primary,
                borderColor: alpha(theme.palette.warning.dark, 0.3),
                borderLeft: `5px solid ${theme.palette.warning.main}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.warning.main,
                },
              }),
            }
          }
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

  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => {}, // This is a dummy, actual toggling logic is not in this component
      mode, // mode is fixed to 'dark' in this setup
      theme, // Pass the created theme
    }),
    [mode, theme], // theme depends on mode (though mode is static here)
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
  const showTopBar = 
    !location.pathname.startsWith('/property/') &&
    !location.pathname.startsWith('/tour/') &&
    !location.pathname.startsWith('/dashboard') &&
    !location.pathname.startsWith('/admin') &&
    location.pathname !== '/login' &&
    location.pathname !== '/register' &&
    location.pathname !== '/create-property' &&
    !location.pathname.startsWith('/edit-property/');

  return (
    <>
      {/* UI principal siempre visible (Header Minimalista, etc.) */}
      {/* Condición para no mostrar en property, tour, o dashboard */}
      {showTopBar && (
        <Box
          sx={(theme) => ({ // Added theme argument
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            p: theme.spacing(isMobile ? 1 : 1.5, isMobile ? 2 : 3), // Adjusted padding
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1200,
            backgroundColor: alpha(theme.palette.background.paper, 0.85), // Adjusted opacity
            backdropFilter: 'blur(12px)', // Adjusted blur radius
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, // Keep subtle border
          })}
        >
          <Typography
            variant={isMobile ? "h6" : "h5"}
            component="div"
            onClick={() => navigate('/')}
            sx={(theme) => ({
              color: theme.palette.text.primary,
              fontFamily: 'Poppins, sans-serif', // Keeping Poppins for branding
              fontWeight: 500, // Slightly bolder
              letterSpacing: '0.04em', // Fine-tuned letter spacing
              cursor: 'pointer',
              userSelect: 'none',
              // paddingRight: 2, // Padding handled by parent Box
              // paddingLeft: isMobile ? 1 : 3, // Padding handled by parent Box
              transition: 'color 0.3s ease-in-out',
              '&:hover': {
                color: theme.palette.primary.light,
              }
            })}
          >
            SkyTerra
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', px: isMobile ? 1 : 2 }}>
            {/* Temporary diagnostic styling for AISearchBar container */}
            <Box sx={{
              width: '100%',
              maxWidth: '700px',
              // backgroundColor: 'transparent', // Temporarily make AISearchBar container transparent
              // backdropFilter: 'none' // Temporarily remove backdrop from container
            }}>
              <AISearchBar 
                onSearch={handleAISearch} 
                onLocationSearch={handleLocationSearch}
                // sx prop directly on AISearchBar might be needed if it's a styled component itself
                // For now, assuming AISearchBar internal styles are the source if issues persist.
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <>
                <IconButton
                  onClick={handleUserMenuOpen}
                  sx={(theme) => ({
                    backgroundColor: alpha(theme.palette.background.default, 0.6), // Subtle background
                    backdropFilter: 'blur(8px)', // Blur effect
                    border: `1px solid ${alpha(theme.palette.divider, 0.3)}`, // Subtle border
                    color: theme.palette.text.primary, // Primary text color for icon
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.7), // Hover effect
                    },
                  })}
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  anchorEl={userMenuAnchorEl}
                  open={Boolean(userMenuAnchorEl)}
                  onClose={handleUserMenuClose}
                  // MuiMenu styleOverrides will handle the paper styling.
                  // If specific overrides are needed here beyond what MuiMenu.styleOverrides.paper provides, they can be added.
                  // For now, relying on the global MuiMenu override.
                  // MenuListProps={{ sx: (theme) => ({
                  //   backgroundColor: alpha(theme.palette.background.paper, 0.85),
                  //   backdropFilter: 'blur(10px)',
                  //   border: `1px solid ${alpha(theme.palette.divider, 0.3)}`
                  // })}}
                >
                  <MenuItem onClick={() => { navigate('/dashboard'); handleUserMenuClose(); }} sx={{ color: (theme) => theme.palette.text.primary }}>Dashboard</MenuItem>
                  <MenuItem onClick={() => { navigate('/create-property'); handleUserMenuClose(); }} sx={{ color: (theme) => theme.palette.text.primary }}>Crear Propiedad</MenuItem>
                  {user && user.is_staff && (
                    <MenuItem onClick={() => { navigate('/admin/publications'); handleUserMenuClose(); }} sx={{ color: (theme) => theme.palette.text.primary }}>
                      Panel de Admin
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => { handleLogout(); handleUserMenuClose(); }} sx={{ color: (theme) => theme.palette.text.primary }}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={(theme) => ({
                  borderColor: alpha(theme.palette.primary.dark, 0.5), // Subtle primary border
                  color: theme.palette.primary.light,
                  fontWeight: 300, // Keep light weight for this button style
                  padding: theme.spacing(0.75, 1.5), // Adjusted padding
                  fontSize: theme.typography.pxToRem(13), // Finer font size control
                  backgroundColor: alpha(theme.palette.background.default, 0.6), // Subtle background
                  backdropFilter: 'blur(8px)', // Blur effect
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.dark, 0.3), // Hover effect
                  }
                })}
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
        {/* Alert inside Snackbar should ideally also use theme colors, but often has its own specific styling based on severity */}
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
          <Route path="/property/edit/:id" element={<ProtectedRoute user={user} element={<CreateProperty />} />} />
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
