import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const LandingOverlay = () => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        background: 'rgba(10, 12, 19, 0.72)',
        backdropFilter: 'blur(6px)',
        px: { xs: 2, md: 0 },
        boxSizing: 'border-box'
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 4, md: 6 },
          borderRadius: 5,
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.88) 100%)',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(8, 11, 21, 0.45)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography
            variant="overline"
            sx={{
              color: 'rgba(148, 163, 184, 0.9)',
              letterSpacing: '0.3em',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}
          >
            Explora Chile
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#93c5fd',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              maxWidth: '100%'
            }}
          >
            SKYTERRA
          </Typography>
          <Typography
            component="p"
            sx={{
              fontSize: { xs: '1.05rem', md: '1.18rem' },
              lineHeight: 1.65,
              color: '#e2e8f0',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              hyphens: 'auto',
              mx: 'auto',
              maxWidth: 420,
              overflow: 'hidden'
            }}
          >
            Tu plataforma para descubrir, evaluar y publicar propiedades unicas rodeadas de naturaleza. Encuentra reservas privadas, terrenos productivos y destinos extraordinarios sin salir del mapa.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          sx={{ fontWeight: 600, fontSize: '1.05rem', px: 4, py: 1.5, borderRadius: 99, alignSelf: 'center', minWidth: 180 }}
          onClick={() => navigate('/login')}
        >
          Iniciar sesion
        </Button>
      </Paper>
    </Box>
  );
};

export default LandingOverlay;
