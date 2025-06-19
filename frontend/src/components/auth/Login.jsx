import React, { useState } from 'react';
import { Button, TextField, Container, Typography, Box } from '@mui/material';
import { Google as GoogleIcon, Twitter as TwitterIcon } from '@mui/icons-material';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = (e) => {
    e.preventDefault();
    // Lógica para iniciar sesión con email y contraseña
    console.log('Email Login:', { email, password });
  };

  const handleGoogleLogin = () => {
    // Redirigir al backend para iniciar el flujo de OAuth2 con Google
    window.location.href = 'http://localhost:8000/accounts/google/login/?process=login';
  };

  const handleTwitterLogin = () => {
    // Redirigir al backend para iniciar el flujo de OAuth2 con Twitter
    window.location.href = 'http://localhost:8000/accounts/twitter/login/?process=login';
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Iniciar Sesión
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ mb: 1 }}
          >
            Iniciar Sesión con Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TwitterIcon />}
            onClick={handleTwitterLogin}
          >
            Iniciar Sesión con X
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
