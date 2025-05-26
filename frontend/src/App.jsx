import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useTheme as useMuiTheme,
  useMediaQuery
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu'; // For mobile filter toggle
import FilterListIcon from '@mui/icons-material/FilterList'; // For desktop filter toggle
import MapView from './components/map/MapView';
import FilterPanel from './components/ui/FilterPanel';
import PropertyDetails from './components/property/PropertyDetails';
import TourViewer from './components/tours/TourViewer';
import AuthPage, { LoginForm, RegisterForm } from './components/ui/AuthForms';
import Dashboard from './components/ui/Dashboard';
import AISearchBar from './components/ui/AISearchBar';
import CreateProperty from './components/property/CreateProperty';
import { authService, propertyService, tourService } from './services/api';
import './App.css';

// Create a context for theme mode
export const ThemeModeContext = React.createContext({
  toggleThemeMode: () => {},
  mode: 'light',
});

// Main App component that provides the theme
const AppWrapper = () => {
  const [mode, setMode] = useState('dark'); // Default to dark mode

  const themeMode = React.useMemo(
    () => ({
      toggleThemeMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode, // Use the mode from state
          primary: {
            main: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
            light: mode === 'dark' ? '#74b9ff' : '#2c5282',
            dark: mode === 'dark' ? '#2c5282' : '#0a1628',
            contrastText: '#ffffff',
          },
          secondary: {
            main: mode === 'dark' ? '#f6d55c' : '#64748b',
            light: mode === 'dark' ? '#fff176' : '#94a3b8',
            dark: mode === 'dark' ? '#f57f17' : '#475569',
          },
          background: {
            default: mode === 'dark' ? '#0a1628' : '#f8fafc',
            paper: mode === 'dark' ? '#1e3a5f' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#ffffff' : '#0f172a',
            secondary: mode === 'dark' ? '#e2f4ff' : '#475569',
          },
          divider: mode === 'dark' ? '#2c5282' : '#e2e8f0',
          action: {
            hover: mode === 'dark' ? 'rgba(74, 144, 194, 0.08)' : 'rgba(30, 58, 95, 0.04)',
            selected: mode === 'dark' ? 'rgba(74, 144, 194, 0.12)' : 'rgba(30, 58, 95, 0.08)',
          }
        },
        typography: {
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", sans-serif',
          h1: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          },
          h2: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          h3: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          h4: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 600,
            letterSpacing: '0em',
          },
          h5: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            letterSpacing: '0em',
          },
          h6: { 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.01em',
          },
          body1: {
            fontWeight: 400,
            lineHeight: 1.6,
          },
          body2: {
            fontWeight: 400,
            lineHeight: 1.5,
          },
          button: {
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: '0.02em',
          }
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '10px 24px',
                boxShadow: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(30, 58, 95, 0.15)',
                  transform: 'translateY(-1px)',
                }
              },
              containedPrimary: {
                backgroundColor: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? '#2c5282' : '#2c5282',
                  boxShadow: '0 6px 20px rgba(30, 58, 95, 0.2)',
                }
              },
              outlinedPrimary: {
                borderColor: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                color: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                borderWidth: '1.5px',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(74, 144, 194, 0.08)' : 'rgba(30, 58, 95, 0.04)',
                  borderColor: mode === 'dark' ? '#2c5282' : '#2c5282',
                  borderWidth: '1.5px',
                }
              },
              textPrimary: {
                color: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(74, 144, 194, 0.08)' : 'rgba(30, 58, 95, 0.04)',
                }
              }
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'dark' 
                  ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
                  : '0 2px 12px rgba(30, 58, 95, 0.08)',
                border: mode === 'dark' ? '1px solid #2c5282' : '1px solid #e2e8f0',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#1e3a5f' : '#ffffff',
                color: mode === 'dark' ? '#ffffff' : '#1e3a5f',
                boxShadow: mode === 'dark' 
                  ? '0 2px 12px rgba(0, 0, 0, 0.2)' 
                  : '0 1px 8px rgba(30, 58, 95, 0.08)',
                backdropFilter: 'blur(8px)',
                borderBottom: mode === 'dark' ? '1px solid #2c5282' : '1px solid #e2e8f0',
              }
            }
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 12,
                  '& fieldset': {
                    borderColor: mode === 'dark' ? '#2c5282' : '#e2e8f0',
                    borderWidth: '1.5px',
                  },
                  '&:hover fieldset': {
                    borderColor: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                    borderWidth: '2px',
                  },
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: mode === 'dark' 
                    ? '0 12px 40px rgba(0, 0, 0, 0.4)' 
                    : '0 8px 32px rgba(30, 58, 95, 0.12)',
                }
              }
            }
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                fontWeight: 500,
              },
              colorPrimary: {
                backgroundColor: mode === 'dark' ? '#4a90c2' : '#1e3a5f',
                color: '#ffffff',
              }
            }
          }
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          '0 1px 3px rgba(30, 58, 95, 0.04)',
          '0 2px 6px rgba(30, 58, 95, 0.06)',
          '0 4px 12px rgba(30, 58, 95, 0.08)',
          '0 6px 16px rgba(30, 58, 95, 0.10)',
          '0 8px 20px rgba(30, 58, 95, 0.12)',
          '0 10px 24px rgba(30, 58, 95, 0.14)',
          '0 12px 28px rgba(30, 58, 95, 0.16)',
          '0 14px 32px rgba(30, 58, 95, 0.18)',
          '0 16px 36px rgba(30, 58, 95, 0.20)',
          '0 18px 40px rgba(30, 58, 95, 0.22)',
          '0 20px 44px rgba(30, 58, 95, 0.24)',
          '0 22px 48px rgba(30, 58, 95, 0.26)',
          '0 24px 52px rgba(30, 58, 95, 0.28)',
          '0 26px 56px rgba(30, 58, 95, 0.30)',
          '0 28px 60px rgba(30, 58, 95, 0.32)',
          '0 30px 64px rgba(30, 58, 95, 0.34)',
          '0 32px 68px rgba(30, 58, 95, 0.36)',
          '0 34px 72px rgba(30, 58, 95, 0.38)',
          '0 36px 76px rgba(30, 58, 95, 0.40)',
          '0 38px 80px rgba(30, 58, 95, 0.42)',
          '0 40px 84px rgba(30, 58, 95, 0.44)',
          '0 42px 88px rgba(30, 58, 95, 0.46)',
          '0 44px 92px rgba(30, 58, 95, 0.48)',
          '0 46px 96px rgba(30, 58, 95, 0.50)'
        ],
        transitions: {
          duration: {
            shortest: 150,
            shorter: 200,
            short: 250,
            standard: 300,
            enteringScreen: 225,
            leavingScreen: 195,
            complex: 375,
            themeChange: 500,
          },
          easing: {
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
          },
        },
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
}

