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
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#0d1117',
          padding: 3,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ color: '#c9d1d9', mb: 1 }}>
          Iniciar Sesión
        </Typography>
        <Typography variant="body2" sx={{ color: '#8b949e', mb: 4, textAlign: 'center' }}>
          Bienvenido de nuevo a SkyTerra
        </Typography>
        
        <Box component="form" onSubmit={handleEmailLogin} sx={{ mt: 1, width: '100%' }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo Electrónico o Usuario"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiInputLabel-root': { color: '#c9d1d9' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#e5e5e5',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#58a6ff' },
              },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Contraseña"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{
              '& .MuiInputLabel-root': { color: '#c9d1d9' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#e5e5e5',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#58a6ff' },
              },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
          </Button>

          <GoogleLogin
            onSuccess={auth.handleGoogleLoginSuccess}
            onError={auth.handleGoogleLoginError}
            useOneTap
            theme="filled_black"
            text="signin_with"
            shape="rectangular"
            width="364px"
          />

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/')}
            sx={{ 
              color: '#8b949e',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Volver al Inicio
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
