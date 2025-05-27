import React, { useState, useEffect, useMemo, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
  Paper, // Para los elementos flotantes
  Fab, // Para el botón de filtros flotante
  CircularProgress, // Para el loading state
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

import MapView from './components/map/MapView';
import FilterPanel from './components/ui/FilterPanel';
import PropertyDetails from './components/property/PropertyDetails';
import TourViewer from './components/tours/TourViewer';
import AuthPage, { LoginForm, RegisterForm } from './components/ui/AuthForms';
import Dashboard from './components/ui/Dashboard';
import AISearchBar from './components/ui/AISearchBar';
import CreateProperty from './components/property/CreateProperty';
import { authService } from './services/api'; // propertyService y tourService ya no se usan aquí directamente
import './App.css';

// Create a context for theme mode
export const ThemeModeContext = React.createContext({
  toggleThemeMode: () => {},
  mode: 'light',
});

// Main App component that provides the theme
const AppWrapper = () => {
  const mode = 'dark'; // Always dark mode

  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => {
        // No-op: theme is always dark
      },
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
            main: '#58a6ff', // Azul vibrante
            light: '#7FBFFF',
            dark: '#005DB3',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#f6d55c', // Amarillo/naranja
            contrastText: '#000000',
          },
          background: {
            default: '#0d1117', // Fondo Github dark
            paper: '#161b22', // Papel Github dark
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
          body1: { fontWeight: 300, lineHeight: 1.65 }, // Peso más delgado
          body2: { fontWeight: 300, lineHeight: 1.55 },
          button: { fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em', fontSize: '0.9rem' },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8, // Bordes ligeramente menos redondeados
                padding: '8px 20px', // Padding ajustado
                boxShadow: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }
              },
            },
          },
          MuiPaper: { // Estilo base para todos los papeles, incluyendo los flotantes
            styleOverrides: {
              root: {
                borderRadius: 12,
                border: '1px solid #30363d',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                // Transparencia y blur para elementos flotantes (se puede aplicar específicamente)
                // backgroundColor: mode === 'dark' ? 'rgba(22, 27, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                // backdropFilter: 'blur(10px)', 
              },
            },
          },
          // AppBar ya no se usa globalmente, se elimina su MuiAppBar override
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  backgroundColor: 'rgba(13, 17, 23, 0.7)', // Fondo translúcido para inputs
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
          MuiCard: { // Ajustes para popups de mapa y otros cards
            styleOverrides: {
              root: {
                borderRadius: 12,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // No hover effect by default on all cards, apply specifically if needed
              }
            }
          },
        },
        shape: {
          borderRadius: 8,
        },
        // Sombras actualizadas para modo oscuro
        shadows: Array(25).fill('none').map((_, index) => {
          if (index === 0) return 'none';
          const y = index;
          const blur = index * 2.5;
          const alpha = 0.2 + index * 0.02; // Sombras para modo oscuro
          return `0 ${y}px ${blur}px rgba(0,0,0, ${Math.min(alpha, 0.7)})`;
        }),
      }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App /> {/* El componente App ahora manejará el layout minimalista */}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};


