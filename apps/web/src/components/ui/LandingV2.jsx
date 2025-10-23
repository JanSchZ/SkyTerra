import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack, Typography, Chip, Divider, Paper } from '@mui/material';
import { keyframes } from '@emotion/react';
import { AnimatePresence, motion } from 'framer-motion';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import MapView from '../map/MapView';
import AISearchBar from './AISearchBar';

const HERO_ORBIT_VIEW = {
  longitude: -70,
  latitude: -30,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

const HERO_WORDS = ['Invierte', 'Compra', 'Vende'];

const heroGlobeSpin = keyframes`
  0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(-360deg);
  }
`;

const HERO_ROTATION_SPEED_DEG_PER_SEC = 3.2;

const HIGHLIGHT_PILLS = [
  {
    label: 'Due diligence con IA',
    icon: InsightsRoundedIcon,
    accent: 'linear-gradient(120deg, rgba(99,102,241,0.25) 0%, rgba(59,130,246,0.18) 100%)',
  },
  {
    label: 'Visitas inmersivas 3D',
    icon: TravelExploreRoundedIcon,
    accent: 'linear-gradient(120deg, rgba(14,165,233,0.24) 0%, rgba(37,99,235,0.16) 100%)',
  },
  {
    label: 'Impacto ESG trazable',
    icon: PublicRoundedIcon,
    accent: 'linear-gradient(120deg, rgba(16,185,129,0.24) 0%, rgba(59,130,246,0.14) 100%)',
  },
];

const TRUST_METRICS = [
  {
    value: '98%',
    label: 'Satisfacción de inversionistas',
    caption: 'Net Promoter Score 2024',
    accent: 'rgba(99, 102, 241, 0.28)',
  },
  {
    value: '1.2K+',
    label: 'Proyectos verificados',
    caption: '13 países conectados',
    accent: 'rgba(37, 99, 235, 0.28)',
  },
  {
    value: '24/7',
    label: 'Monitoreo del mercado',
    caption: 'Alertas y reportes en vivo',
    accent: 'rgba(14, 165, 233, 0.28)',
  },
];

const EXPERIENCE_FLOW = [
  {
    stage: 'Explora',
    title: 'Describe tu visión y obtén curaduría instantánea',
    description:
      'Nuestra IA entiende criterios complejos y conecta oportunidades con contexto regulatorio, logístico y ambiental.',
    duration: '±30 s',
    accent: '#6366f1',
  },
  {
    stage: 'Evalúa',
    title: 'Compara viabilidad con datos vivos',
    description:
      'Simula escenarios financieros, impacto ESG y disponibilidad hídrica colaborando con tu equipo en tiempo real.',
    duration: '±4 min',
    accent: '#0ea5e9',
  },
  {
    stage: 'Activa',
    title: 'Coordina visitas inmersivas y cierra con confianza',
    description:
      'Programa inspecciones, comparte recorridos 3D y recibe alertas notariales sin salir de la plataforma.',
    duration: '±1 día',
    accent: '#22c55e',
  },
];

export default function LandingV2({
  mapRef,
  filters: externalFilters,
  appliedFilters: externalAppliedFilters,
  initialData,
  heroVisible = true,
  onExplore,
  onMapReady,
  onSearch,
  onLocationSearch,
  onSearchStart,
  onSearchComplete,
  searchQuery,
  onQueryChange,
}) {
  const filters = useMemo(() => externalFilters || {}, [externalFilters]);
  const appliedFilters = useMemo(() => externalAppliedFilters || {}, [externalAppliedFilters]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeHeroWordIndex, setActiveHeroWordIndex] = useState(0);
  const heroRotationFrameRef = useRef(null);
  const heroRotationPrevTimeRef = useRef(null);
  const activeHeroWord = HERO_WORDS[activeHeroWordIndex];

  const handleMapReady = useCallback(() => {
    setMapLoaded(true);
    onMapReady?.();
  }, [onMapReady]);

  useEffect(() => {
    if (!heroVisible || !mapLoaded) return;
    const mapHandle = mapRef?.current;
    if (!mapHandle) return;

    const camera = {
      center: [HERO_ORBIT_VIEW.longitude, HERO_ORBIT_VIEW.latitude],
      zoom: HERO_ORBIT_VIEW.zoom,
      pitch: HERO_ORBIT_VIEW.pitch,
      bearing: HERO_ORBIT_VIEW.bearing,
      duration: 1600,
      essential: true,
    };

    try {
      if (typeof mapHandle.flyTo === 'function') {
        mapHandle.flyTo(camera);
        return;
      }

      const internalMap = mapHandle.getMap?.();
      internalMap?.flyTo(camera);
    } catch (error) {
      console.warn('No se pudo animar la vista inicial del héroe:', error);
    }
  }, [heroVisible, mapLoaded, mapRef]);

  useEffect(() => {
    if (!heroVisible) {
      setActiveHeroWordIndex(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setActiveHeroWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [heroVisible]);

  useEffect(() => {
    if (!heroVisible || !mapLoaded) {
      if (heroRotationFrameRef.current) {
        cancelAnimationFrame(heroRotationFrameRef.current);
        heroRotationFrameRef.current = null;
      }
      heroRotationPrevTimeRef.current = null;
      return;
    }

    const mapHandle = mapRef?.current;
    const mapInstance = mapHandle?.getMap?.() ?? mapHandle;

    if (!mapInstance || typeof mapInstance.setBearing !== 'function') {
      return undefined;
    }

    let cancelled = false;

    const step = (timestamp) => {
      if (cancelled) return;

      if (!heroRotationPrevTimeRef.current) {
        heroRotationPrevTimeRef.current = timestamp;
      }

      const deltaSeconds = Math.min(
        0.05,
        (timestamp - heroRotationPrevTimeRef.current) / 1000
      );
      heroRotationPrevTimeRef.current = timestamp;

      try {
        const currentBearing = mapInstance.getBearing?.() ?? 0;
        mapInstance.setBearing?.(currentBearing + HERO_ROTATION_SPEED_DEG_PER_SEC * deltaSeconds);
      } catch (error) {
        console.warn('No se pudo actualizar la rotación del globo en el héroe:', error);
        cancelled = true;
        return;
      }

      heroRotationFrameRef.current = requestAnimationFrame(step);
    };

    heroRotationFrameRef.current = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (heroRotationFrameRef.current) {
        cancelAnimationFrame(heroRotationFrameRef.current);
        heroRotationFrameRef.current = null;
      }
      heroRotationPrevTimeRef.current = null;
    };
  }, [heroVisible, mapLoaded, mapRef]);

  const heroCircleRadius = 'clamp(240px, 33vw, 360px)';
  const heroCircleCenterX = 'calc(100% - clamp(220px, 30vw, 340px))';
  const heroCircleCenterY = '52%';
  const heroCircleDiameter = `calc(${heroCircleRadius} * 2)`;
  const heroClipPath = `circle(${heroCircleRadius} at ${heroCircleCenterX} ${heroCircleCenterY})`;
  const expandedClipPath = 'circle(160% at 50% 50%)';

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: '#f8f9ff',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          pointerEvents: heroVisible ? 'none' : 'auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            clipPath: heroVisible ? heroClipPath : expandedClipPath,
            WebkitClipPath: heroVisible ? heroClipPath : expandedClipPath,
            filter: heroVisible
              ? 'drop-shadow(0 32px 70px rgba(15,23,42,0.22)) drop-shadow(0 12px 30px rgba(37,99,235,0.18))'
              : 'none',
          }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: heroVisible ? `calc(${heroCircleCenterY} - ${heroCircleRadius})` : 0,
              left: heroVisible ? `calc(${heroCircleCenterX} - ${heroCircleRadius})` : 0,
              width: heroVisible ? heroCircleDiameter : '100%',
              height: heroVisible ? heroCircleDiameter : '100%',
              transition: 'all 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
              borderRadius: heroVisible ? '50%' : 0,
              overflow: 'hidden',
              background: heroVisible
                ? 'radial-gradient(circle at 36% 34%, rgba(129,140,248,0.28) 0%, rgba(59,130,246,0.12) 46%, rgba(15,23,42,0.18) 100%)'
                : 'transparent',
              '& > *': {
                width: '100%',
                height: '100%',
              },
              '& .mapboxgl-canvas, & .mapboxgl-canvas-container': {
                transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: heroVisible ? 'scale(1.035)' : 'scale(1)',
                transformOrigin: '50% 50%',
              },
            }}
          >
            <MapView
              ref={mapRef}
              filters={filters}
              appliedFilters={appliedFilters}
              initialData={initialData}
              initialViewState={HERO_ORBIT_VIEW}
              disableIntroAnimation
              embedded={heroVisible}
              height={heroVisible ? '100%' : undefined}
              enableIdleRotation={!heroVisible}
              onLoad={handleMapReady}
            />
          </Box>
        </motion.div>
      </Box>

      <AnimatePresence>
        {heroVisible && (
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(110deg, rgba(247,249,255,0.98) 0%, rgba(247,249,255,0.92) 42%, rgba(215,228,255,0.32) 60%, rgba(148,163,255,0.18) 78%, rgba(59,130,246,0.12) 100%)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: '-24% -16% -12% -18%',
                  background:
                    'radial-gradient(circle at 12% 18%, rgba(79,70,229,0.22) 0%, rgba(79,70,229,0) 54%), radial-gradient(circle at 82% 32%, rgba(14,165,233,0.2) 0%, rgba(14,165,233,0) 58%)',
                  opacity: heroVisible ? 1 : 0,
                  transition: 'opacity 0.8s ease',
                  pointerEvents: 'none',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  right: '-12%',
                  background:
                    'linear-gradient(120deg, rgba(148,163,255,0) 0%, rgba(148,163,255,0.22) 56%, rgba(96,165,250,0.38) 100%), radial-gradient(circle at 70% 20%, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 60%)',
                  backgroundSize: 'auto, 160% 160%',
                  backgroundPosition: 'center, 0 0',
                  maskImage: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.1) 80%)',
                  opacity: heroVisible ? 1 : 0,
                  transition: 'opacity 0.6s ease',
                  pointerEvents: 'none',
                },
              }}
            />

            {heroVisible && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: { xs: 'none', sm: 'block' },
                  zIndex: 2,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: heroClipPath,
                    WebkitClipPath: heroClipPath,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: { sm: '-16%', md: '-18%' },
                      right: { sm: '-22%', md: '-18%' },
                      width: { sm: '320px', md: '420px', lg: '520px' },
                      height: { sm: '320px', md: '460px', lg: '580px' },
                      background:
                        'radial-gradient(circle at 30% 40%, rgba(148,163,255,0.65) 0%, rgba(99,102,241,0.32) 32%, rgba(56,189,248,0.12) 58%, rgba(15,23,42,0) 80%)',
                      filter: 'blur(42px) saturate(130%)',
                      opacity: 0.92,
                      transform: 'rotate(-14deg)',
                      mixBlendMode: 'screen',
                      animation: `${heroGlobeSpin} 76s linear infinite`,
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: { sm: '34%', md: '30%' },
                      right: { sm: '-16%', md: '-12%' },
                      width: { sm: '220px', md: '320px', lg: '380px' },
                      height: { sm: '220px', md: '320px', lg: '380px' },
                      background:
                        'radial-gradient(circle at 50% 50%, rgba(59,130,246,0.42) 0%, rgba(59,130,246,0.08) 60%, rgba(59,130,246,0) 100%)',
                      filter: 'blur(50px)',
                      opacity: 0.68,
                    },
                  }}
                />
              </Box>
            )}

            <Box
              sx={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                px: { xs: 2.5, sm: 3, md: 8 },
                pt: { xs: 4.5, md: 6 },
                pb: { xs: 5, md: 8 },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  maxWidth: { xs: '100%', md: '1200px' },
                  mx: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 5, md: 7 },
                  position: 'relative',
                  zIndex: 5,
                }}
              >
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: -18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: { xs: 2, md: 3 },
                    px: { xs: 2.5, md: 3.75 },
                    py: { xs: 1.75, md: 2 },
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.62)',
                    border: '1px solid rgba(148,163,255,0.35)',
                    boxShadow: '0 22px 60px rgba(15,23,42,0.14)',
                    backdropFilter: 'blur(22px)',
                    pointerEvents: 'auto',
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(79,70,229,0.95) 0%, rgba(37,99,235,0.88) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#e0f2fe',
                        boxShadow: '0 16px 36px rgba(37, 99, 235, 0.38)',
                      }}
                    >
                      <AutoAwesomeRoundedIcon fontSize="small" />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                      }}
                    >
                      Skyterra
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1.75}
                    alignItems="center"
                    sx={{
                      display: { xs: 'none', md: 'flex' },
                      color: 'rgba(15,23,42,0.72)',
                      flexShrink: 0,
                    }}
                  >
                    <Button
                      component="a"
                      href="#producto"
                      variant="text"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        color: 'inherit',
                        '&:hover': { color: '#1d4ed8' },
                      }}
                    >
                      Producto
                    </Button>
                    <Button
                      component="a"
                      href="#clientes"
                      variant="text"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        color: 'inherit',
                        '&:hover': { color: '#1d4ed8' },
                      }}
                    >
                      Clientes
                    </Button>
                    <Button
                      component="a"
                      href="/pricing"
                      variant="text"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        color: 'inherit',
                        '&:hover': { color: '#1d4ed8' },
                      }}
                    >
                      Planes
                    </Button>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      ml: { xs: 0, md: 'auto' },
                      width: { xs: '100%', md: 'auto' },
                      justifyContent: { xs: 'flex-end', md: 'flex-start' },
                    }}
                  >
                    <Box
                      component={motion.div}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      sx={{ width: { xs: '100%', md: 'auto' } }}
                    >
                      <Button
                        onClick={() => onExplore?.()}
                        sx={{
                          width: { xs: '100%', md: 'auto' },
                          px: { xs: 4, md: 4.5 },
                          py: { xs: 1.4, md: 1.6 },
                          borderRadius: '999px',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          letterSpacing: '0.01em',
                          background: 'linear-gradient(135deg, #1f2937 0%, #1d4ed8 52%, #0ea5e9 100%)',
                          color: '#f8fafc',
                          boxShadow: '0 24px 48px rgba(37,99,235,0.32)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #0284c7 100%)',
                            boxShadow: '0 28px 56px rgba(30,64,175,0.36)',
                          },
                        }}
                      >
                        Explorar
                      </Button>
                    </Box>
                    <Button
                      component="a"
                      href="/login"
                      variant="outlined"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        borderRadius: '999px',
                        px: { xs: 3.2, md: 3.6 },
                        py: { xs: 1.3, md: 1.4 },
                        borderColor: 'rgba(15,23,42,0.18)',
                        color: '#0f172a',
                        backgroundColor: 'rgba(255,255,255,0.58)',
                        boxShadow: '0 18px 40px rgba(15,23,42,0.12)',
                        '&:hover': {
                          borderColor: 'rgba(30,64,175,0.42)',
                          backgroundColor: 'rgba(219,234,254,0.72)',
                        },
                      }}
                    >
                      Iniciar sesión
                    </Button>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: { xs: 4.5, md: 5.5 },
                    maxWidth: { xs: '100%', md: '620px' },
                    pointerEvents: 'auto',
                  }}
                >
                  <Stack spacing={{ xs: 2.5, md: 3.5 }} alignItems="flex-start" sx={{ width: '100%' }}>
                    <Chip
                      icon={<VerifiedRoundedIcon sx={{ color: '#1d4ed8 !important' }} />}
                      label="Proptech LATAM nº1 en experiencia digital"
                      sx={{
                        px: 1.25,
                        py: 1,
                        borderRadius: '999px',
                        fontWeight: 500,
                        letterSpacing: '0.03em',
                        background: 'rgba(59,130,246,0.12)',
                        color: '#1e3a8a',
                        '& .MuiChip-icon': {
                          fontSize: '1.1rem',
                          ml: 0.5,
                        },
                      }}
                    />

                    <Typography
                      component="h1"
                      sx={{
                        fontSize: { xs: '2.85rem', sm: '3.6rem', md: '4.35rem' },
                        lineHeight: { xs: 1.05, md: 1.07 },
                        fontWeight: 600,
                        color: '#0f172a',
                        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: { xs: 1, sm: 1.2 },
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            height: '1em',
                            minWidth: { xs: '6.5ch', sm: '7.2ch' },
                            perspective: '1200px',
                            color: 'inherit',
                          }}
                        >
                          <AnimatePresence mode="wait">
                            <Box
                              key={activeHeroWord}
                              component={motion.span}
                              initial={{ rotateX: -90, opacity: 0, y: '0.3em' }}
                              animate={{ rotateX: 0, opacity: 1, y: 0 }}
                              exit={{ rotateX: 90, opacity: 0, y: '-0.3em' }}
                              transition={{ duration: 0.72, ease: [0.76, 0, 0.24, 1] }}
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                backfaceVisibility: 'hidden',
                                transformOrigin: '50% 50%',
                                textTransform: 'none',
                                background: 'linear-gradient(120deg, #2563eb 0%, #22d3ee 100%)',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                              }}
                            >
                              {activeHeroWord}
                            </Box>
                          </AnimatePresence>
                        </Box>
                        <Box component="span" sx={{ display: 'inline-block' }}>
                          informado con inteligencia viva
                        </Box>
                      </Box>
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: { xs: '1.05rem', md: '1.18rem' },
                        color: 'rgba(15,23,42,0.72)',
                        maxWidth: { xs: '100%', md: '460px' },
                        fontWeight: 400,
                      }}
                    >
                      Descubre oportunidades extraordinarias alrededor del mundo con análisis predictivos, contexto ESG y un equipo listo para activar cada decisión.
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1.2,
                      }}
                    >
                      {HIGHLIGHT_PILLS.map((pill, index) => {
                        const PillIcon = pill.icon;
                        return (
                          <Box
                            key={pill.label}
                            component={motion.div}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.28 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <Chip
                              icon={<PillIcon sx={{ color: '#1d4ed8', fontSize: '1.2rem' }} />}
                              label={pill.label}
                              sx={{
                                borderRadius: '16px',
                                px: 1.2,
                                py: 1.1,
                                background: pill.accent,
                                color: '#1e293b',
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                  px: 0.5,
                                },
                                '& .MuiChip-icon': {
                                  ml: 0.5,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1.5, sm: 2 }}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      sx={{ width: '100%' }}
                    >
                      <Box
                        component={motion.div}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        <Button
                          onClick={() => onExplore?.()}
                          sx={{
                            width: { xs: '100%', sm: 'auto' },
                            px: { xs: 4.2, md: 5 },
                            py: { xs: 1.6, md: 1.8 },
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontSize: { xs: '1rem', md: '1.05rem' },
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                            background: 'linear-gradient(135deg, #1f2937 0%, #1d4ed8 52%, #0ea5e9 100%)',
                            color: '#f8fafc',
                            boxShadow: '0 28px 58px rgba(30,64,175,0.32)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #0284c7 100%)',
                              boxShadow: '0 32px 66px rgba(30,64,175,0.36)',
                            },
                          }}
                        >
                          Explorar portafolio
                        </Button>
                      </Box>
                      <Box
                        component={motion.div}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        <Button
                          component="a"
                          href="/signup"
                          variant="outlined"
                          startIcon={<PlayArrowRoundedIcon />}
                          sx={{
                            width: { xs: '100%', sm: 'auto' },
                            px: { xs: 3.8, md: 4.2 },
                            py: { xs: 1.5, md: 1.6 },
                            borderRadius: '999px',
                            textTransform: 'none',
                            fontSize: { xs: '1rem', md: '1.02rem' },
                            fontWeight: 500,
                            borderColor: 'rgba(37,99,235,0.35)',
                            color: '#1d4ed8',
                            backgroundColor: 'rgba(255,255,255,0.72)',
                            '&:hover': {
                              borderColor: 'rgba(37,99,235,0.55)',
                              backgroundColor: 'rgba(219,234,254,0.8)',
                            },
                          }}
                        >
                          Ver historia del producto
                        </Button>
                      </Box>
                    </Stack>
                  </Stack>

                  <AnimatePresence>
                    {heroVisible && (
                      <Box
                        component={motion.div}
                        layoutId="global-search-bar"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        sx={{
                          width: '100%',
                          maxWidth: '100%',
                          pointerEvents: 'auto',
                          background: 'rgba(255,255,255,0.82)',
                          borderRadius: { xs: '24px', md: '28px' },
                          boxShadow: '0 28px 70px rgba(15,23,42,0.18)',
                          border: '1px solid rgba(148,163,255,0.28)',
                          p: { xs: 1.5, md: 1.75 },
                        }}
                      >
                        <AISearchBar
                          onSearch={onSearch}
                          onLocationSearch={onLocationSearch}
                          onSearchStart={onSearchStart}
                          onSearchComplete={onSearchComplete}
                          variant="hero"
                          placeholder="Buscar terrenos..."
                          value={searchQuery}
                          onQueryChange={onQueryChange}
                        />
                      </Box>
                    )}
                  </AnimatePresence>

                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: { xs: '100%', md: '680px' },
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                      gap: { xs: 2, sm: 2.5, md: 3 },
                    }}
                  >
                    {TRUST_METRICS.map((metric, index) => (
                      <Paper
                        key={metric.label}
                        elevation={0}
                        component={motion.div}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -6, scale: 1.01 }}
                        sx={{
                          borderRadius: '26px',
                          p: { xs: 2.6, md: 2.9 },
                          background: 'linear-gradient(150deg, rgba(255,255,255,0.9) 0%, rgba(244,246,255,0.76) 100%)',
                          border: '1px solid',
                          borderColor: metric.accent,
                          boxShadow: '0 26px 52px rgba(15,23,42,0.16)',
                          backdropFilter: 'blur(18px)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.75,
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 600,
                            color: '#1f2937',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {metric.value}
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ color: 'rgba(15,23,42,0.66)', fontWeight: 500 }}
                        >
                          {metric.label}
                        </Typography>
                        <Divider sx={{ borderColor: 'rgba(148,163,255,0.36)', my: 1 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(71,85,105,0.9)' }}>
                          {metric.caption}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </Box>

              <Box
                component={motion.div}
                initial={{ opacity: 0, y: 32, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                sx={{
                  position: 'absolute',
                  bottom: { xs: 28, sm: 36, md: 64 },
                  right: { xs: 24, sm: 32, md: 110 },
                  width: { xs: 'calc(100% - 48px)', sm: 300, md: 340 },
                  pointerEvents: 'auto',
                  zIndex: 4,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 3, md: 3.4 },
                    background: 'linear-gradient(160deg, rgba(15,23,42,0.94) 0%, rgba(30,41,59,0.88) 100%)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(148,163,255,0.32)',
                    boxShadow: '0 40px 72px rgba(15,23,42,0.45)',
                    backdropFilter: 'blur(26px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2.5,
                  }}
                >
                  <Chip
                    icon={<VerifiedRoundedIcon sx={{ color: '#38bdf8 !important' }} />}
                    label="Recorrido guiado"
                    sx={{
                      alignSelf: 'flex-start',
                      borderRadius: '999px',
                      background: 'rgba(56,189,248,0.16)',
                      color: '#e0f2fe',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      '& .MuiChip-icon': {
                        ml: 0.5,
                      },
                    }}
                  />
                  <Stack spacing={2.2}>
                    {EXPERIENCE_FLOW.map((step, index) => (
                      <React.Fragment key={step.stage}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '8px 1fr',
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              borderRadius: '999px',
                              background: `linear-gradient(180deg, ${step.accent}, rgba(148,163,255,0))`,
                            }}
                          />
                          <Stack spacing={0.75}>
                            <Typography
                              variant="caption"
                              sx={{ color: 'rgba(191,219,254,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase' }}
                            >
                              {step.stage}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                              {step.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.78)', lineHeight: 1.5 }}>
                              {step.description}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(148,163,255,0.85)', fontWeight: 500 }}>
                              {step.duration}
                            </Typography>
                          </Stack>
                        </Box>
                        {index < EXPERIENCE_FLOW.length - 1 && (
                          <Divider sx={{ borderColor: 'rgba(148,163,255,0.18)' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            </Box>
          </Box>
        )}
      </AnimatePresence>

    </Box>
  );
}
