import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Fade,
  useTheme, // Import useTheme
  alpha // Import alpha
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';

// Estilos comunes para los TextField, now a function of theme
const commonTextFieldStyles = (theme) => ({
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: theme.palette.primary.main,
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: alpha(theme.palette.background.paper, 0.85), // theme-aware
    color: theme.palette.text.primary,
    borderRadius: '8px', // Or theme.shape.borderRadius
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    '& fieldset': {
      borderColor: alpha(theme.palette.primary.main, 0.3), // theme-aware
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: alpha(theme.palette.primary.main, 0.5), // theme-aware
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main, // theme-aware
      borderWidth: '1px', // Keep consistent or use 2px if preferred from global theme
    },
  },
  '& .MuiFormHelperText-root': {
    color: theme.palette.error.light, // theme-aware
    fontSize: '0.75rem',
    fontWeight: 300,
  }
});

// Componente de formulario de inicio de sesión
export const LoginForm = ({ onLogin, loading, error, onSwitchToRegister, onClose }) => {
  const theme = useTheme(); // Get theme for applying styles
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) onLogin({ email, password });
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 300, color: '#c9d1d9', mb: 1, textAlign: 'center' }}>
        Iniciar Sesión
      </Typography>
      <Typography variant="body2" sx={{ color: '#8b949e', mb: 4, textAlign: 'center', fontWeight: 300 }}>
        Bienvenido de nuevo a SkyTerra.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
          {typeof error === 'object' ? JSON.stringify(error) : error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
        <TextField
          label="Correo Electrónico"
          type="email"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          autoFocus
          disabled={loading}
          sx={commonTextFieldStyles(theme)}
        />
        
        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          disabled={loading}
          sx={commonTextFieldStyles(theme)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: theme.palette.text.secondary }}>
                  {showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ 
            mt: 3, mb: 2, py: 1.5, borderRadius: theme.shape.borderRadius, // Use theme border radius
            backgroundColor: theme.palette.primary.main,
            fontWeight: 400,
            letterSpacing: '0.02em',
            textTransform: 'none',
            '&:hover': { backgroundColor: theme.palette.primary.dark }
          }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>
        <Divider sx={{ my: 2, borderColor: alpha(theme.palette.primary.main, 0.2) }} />
        <Typography variant="body2" align="center" sx={{ color: theme.palette.text.secondary, fontWeight: 300 }}>
          ¿No tienes una cuenta?
          <Button onClick={onSwitchToRegister} sx={{ color: theme.palette.primary.light, fontWeight: 400, textTransform: 'none', p:0.5 }}>
            Crear cuenta
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

// Componente de formulario de registro
export const RegisterForm = ({ onRegister, loading, error, onSwitchToLogin, onClose }) => {
  const theme = useTheme(); // Get theme for applying styles
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email) errors.email = 'El correo es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Correo no válido';
    if (!formData.username) errors.username = 'El usuario es obligatorio';
    if (!formData.password) errors.password = 'La contraseña es obligatoria';
    else if (formData.password.length < 8) errors.password = 'Mínimo 8 caracteres';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length === 0) {
      if (onRegister) onRegister({email: formData.email, username: formData.username, password: formData.password});
    } else {
      setFormErrors(errors);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 300, color: '#c9d1d9', mb: 1, textAlign: 'center' }}>
        Crear Cuenta
      </Typography>
      <Typography variant="body2" sx={{ color: '#8b949e', mb: 4, textAlign: 'center', fontWeight: 300 }}>
        Únete a SkyTerra para explorar propiedades.
      </Typography>
      
      {error && (
         <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
           {typeof error === 'object' ? JSON.stringify(error) : error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
        <TextField label="Correo Electrónico" type="email" name="email" fullWidth required value={formData.email} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.email} helperText={formErrors.email} sx={commonTextFieldStyles(theme)} />
        <TextField label="Nombre de Usuario" type="text" name="username" fullWidth required value={formData.username} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.username} helperText={formErrors.username} sx={commonTextFieldStyles(theme)} />
        <TextField label="Contraseña" type={showPassword ? 'text' : 'password'} name="password" fullWidth required value={formData.password} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.password} helperText={formErrors.password} sx={commonTextFieldStyles(theme)} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: theme.palette.text.secondary }}>{showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}</IconButton></InputAdornment>)}} />
        <TextField label="Confirmar Contraseña" type={showPassword ? 'text' : 'password'} name="confirmPassword" fullWidth required value={formData.confirmPassword} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.confirmPassword} helperText={formErrors.confirmPassword} sx={commonTextFieldStyles(theme)} />
        
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: theme.shape.borderRadius, backgroundColor: theme.palette.primary.main, fontWeight: 400, letterSpacing: '0.02em', textTransform: 'none', '&:hover': { backgroundColor: theme.palette.primary.dark } }} disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null} >
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </Button>
        <Divider sx={{ my: 2, borderColor: alpha(theme.palette.primary.main, 0.2) }} />
        <Typography variant="body2" align="center" sx={{ color: theme.palette.text.secondary, fontWeight: 300 }}>
          ¿Ya tienes una cuenta?
          <Button onClick={onSwitchToLogin} sx={{ color: theme.palette.primary.light, fontWeight: 400, textTransform: 'none', p: 0.5 }}>
            Iniciar sesión
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

// Main AuthPage component that acts as a modal-like container
const AuthPage = ({ formType, onLogin, onRegister }) => {
  // formType can be 'login' or 'register'
  const theme = useTheme(); // Get theme for main page container styles
  const [currentForm, setCurrentForm] = useState(formType || 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLoginSubmit = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      if (onLogin) await onLogin(credentials);
      // Navigation should be handled by the App component after successful login
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (onRegister) await onRegister(userData);
      // Navigation or message should be handled by App component
    } catch (err) {
      setError(err.message || 'Error al registrar.');
    }
    setIsLoading(false);
  };
  
  const handleClose = () => {
    navigate('/'); // Navigate to home or previous page on close
  };

  return (
    <Fade in={true} timeout={500}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(theme.palette.background.default, 0.7), // theme-aware backdrop
          backdropFilter: 'blur(10px)',
          zIndex: 1300,
        }}
      >
        <Paper 
          elevation={12} 
          sx={{ 
            position: 'relative',
            p: 0,
            width: '100%',
            maxWidth: '420px',
            borderRadius: '16px', // Or theme.shape.borderRadius * 2
            backgroundColor: theme.palette.background.paper, // theme-aware background
            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`, // theme-aware border
            boxShadow: theme.shadows[10], // Use a theme shadow
            overflow: 'hidden',
          }}
        >
          <IconButton 
            onClick={handleClose}
            sx={{ 
              position: 'absolute', 
              top: 12, 
              right: 12, 
              color: theme.palette.text.secondary,
              backgroundColor: alpha(theme.palette.background.default, 0.5), // theme-aware bg for button
              '&:hover': { 
                color: theme.palette.text.primary,
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
              } 
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {currentForm === 'login' ? (
            <LoginForm 
              onLogin={handleLoginSubmit} 
              loading={isLoading} 
              error={error}
              onSwitchToRegister={() => { setCurrentForm('register'); setError(null); }}
              onClose={handleClose}
            />
          ) : (
            <RegisterForm 
              onRegister={handleRegisterSubmit} 
              loading={isLoading} 
              error={error}
              onSwitchToLogin={() => { setCurrentForm('login'); setError(null); }}
              onClose={handleClose}
            />
          )}
        </Paper>
      </Box>
    </Fade>
  );
};

export default AuthPage; 