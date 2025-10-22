import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
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
                ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.22) 0%, rgba(59,130,246,0.08) 38%, rgba(15,23,42,0.08) 100%)'
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
              forceContinuousRotation={heroVisible}
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
                  'linear-gradient(110deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.93) 45%, rgba(229,234,255,0.44) 68%, rgba(59,130,246,0.12) 80%, rgba(59,130,246,0) 100%)',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  right: '-12%',
                  background:
                    'linear-gradient(120deg, rgba(248,250,255,0) 0%, rgba(248,250,255,0.32) 56%, rgba(248,250,255,0.82) 100%)',
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
                    background:
                      'radial-gradient(circle at 68% 45%, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 72%)',
                    filter: 'blur(22px)',
                    opacity: 0.6,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: heroClipPath,
                    WebkitClipPath: heroClipPath,
                    background:
                      'linear-gradient(130deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.08) 45%, rgba(15,23,42,0.22) 100%)',
                    opacity: 0.45,
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
                      Invierte informado
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