// Ruta protegida que redirige a login si no hay usuario autenticado
const ProtectedRoute = ({ user, element }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

// Nuevo Layout principal para el diseño minimalista
function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  // const [authError, setAuthError] = useState(null); // No parece usarse
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false); // Filtros cerrados por defecto

  const { mode } = useContext(ThemeModeContext); // Obtener modo del contexto (siempre dark)
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const mapRef = React.useRef(null);

  const [globalFilters, setGlobalFilters] = useState({
    priceMin: 0, priceMax: 500000, sizeMin: 0, sizeMax: 200,
    propertyTypes: [], hasWater: false, hasViews: false, has360Tour: false,
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoadingAuth(false);
  }, []);
  
  const handleAISearch = (aiGeneratedFilters) => {
    if (!aiGeneratedFilters) return;
    console.log('AI search response:', aiGeneratedFilters);
    const suggestedFilters = aiGeneratedFilters.suggestedFilters || {};
    const newFilters = {
      ...globalFilters,
      priceMin: suggestedFilters.priceRange ? suggestedFilters.priceRange[0] : globalFilters.priceMin,
      priceMax: suggestedFilters.priceRange ? suggestedFilters.priceRange[1] : globalFilters.priceMax,
      propertyTypes: suggestedFilters.propertyTypes || globalFilters.propertyTypes,
      hasWater: suggestedFilters.features?.includes('hasWater') ?? globalFilters.hasWater,
      hasViews: suggestedFilters.features?.includes('hasViews') ?? globalFilters.hasViews,
      has360Tour: suggestedFilters.features?.includes('has360Tour') ?? globalFilters.has360Tour,
      aiResponse: aiGeneratedFilters,
    };
    setGlobalFilters(newFilters);
    // Abrir filtros si se hizo una búsqueda AI y no están abiertos (opcional)
    // if (!isFilterPanelOpen) setIsFilterPanelOpen(true);
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
      setUser(userData.user || userData); // Manejar ambos formatos de respuesta
      console.log('Login successful, redirecting...');
      window.location.href = '/'; // Redirigir a la página principal
    } catch (error) {
      console.error("Login failed:", error);
      alert("Error de inicio de sesión: " + error.message);
    }
  };

  const handleRegister = async (userData) => {
    try {
      await authService.register(userData);
      // setAuthError(null);
      alert('Registration successful! Please login.');
      window.location.href = '/login';
    } catch (error) {
      console.error("Registration failed:", error);
      // setAuthError(error.message || 'Failed to register');
       alert("Registration failed: " + (JSON.stringify(error.response?.data) || error.message || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/login';
  };

  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };
  
  // Para el menú de usuario flotante
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const handleUserMenuOpen = (event) => setUserMenuAnchorEl(event.currentTarget);
  const handleUserMenuClose = () => setUserMenuAnchorEl(null);


  if (loadingAuth) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Router>
      <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
        {/* MapView siempre de fondo y pantalla completa */}
        <MapView ref={mapRef} filters={globalFilters} />

        {/* Logo SkyTerra Flotante */}
        <Typography
          variant="h4"
          sx={{
            position: 'absolute',
            top: isMobile ? '16px' : '24px',
            left: isMobile ? '16px' : '24px',
            zIndex: 10,
            color: '#ffffff', // Siempre blanco para contraste con el mapa
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
          onClick={() => window.location.href = '/'}
        >
          SKYTERRA
        </Typography>

        {/* Barra de Búsqueda AI Flotante (Estilo Google Earth) */}
        <Box
          sx={{
            position: 'absolute',
            top: isMobile ? '60px' : '24px', // Más abajo en mobile para no tapar el logo
            left: '50%',
            transform: 'translateX(-50%)',
            width: isMobile ? 'calc(100% - 32px)' : 'clamp(400px, 50vw, 700px)', // Ancho adaptable
            zIndex: 10,
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <Paper 
            elevation={12} 
            sx={{ 
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '50px', // Totalmente circular
              padding: '4px 8px', // Padding ajustado para forma circular
              border: '1px solid rgba(88, 166, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <AISearchBar onSearch={handleAISearch} onLocationSearch={handleLocationSearch} />
          </Paper>
        </Box>

        {/* Controles de Usuario y Tema Flotantes */}
        <Box
          sx={{
            position: 'absolute',
            top: isMobile ? '16px' : '24px',
            right: isMobile ? '16px' : '24px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 1 : 1.5,
          }}
        >
          {user ? (
            <>
              <IconButton onClick={handleUserMenuOpen} sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)'} }}>
                <AccountCircleIcon />
              </IconButton>
              <Menu
                anchorEl={userMenuAnchorEl}
                open={Boolean(userMenuAnchorEl)}
                onClose={handleUserMenuClose}
                MenuListProps={{ sx: { backgroundColor: '#161b22'} }}
              >
                <MenuItem onClick={() => { handleUserMenuClose(); window.location.href = '/dashboard'; }}>Mi Panel</MenuItem>
                <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
              </Menu>
            </>
          ) : (
            <Button 
              variant="contained" 
              onClick={() => window.location.href = '/login'}
              sx={{ 
                color: 'white',
                backgroundColor: 'rgba(88, 166, 255, 0.7)',
                backdropFilter: 'blur(5px)',
                '&:hover': {
                  backgroundColor: 'rgba(88, 166, 255, 0.9)',
                },
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              Sign In
            </Button>
          )}
        </Box>

        {/* Botón Flotante para Abrir/Cerrar Filtros */}
        {!isMobile && ( // En desktop, un Fab más pequeño y elegante
             <Fab 
                size="medium"
                aria-label="filters" 
                onClick={toggleFilterPanel}
                sx={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '30px',
                    zIndex: 10,
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'rgba(22, 27, 34, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                    color: '#c9d1d9',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    '&:hover': {
                       backgroundColor: 'rgba(22, 27, 34, 0.95)',
                       borderColor: 'rgba(88, 166, 255, 0.4)',
                       transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease-in-out'
                }}
            >
                {isFilterPanelOpen ? <CloseIcon sx={{ fontSize: '20px' }} /> : <FilterListIcon sx={{ fontSize: '20px' }} />}
            </Fab>
        )}
        {isMobile && ( // En mobile, más pequeño y elegante
             <IconButton 
                aria-label="filters" 
                onClick={toggleFilterPanel}
                sx={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 10,
                    width: '44px',
                    height: '44px',
                    backgroundColor: 'rgba(22, 27, 34, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                    color: '#c9d1d9',
                    borderRadius: '50%',
                    '&:hover': {
                       backgroundColor: 'rgba(22, 27, 34, 0.95)',
                       borderColor: 'rgba(88, 166, 255, 0.4)',
                    }
                }}
            >
                {isFilterPanelOpen ? <CloseIcon sx={{ fontSize: '18px' }} /> : <FilterListIcon sx={{ fontSize: '18px' }} />}
            </IconButton>
        )}


        {/* Panel de Filtros Flotante */}
        <FilterPanel
          onApplyFilters={(newFilters) => {
            setGlobalFilters(newFilters);
            if (isMobile && isFilterPanelOpen) setIsFilterPanelOpen(false); // Cerrar en mobile después de aplicar
          }}
          open={isFilterPanelOpen}
          onClose={toggleFilterPanel} // Reutilizar toggleFilterPanel
          onOpen={toggleFilterPanel}  // Reutilizar toggleFilterPanel
          currentFilters={globalFilters}
          externalFilters={globalFilters.aiResponse}
          isMobile={isMobile} // Pasar prop para estilos condicionales dentro del panel
          sx={{ // Estilos para hacerlo flotante
            position: 'absolute',
            top: isMobile ? 0 : 'auto', // Ocupa toda la pantalla en mobile si está abierto
            bottom: isMobile ? 'auto' : (isFilterPanelOpen ? '90px' : '-100vh'), // Animación y posición en desktop
            left: isMobile ? 0 : '30px', // Posición en desktop
            width: isMobile ? '100vw' : 'clamp(320px, 25vw, 400px)',
            height: isMobile ? '100vh' : 'auto',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 180px)', // Altura máxima en desktop
            zIndex: 15, // Sobre el mapa y otros controles flotantes bajos
            transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
            transform: isFilterPanelOpen ? 'translateY(0)' : (isMobile ? 'translateY(100vh)' : 'translateY(calc(100% + 90px))'),
            opacity: isFilterPanelOpen ? 1 : 0,
            pointerEvents: isFilterPanelOpen ? 'auto' : 'none',
            // El Paper dentro de FilterPanel debería tener el backdropFilter y backgroundColor
          }}
        />
        
        {/* Rutas para otras páginas (Auth, PropertyDetails, etc.) */}
        {/* Estas rutas ahora renderizarán sus componentes sobre el mapa si no tienen su propio fondo */}
        <Box sx={{position: 'relative', zIndex: 20}}> {/* Contenedor para rutas que deben estar sobre todo */}
            <Routes>
            {/* La ruta principal "/" ya está cubierta por MapView como fondo */}
            <Route path="/property/:id" element={<PropertyDetails />} />
            <Route path="/tour/:id" element={<TourViewer />} />
            <Route path="/login" element={<AuthPage onLogin={handleLogin} onRegister={handleRegister} />} />
            <Route path="/register" element={<AuthPage onLogin={handleLogin} onRegister={handleRegister} />} />
            <Route path="/dashboard" element={<ProtectedRoute user={user} element={<Dashboard />} />} />
            <Route path="/create-property" element={<ProtectedRoute user={user} element={<CreateProperty />} />} />
            {/* Puedes agregar una ruta para "/" si necesitas un componente específico además del mapa */}
            {/* <Route path="/" element={<HomePageContent />} /> */}
            </Routes>
        </Box>

      </Box>
    </Router>
  );
}

export default AppWrapper;
