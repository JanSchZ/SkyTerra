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
  Fade
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';

// Estilos comunes para los TextField
const commonTextFieldStyles = {
  '& .MuiInputLabel-root': {
    color: '#8b949e', 
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#58a6ff',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    color: '#c9d1d9',
    borderRadius: '8px',
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(88, 166, 255, 0.2)',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(88, 166, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#58a6ff',
      borderWidth: '1px',
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#e57373',
    fontSize: '0.75rem',
    fontWeight: 300,
  }
};

// Componente de formulario de inicio de sesión
export const LoginForm = ({ onLogin, loading, error, onSwitchToRegister, onClose }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) onLogin({ login_identifier: loginIdentifier, password });
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
          label="Email o Nombre de Usuario"
          type="text"
          fullWidth
          required
          value={loginIdentifier}
          onChange={(e) => setLoginIdentifier(e.target.value)}
          margin="normal"
          autoFocus
          disabled={loading}
          sx={commonTextFieldStyles}
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
          sx={commonTextFieldStyles}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#8b949e' }}>
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
            mt: 3, mb: 2, py: 1.5, borderRadius: '8px',
            backgroundColor: '#58a6ff', 
            fontWeight: 400,
            letterSpacing: '0.02em',
            textTransform: 'none',
            '&:hover': { backgroundColor: '#4a90e2' }
          }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>
        
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography 
            variant="body2" 
            component="a" 
            href="/password-reset"
            sx={{ 
              color: '#58a6ff', 
              textDecoration: 'none',
              fontWeight: 300,
              fontSize: '0.875rem',
              '&:hover': { 
                textDecoration: 'underline',
                color: '#4a90e2'
              }
            }}
          >
            ¿Olvidaste tu contraseña?
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2, borderColor: 'rgba(88, 166, 255, 0.1)' }} />
        <Typography variant="body2" align="center" sx={{ color: '#8b949e', fontWeight: 300 }}>
          ¿No tienes una cuenta?
          <Button onClick={onSwitchToRegister} sx={{ color: '#58a6ff', fontWeight: 400, textTransform: 'none', p:0.5 }}>
            Crear cuenta
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

// Componente de formulario de registro
export const RegisterForm = ({ onRegister, loading, error, onSwitchToLogin, onClose }) => {
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
    
    // Validación del email
    if (!formData.email) {
      errors.email = 'El correo es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Correo no válido';
    }
    
    // Validación del username
    if (!formData.username) {
      errors.username = 'El usuario es obligatorio';
    } else if (formData.username.length < 3) {
      errors.username = 'El usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'El usuario solo puede contener letras, números y guiones bajos';
    }
    
    // Validación de la contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      errors.password = 'Mínimo 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Debe contener al menos una minúscula, una mayúscula y un número';
    }
    
    // Validación de confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🔄 Formulario de registro enviado:', {
      email: formData.email,
      username: formData.username,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });
    
    const errors = validateForm();
    if (Object.keys(errors).length === 0) {
      console.log('✅ Validación exitosa, enviando datos...');
      const userData = {
        email: formData.email, 
        username: formData.username, 
        password: formData.password
      };
      if (onRegister) onRegister(userData);
    } else {
      console.log('❌ Errores de validación:', errors);
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
        <TextField label="Correo Electrónico" type="email" name="email" fullWidth required value={formData.email} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.email} helperText={formErrors.email} sx={commonTextFieldStyles} />
        <TextField label="Nombre de Usuario" type="text" name="username" fullWidth required value={formData.username} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.username} helperText={formErrors.username} sx={commonTextFieldStyles} />
        <TextField label="Contraseña" type={showPassword ? 'text' : 'password'} name="password" fullWidth required value={formData.password} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.password} helperText={formErrors.password} sx={commonTextFieldStyles} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#8b949e' }}>{showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}</IconButton></InputAdornment>)}} />
        <TextField label="Confirmar Contraseña" type={showPassword ? 'text' : 'password'} name="confirmPassword" fullWidth required value={formData.confirmPassword} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.confirmPassword} helperText={formErrors.confirmPassword} sx={commonTextFieldStyles} />
        
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '8px', backgroundColor: '#58a6ff', fontWeight: 400, letterSpacing: '0.02em', textTransform: 'none', '&:hover': { backgroundColor: '#4a90e2' } }} disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null} >
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </Button>
        <Divider sx={{ my: 2, borderColor: 'rgba(88, 166, 255, 0.1)' }} />
        <Typography variant="body2" align="center" sx={{ color: '#8b949e', fontWeight: 300 }}>
          ¿Ya tienes una cuenta?
          <Button onClick={onSwitchToLogin} sx={{ color: '#58a6ff', fontWeight: 400, textTransform: 'none', p: 0.5 }}>
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
          backgroundColor: 'rgba(13, 17, 23, 0.7)',
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
            borderRadius: '16px',
            backgroundColor: '#101418',
            border: '1px solid rgba(88, 166, 255, 0.15)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}
        >
          <IconButton 
            onClick={handleClose}
            sx={{ 
              position: 'absolute', 
              top: 12, 
              right: 12, 
              color: '#8b949e',
              backgroundColor: 'rgba(255,255,255,0.05)',
              '&:hover': { 
                color: '#c9d1d9',
                backgroundColor: 'rgba(255,255,255,0.1)',
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