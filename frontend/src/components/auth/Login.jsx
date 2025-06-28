import React, { useState } from 'react';
import axios from 'axios';
import { Button, TextField, Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { Google as GoogleIcon, Twitter as TwitterIcon } from '@mui/icons-material';
import config from '../../config/environment';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${config.api.baseURL}/auth/login/`, {
        email,
        password,
      });
      // Assuming the backend returns a token or user data
      console.log('Login successful:', response.data);
      // Here you would typically save the token and redirect the user
      // e.g., localStorage.setItem('token', response.data.token);
      // window.location.href = '/dashboard';
    } catch (err) {
      setError('Invalid credentials or server error. Please try again.');
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${config.api.baseURL.replace('/api', '')}/accounts/google/login/?process=login`;
  };

  const handleTwitterLogin = () => {
    window.location.href = `${config.api.baseURL.replace('/api', '')}/accounts/twitter/login/?process=login`;
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Iniciar Sesión
        </Typography>
        <Box component="form" onSubmit={handleEmailLogin} sx={{ mt: 1 }}>
          {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Correo Electrónico"
            name="email"
            autoComplete="email"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ mb: 1 }}
            disabled={loading}
          >
            Iniciar Sesión con Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TwitterIcon />}
            onClick={handleTwitterLogin}
            disabled={loading}
          >
            Iniciar Sesión con X
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
