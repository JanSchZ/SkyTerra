import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { keyframes } from '@emotion/react';
import { AnimatePresence, motion } from 'framer-motion';
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
                  'linear-gradient(110deg, rgba(247,249,255,0.98) 0%, rgba(247,249,255,0.9) 42%, rgba(215,228,255,0.28) 64%, rgba(148,163,255,0.12) 78%, rgba(59,130,246,0) 100%)',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  right: '-12%',
                  background:
                    'linear-gradient(120deg, rgba(148,163,255,0) 0%, rgba(148,163,255,0.22) 56%, rgba(96,165,250,0.38) 100%)',
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
                px: { xs: 3, md: 8 },
                pt: { xs: 6, md: 10 },
              }}
            >
              <Box
                sx={{
                  maxWidth: { xs: '100%', md: '1200px' },
                  width: '100%',
                  mx: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: { xs: 5, md: 6 },
                }}
              >
                <Box sx={{ maxWidth: { xs: '100%', md: '520px' } }}>
                  <Stack spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
                    <Typography
                      component="h1"
                      sx={{
                        fontSize: { xs: '3rem', sm: '3.75rem', md: '4.5rem' },
                        lineHeight: { xs: 1.05, md: 1.08 },
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
                          gap: { xs: 1, sm: 1.25 },
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
                              }}
                            >
                              {activeHeroWord}
                            </Box>
                          </AnimatePresence>
                        </Box>
                        <Box component="span" sx={{ display: 'inline-block' }}>
                          informado
                        </Box>
                      </Box>
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: { xs: '1.05rem', md: '1.15rem' },
                        color: 'rgba(15,23,42,0.68)',
                        maxWidth: { xs: '100%', md: '420px' },
                        fontWeight: 400,
                      }}
                    >
                      Descubre oportunidades únicas alrededor del mundo con análisis precisos y en tiempo real.
                    </Typography>

                    <Button
                      onClick={() => onExplore?.()}
                      sx={{
                        alignSelf: 'flex-start',
                        px: { xs: 4, md: 5 },
                        py: { xs: 1.5, md: 1.75 },
                        borderRadius: '999px',
                        textTransform: 'none',
                        fontSize: { xs: '1rem', md: '1.05rem' },
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        backgroundColor: '#111827',
                        color: '#f8fafc',
                        boxShadow: '0 22px 35px rgba(15,23,42,0.25)',
                        '&:hover': {
                          backgroundColor: '#0b1220',
                          boxShadow: '0 28px 48px rgba(15,23,42,0.28)',
                        },
                      }}
                    >
                      Explorar
                    </Button>
                  </Stack>
                </Box>

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
              </Box>
            </Box>
          </Box>
        )}
      </AnimatePresence>

    </Box>
  );
}
