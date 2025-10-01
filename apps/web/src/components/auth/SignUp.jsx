import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { AuthContext } from '../../App';

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password2: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const handleInputChange = (field) => (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors when the user edits inputs
    setFieldErrors(prev => {
      if (!prev || Object.keys(prev).length === 0) return prev;

      const next = { ...prev };
      if (field === 'password') {
        delete next.password;
        delete next.password1;
      } else if (field === 'password2') {
        delete next.password2;
      } else if (next[field]) {
        delete next[field];
      }

      return next;
    });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    // Basic client-side validation
    const errors = {};
    if (!formData.email) errors.email = 'El correo electrónico es requerido';
    if (!formData.username) errors.username = 'El nombre de usuario es requerido';
    if (!formData.password) errors.password = 'La contraseña es requerida';
    if (!formData.password2) errors.password2 = 'Debes confirmar tu contraseña';
    if (formData.password !== formData.password2) {
      errors.password2 = 'Las contraseñas no coinciden';
    }
    if (formData.password && formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        username: formData.username,
        password1: formData.password,
        password2: formData.password2
      };

      await auth.handleRegister(payload);
      // El manejo de la navegación ya está en handleRegister en App.jsx
    } catch (err) {
      // Handle specific field errors from backend
      if (err.response?.data) {
        const backendErrors = {};
        let generalError = null;

        Object.entries(err.response.data).forEach(([key, value]) => {
          const message = Array.isArray(value) ? value[0] : value;

          switch (key) {
            case 'password':
            case 'password1':
              backendErrors.password = message;
              break;
            case 'password2':
              backendErrors.password2 = message;
              break;
            case 'email':
            case 'username':
              backendErrors[key] = message;
              break;
            case 'non_field_errors':
            case 'detail':
              generalError = message;
              break;
            default:
              backendErrors[key] = message;
          }
        });

        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
        }
        if (generalError) {
          setError(generalError);
        }
      } else {
        setError(err.message || 'Error en el registro. Inténtalo de nuevo.');
      }
      console.error('Sign up failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Box
        sx={{
          width: '100%',
          p: 3,
          borderRadius: 2,
          bgcolor: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        <Typography component="h1" variant="h4" sx={{ color: '#111111', mb: 1, fontWeight: 600 }}>
          Crear cuenta
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Regístrate para acceder a SkyTerra
        </Typography>

        <Box component="form" onSubmit={handleSignUp} sx={{ width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo electrónico"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleInputChange('email')}
            disabled={loading}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Nombre de usuario"
            name="username"
            autoComplete="username"
            value={formData.username}
            onChange={handleInputChange('username')}
            disabled={loading}
            error={!!fieldErrors.username}
            helperText={fieldErrors.username}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Contraseña"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleInputChange('password')}
            disabled={loading}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password2"
            label="Confirmar contraseña"
            type="password"
            id="password2"
            autoComplete="new-password"
            value={formData.password2}
            onChange={handleInputChange('password2')}
            disabled={loading}
            error={!!fieldErrors.password2}
            helperText={fieldErrors.password2}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 2, bgcolor: '#111111', '&:hover': { bgcolor: '#000000' } }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Crear cuenta'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ color: '#6B7280' }}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SignUp;
