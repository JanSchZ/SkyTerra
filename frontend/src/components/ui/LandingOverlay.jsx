import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const LandingOverlay = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        background: 'rgba(13,17,23,0.75)',
        backdropFilter: 'none',
      }}
    >
      <Paper elevation={6} sx={{
        p: { xs: 3, md: 6 },
        borderRadius: 4,
        background: 'rgba(30, 41, 59, 0.95)',
        color: 'white',
        maxWidth: 480,
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(30, 58, 95, 0.25)',
      }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, letterSpacing: '-0.03em', color: '#3b82f6' }}>
          SKYTERRA
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, color: '#cbd5e1' }}>
          Bienvenido a SkyTerra, la plataforma para explorar y publicar propiedades únicas en la naturaleza de Chile. Descubre terrenos, granjas y lugares increíbles, o publica tu propiedad para llegar a más personas.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          sx={{ fontWeight: 600, fontSize: '1.1rem', px: 4, py: 1.5, borderRadius: 2, mt: 2 }}
          onClick={() => navigate('/login')}
        >
          Sign In
        </Button>
      </Paper>
    </Box>
  );
};

export default LandingOverlay; 