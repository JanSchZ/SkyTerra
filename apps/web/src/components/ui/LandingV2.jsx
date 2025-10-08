import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import MapView from '../map/MapView';

const HERO_ORBIT_VIEW = {
  longitude: -65,
  latitude: -18,
  zoom: 1.65,
  pitch: 48,
  bearing: -18,
};

export default function LandingV2({
  mapRef,
  filters: externalFilters,
  appliedFilters: externalAppliedFilters,
  initialData,
  heroVisible = true,
  onExplore,
  onMapReady,
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
          animate={{ opacity: heroVisible ? 0.35 : 1, scale: heroVisible ? 1.05 : 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <MapView
            ref={mapRef}
            filters={filters}
            appliedFilters={appliedFilters}
            initialData={initialData}
            initialViewState={HERO_ORBIT_VIEW}
            disableIntroAnimation={false}
            onLoad={handleMapReady}
          />
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
                background: 'linear-gradient(102deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.88) 46%, rgba(11,19,35,0.35) 72%, rgba(11,19,35,0.05) 90%, rgba(11,19,35,0) 100%)',
              }}
            />

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
                  maxWidth: '1200px',
                  width: '100%',
                  mx: 'auto',
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: { xs: 5, md: 10 },
                }}
              >
                <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'auto' } }}>
                  <Stack spacing={{ xs: 3, md: 4 }}>
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
                        maxWidth: { xs: '90%', md: '420px' },
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

                <Box
                  sx={{
                    flex: 1,
                    display: { xs: 'none', md: 'flex' },
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      width: { md: 380, lg: 440 },
                      height: { md: 380, lg: 440 },
                      borderRadius: '50%',
                      position: 'relative',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 38%, rgba(15,23,42,0) 70%)',
                        backdropFilter: 'blur(2px)',
                        WebkitBackdropFilter: 'blur(2px)',
                        boxShadow: '0 32px 70px rgba(15,23,42,0.28)',
                        opacity: 0.95,
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: '-8%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 70%)',
                        filter: 'blur(24px)',
                        opacity: 0.85,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </AnimatePresence>

    </Box>
  );
}
