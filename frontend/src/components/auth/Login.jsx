import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../../App';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // El backend espera el campo `username` que puede ser email o usuario
      await auth.handleLogin({ username: email, password });
      // El manejo de la navegación ya está en handleLogin en App.jsx
    } catch (err) {
      setError(err.message || 'Credenciales inválidas o error del servidor. Inténtalo de nuevo.');
      console.error('Login failed:', err);
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
          Bienvenido de nuevo
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Inicia sesión en tu cuenta
        </Typography>

        <Box component="form" onSubmit={handleEmailLogin} sx={{ width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo electrónico"
            name="email"
            autoComplete="off"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2, mb: 2, bgcolor: '#111111', '&:hover': { bgcolor: '#000000' } }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>

          <Box sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            '& .S9gUrf-YoZ4jf': {
              width: '100% !important'
            },
            '& iframe[title="Sign in with Google"]': {
              width: '100% !important'
            }
          }}>
            <GoogleLogin
              onSuccess={auth.handleGoogleLoginSuccess}
              onError={auth.handleGoogleLoginError}
              useOneTap
              theme="filled_black"
              text="signin_with"
              shape="rectangular"
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/signup')}
              sx={{ color: '#111111', fontWeight: 500 }}
            >
              ¿No tienes cuenta? Regístrate
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/')}
              sx={{ color: '#6B7280' }}
            >
              Volver al inicio
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
