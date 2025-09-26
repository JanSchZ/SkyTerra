import React, { useMemo, useState } from 'react';
import { Box, Typography, Button, Stack, Paper, Chip, Fade, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AISearchBar from './AISearchBar';
import AppHeader from './AppHeader';

const stats = [
  { label: 'Terrenos publicados', value: '12.4k+' },
  { label: 'Ciudades monitoreadas', value: '86' },
  { label: 'Alertas inteligentes al día', value: '1.2k' },
];

export default function LandingV2() {
  const [appliedFilters, setAppliedFilters] = useState({});

  const filterChips = useMemo(() => {
    if (!appliedFilters || typeof appliedFilters !== 'object') {
      return [];
    }

    return Object.entries(appliedFilters)
      .filter(([, value]) => Boolean(value) && value !== 'all')
      .slice(0, 6)
      .map(([key, value]) => (
        <Chip
          key={`${key}-${value}`}
          label={`${key}: ${Array.isArray(value) ? value.join(', ') : value}`}
          size="small"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.88)',
            borderRadius: '999px',
          }}
        />
      ));
  }, [appliedFilters]);

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        color: 'common.white',
        overflow: 'hidden',
        backgroundImage:
          'radial-gradient(circle at 15% 20%, rgba(82, 186, 255, 0.35), transparent 55%),\
          radial-gradient(circle at 85% 10%, rgba(107, 115, 255, 0.45), transparent 50%),\
          linear-gradient(140deg, #030b1e 0%, #061a3c 50%, #02132b 100%)',
      }}
    >
      <AppHeader />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          '&::before': {
            content: "''",
            position: 'absolute',
            width: { xs: 280, md: 420 },
            height: { xs: 280, md: 420 },
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 115, 255, 0.35) 0%, rgba(15, 38, 84, 0) 70%)',
            top: { xs: '12%', md: '10%' },
            right: { xs: '-20%', md: '10%' },
            filter: 'blur(0px)',
            boxShadow: '0 0 120px 60px rgba(74,115,255,0.24)',
          },
          '&::after': {
            content: "''",
            position: 'absolute',
            width: { xs: 240, md: 320 },
            height: { xs: 240, md: 320 },
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 214, 160, 0.4) 0%, rgba(7, 21, 47, 0) 70%)',
            bottom: { xs: '-18%', md: '-12%' },
            left: { xs: '-25%', md: '5%' },
            filter: 'blur(0px)',
            boxShadow: '0 0 120px 60px rgba(6, 214, 160, 0.18)',
          },
        }}
      />

      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1280px',
          mx: 'auto',
          px: { xs: 3, md: 6 },
          pt: { xs: 16, sm: 18, md: 22 },
          pb: { xs: 12, md: 16 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 10, md: 12 },
        }}
      >
        <Stack
          id="capabilities"
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 6, md: 10 }}
          alignItems="center"
        >
          <Box sx={{ flex: 1, maxWidth: 520 }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: 4,
                fontSize: { xs: '0.75rem', md: '0.85rem' },
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              Inteligencia territorial en tiempo real
            </Typography>
            <Typography
              variant="h2"
              sx={{
                mt: 3,
                fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' },
                fontWeight: 700,
                lineHeight: 1.1,
                maxWidth: 520,
                background: 'linear-gradient(120deg, #ffffff 0%, rgba(194, 219, 255, 0.92) 60%, rgba(112, 167, 255, 0.9) 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Descubre el potencial de cada territorio con claridad orbital
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 3,
                fontSize: { xs: '1.05rem', md: '1.15rem' },
                lineHeight: 1.7,
                color: 'rgba(220,230,255,0.8)',
              }}
            >
              SkyTerra combina imágenes satelitales, datos catastrales y modelos predictivos para ayudarte
              a tomar decisiones con confianza, anticipando oportunidades y riesgos inmobiliarios.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mt: 4, alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                component={RouterLink}
                to="/signup"
                variant="contained"
                size="large"
                sx={{
                  borderRadius: 999,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  background: 'linear-gradient(120deg, #5B8EFF 0%, #8BC6FF 100%)',
                  boxShadow: '0 16px 40px rgba(61, 118, 255, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(120deg, #6C9EFF 0%, #9ED2FF 100%)',
                    boxShadow: '0 20px 48px rgba(61, 118, 255, 0.45)',
                  },
                }}
              >
                Comenzar ahora
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                size="large"
                sx={{
                  borderRadius: 999,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                Ya tengo cuenta
              </Button>
            </Stack>

            <Box id="busquedas" sx={{ mt: 5, maxWidth: 520 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>
                Buscar con SAM, nuestro copiloto IA
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  mt: 1.5,
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: '24px',
                  backgroundColor: 'rgba(6, 16, 45, 0.7)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 24px 60px rgba(4, 11, 33, 0.5)',
                }}
              >
                <AISearchBar
                  onApplyFilters={(aiFilters) => {
                    setAppliedFilters(aiFilters || {});
                  }}
                  compact
                />

                {filterChips.length > 0 && (
                  <Fade in>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
                      {filterChips}
                    </Stack>
                  </Fade>
                )}
              </Paper>
            </Box>
          </Box>

          <Box sx={{ flex: 1, width: '100%', maxWidth: 520, position: 'relative' }}>
            <Paper
              elevation={0}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '32px',
                p: { xs: 3, md: 4 },
                background:
                  'linear-gradient(160deg, rgba(12, 34, 78, 0.95) 0%, rgba(16, 68, 120, 0.8) 55%, rgba(17, 36, 72, 0.92) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 32px 80px rgba(3, 12, 32, 0.65)',
                minHeight: { xs: 420, md: 480 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 2 }}>
                  Mapa orbital
                </Typography>
                <Typography variant="h5" sx={{ mt: 1, fontWeight: 600 }}>
                  Una vista envolvente de tu mercado
                </Typography>
                <Typography variant="body2" sx={{ mt: 1.5, color: 'rgba(210,220,255,0.75)' }}>
                  Capas dinámicas de uso del suelo, densidad y accesibilidad se combinan para ofrecer insights
                  accionables en segundos.
                </Typography>
              </Box>

              <Box
                sx={{
                  position: 'relative',
                  flexGrow: 1,
                  mt: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: { xs: 220, sm: 240, md: 280 },
                    height: { xs: 220, sm: 240, md: 280 },
                    borderRadius: '50%',
                    position: 'relative',
                    background:
                      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(130, 195, 255, 0.9) 35%, rgba(34,96,160,0.9) 68%, rgba(5,16,40,1) 100%)',
                    boxShadow: '0 25px 60px rgba(20, 53, 122, 0.55)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(circle at 70% 25%, rgba(255,255,255,0.45) 0%, rgba(35,105,180,0.3) 45%, rgba(6,22,52,0.85) 100%)',
                      mixBlendMode: 'screen',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '8%',
                      left: '12%',
                      width: '30%',
                      height: '30%',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.18)',
                      filter: 'blur(10px)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '10%',
                      right: '12%',
                      width: '36%',
                      height: '36%',
                      borderRadius: '50%',
                      background: 'rgba(12,83,180,0.4)',
                      filter: 'blur(8px)',
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: '-20%',
                    borderRadius: '50%',
                    border: '1px dashed rgba(255,255,255,0.2)',
                    opacity: 0.7,
                  }}
                />
              </Box>

              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  p: 2,
                  borderRadius: '20px',
                  backgroundColor: 'rgba(4, 15, 40, 0.65)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Actividad en vivo
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(210,220,255,0.7)' }}>
                    +32 nuevos registros en los últimos 15 minutos
                  </Typography>
                </Box>
                <Divider flexItem orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Cobertura
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(210,220,255,0.7)' }}>
                    18 regiones actualizadas hoy
                  </Typography>
                </Box>
              </Paper>
            </Paper>
          </Box>
        </Stack>

        <Stack
          id="metricas"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 3, sm: 5 }}
          justifyContent="space-between"
        >
          {stats.map((stat) => (
            <Paper
              key={stat.label}
              elevation={0}
              sx={{
                flex: 1,
                p: 3,
                borderRadius: '24px',
                backgroundColor: 'rgba(6, 16, 45, 0.75)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 50px rgba(3, 10, 28, 0.55)',
                textAlign: 'left',
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(210,220,255,0.7)' }}>
                {stat.label}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
