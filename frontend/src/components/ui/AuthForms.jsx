import React, { useState } from 'react';
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
  InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';

// Componente de formulario de inicio de sesión
export const LoginForm = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 400, width: '100%', mx: 'auto' }}>
      <Typography variant="h5" component="h1" align="center" gutterBottom>
        Iniciar Sesión
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </Box>
    </Paper>
  );
};

// Componente de formulario de registro
export const RegisterForm = ({ onRegister, loading, error }) => {
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
    setFormData({
      ...formData,
      [name]: value
    });

    // Limpiar errores al editar
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'El correo electrónico no es válido';
    }
    
    if (!formData.username) {
      errors.username = 'El nombre de usuario es obligatorio';
    }
    
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    
    if (Object.keys(errors).length === 0) {
      onRegister(formData);
    } else {
      setFormErrors(errors);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 400, width: '100%', mx: 'auto' }}>
      <Typography variant="h5" component="h1" align="center" gutterBottom>
        Crear Cuenta
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          label="Correo Electrónico"
          type="email"
          name="email"
          fullWidth
          required
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          autoFocus
          disabled={loading}
          error={!!formErrors.email}
          helperText={formErrors.email}
        />
        
        <TextField
          label="Nombre de Usuario"
          type="text"
          name="username"
          fullWidth
          required
          value={formData.username}
          onChange={handleChange}
          margin="normal"
          disabled={loading}
          error={!!formErrors.username}
          helperText={formErrors.username}
        />
        
        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          fullWidth
          required
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          disabled={loading}
          error={!!formErrors.password}
          helperText={formErrors.password}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <TextField
          label="Confirmar Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="confirmPassword"
          fullWidth
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          margin="normal"
          disabled={loading}
          error={!!formErrors.confirmPassword}
          helperText={formErrors.confirmPassword}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </Button>
      </Box>
    </Paper>
  );
};

// Componente para mostrar ambos formularios con opción de cambio
export const AuthPage = ({ onLogin, onRegister, loading, error }) => {
  const [mode, setMode] = useState('login'); // 'login' o 'register'

  return (
    <Box sx={{ py: 4, px: 2 }}>
      <Paper sx={{ p: 3, maxWidth: 400, width: '100%', mx: 'auto' }}>
        {mode === 'login' ? (
          <>
            <LoginForm onLogin={onLogin} loading={loading} error={error} />
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ¿No tienes una cuenta?
              </Typography>
              <Button 
                color="secondary" 
                onClick={() => setMode('register')}
              >
                Crear cuenta
              </Button>
            </Box>
          </>
        ) : (
          <>
            <RegisterForm onRegister={onRegister} loading={loading} error={error} />
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ¿Ya tienes una cuenta?
              </Typography>
              <Button 
                color="secondary" 
                onClick={() => setMode('login')}
              >
                Iniciar sesión
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AuthPage; 