// Component principal para la vista del mapa con filtros
const MapWithFilters = ({ isFilterPanelOpen, toggleFilterPanel, globalFilters, setGlobalFilters, mapRef }) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleApplyFiltersFromPanel = (newFiltersFromPanel) => {
    setGlobalFilters(newFiltersFromPanel);
    if (isMobile) {
      setMobileFiltersOpen(false);
    }
  };

  const toggleMobileFiltersDrawer = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      <FilterPanel 
        onApplyFilters={handleApplyFiltersFromPanel}
        open={isMobile ? mobileFiltersOpen : isFilterPanelOpen}
        onClose={isMobile ? toggleMobileFiltersDrawer : toggleFilterPanel}
        onOpen={isMobile ? toggleMobileFiltersDrawer : toggleFilterPanel}
        currentFilters={globalFilters}
        externalFilters={globalFilters.aiResponse}
      />
      <Box sx={{ flexGrow: 1, position: 'relative', height: '100%', transition: 'margin-left 0.3s' }}>
        <MapView ref={mapRef} filters={globalFilters} />
      </Box>
    </Box>
  );
};

// Componente de barra de navegación
const NavBar = ({ user, onLogout, onToggleFilterPanel, onAISearch, onLocationSearch }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const themeModeContext = React.useContext(ThemeModeContext);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={1} 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + (isMobile ? 1 : 2),
      }}
    >
      <Toolbar sx={{ 
        minHeight: '64px',
        px: { xs: 1, md: 2 }, // Reduced padding on sides
      }}>
        {/* Botón para mostrar/ocultar el panel de filtros en desktop */}
        {!isMobile && (
          <IconButton
            color="inherit"
            aria-label="toggle filter panel"
            edge="start"
            onClick={onToggleFilterPanel} // Este es el prop que llama a la función en App.jsx
            sx={{ mr: 1 }}
          >
            <FilterListIcon />
          </IconButton>
        )}
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            letterSpacing: 1,
            mr: 2
          }}
        >
          <Button 
            color="inherit" 
            href="/" 
            sx={{ 
              textTransform: 'none', 
              fontSize: '1.4rem',
              fontWeight: 'bold',
              px: 1
            }}
          >
            SkyTerra
          </Button>
        </Typography>

        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          justifyContent: 'flex-start', 
          mr: 2,
          maxWidth: '800px'
        }}>
          <AISearchBar onSearch={onAISearch} onLocationSearch={onLocationSearch} />
        </Box>

        <IconButton sx={{ ml: 1 }} onClick={themeModeContext.toggleThemeMode} color="inherit">
          {muiTheme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        {user ? (
          <div>
            <IconButton size="large" onClick={handleMenu} color="inherit">
              <AccountCircleIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { handleClose(); window.location.href = '/dashboard'; }}>Mi Panel</MenuItem>
              <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
            </Menu>
          </div>
        ) : (
          <Button color="primary" variant="outlined" href="/login" sx={{ml: 1}}>
            Iniciar Sesión
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

// Ruta protegida que redirige a login si no hay usuario autenticado
const ProtectedRoute = ({ user, element }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const mapRef = React.useRef(null); // Referencia al mapa

  const [globalFilters, setGlobalFilters] = useState({
    priceMin: 0,
    priceMax: 500000,
    sizeMin: 0,
    sizeMax: 200,
    propertyTypes: [],
    hasWater: false,
    hasViews: false,
    has360Tour: false,
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoadingAuth(false);
  }, []);
  
  const handleAISearch = (aiGeneratedFilters) => {
    if (!aiGeneratedFilters) return;
    
    console.log('AI search response:', aiGeneratedFilters);
    
    // Extraemos los suggestedFilters
    const suggestedFilters = aiGeneratedFilters.suggestedFilters || {};
    
    const newFilters = {
      ...globalFilters,
      priceMin: suggestedFilters.priceRange ? suggestedFilters.priceRange[0] : globalFilters.priceMin,
      priceMax: suggestedFilters.priceRange ? suggestedFilters.priceRange[1] : globalFilters.priceMax,
      propertyTypes: suggestedFilters.propertyTypes || globalFilters.propertyTypes,
      hasWater: suggestedFilters.features?.includes('hasWater') ?? globalFilters.hasWater,
      hasViews: suggestedFilters.features?.includes('hasViews') ?? globalFilters.hasViews,
      has360Tour: suggestedFilters.features?.includes('has360Tour') ?? globalFilters.has360Tour,
      aiResponse: aiGeneratedFilters, // Guardar la respuesta completa de la IA
    };
    
    setGlobalFilters(newFilters);
  };

  // Nueva función para manejar la búsqueda de ubicaciones como Google Earth
  const handleLocationSearch = (locationData) => {
    if (!locationData || !mapRef.current) return;
    
    console.log('Flying to location:', locationData);
    
    // Usar la referencia del mapa para volar a la ubicación
    if (mapRef.current && mapRef.current.flyTo) {
      mapRef.current.flyTo({
        center: locationData.center,
        zoom: locationData.zoom,
        pitch: 45, // Ángulo para vista más dinámica
        bearing: 0,
        duration: 3000, // 3 segundos de vuelo
        essential: true
      });
    }
    
    // Opcional: mostrar notificación
    console.log(`Volando a ${locationData.locationName}...`);
  };

  const handleLogin = async (credentials) => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      window.location.href = '/dashboard';
    } catch (error) {
      setAuthError('Credenciales inválidas o error de conexión.');
      setLoadingAuth(false);
    }
  };

  const handleRegister = async (userData) => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      const data = await authService.register(userData);
      setUser(data.user);
      window.location.href = '/dashboard';
    } catch (error) {
      setAuthError('Error en el registro. Intente nuevamente.');
      setLoadingAuth(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/';
  };

  const toggleFilterPanel = () => {
    if (!isMobile) { // Solo para desktop
        setIsFilterPanelOpen(!isFilterPanelOpen);
    }
  };

  if (loadingAuth) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Cargando aplicación...</Typography>
      </Box>
    );
  }

  return (
    <Router>
      <NavBar 
        user={user} 
        onLogout={handleLogout} 
        onToggleFilterPanel={toggleFilterPanel} 
        onAISearch={handleAISearch} 
        onLocationSearch={handleLocationSearch} 
      />
      <Box sx={{
        paddingTop: isMobile ? '120px' : '64px',
        height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 64px)', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'background-color 1000ms ease',
        backgroundColor: muiTheme.palette.background.default,
      }}>
        <Routes>
          <Route 
            path="/" 
            element={<MapWithFilters 
                        isFilterPanelOpen={isFilterPanelOpen} 
                        toggleFilterPanel={toggleFilterPanel} 
                        globalFilters={globalFilters} 
                        setGlobalFilters={setGlobalFilters}
                        mapRef={mapRef}
                    />} 
          />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/tour/:tourId" element={<TourViewer />} />
          <Route 
            path="/property/create" 
            element={<ProtectedRoute user={user} element={<CreateProperty />} />} 
          />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <AuthPage onLogin={handleLogin} onRegister={handleRegister} loading={loadingAuth} error={authError} />}
          />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute user={user} element={<Dashboard user={user} />} />}
          />
        </Routes>
      </Box>
    </Router>
  );
}

// Export AppWrapper as the default export
export default AppWrapper;
