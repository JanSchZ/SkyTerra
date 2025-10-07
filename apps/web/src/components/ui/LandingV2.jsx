import React, { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import MapView from '../map/MapView';
import AISearchBar from './AISearchBar';
import AppHeader from './AppHeader';

const earthImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg';

export default function LandingV2() {
  const [filters] = useState({});
  const [appliedFilters] = useState({});
  const [heroVisible, setHeroVisible] = useState(true);

  const handleRevealMap = () => {
    setHeroVisible(false);
  };

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
            filters={filters}
            appliedFilters={appliedFilters}
            disableIntroAnimation={false}
            onLoad={() => import.meta.env.MODE === 'development' && console.debug('Map loaded')}
          />
        </motion.div>
      </Box>

      {!heroVisible && <AppHeader />}

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
                background: 'linear-gradient(110deg, #ffffff 0%, #ffffff 55%, rgba(8,17,40,0.92) 100%)',
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
              <Box sx={{ position: 'absolute', top: { xs: 24, md: 40 }, left: { xs: 24, md: 64 } }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: { xs: '0.85rem', md: '0.95rem' },
                    letterSpacing: '0.35em',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    color: 'rgba(15,23,42,0.65)',
                  }}
                >
                  Skyterra
                </Typography>
              </Box>

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
                      onClick={handleRevealMap}
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
                  }}
                >
                  <Box
                    sx={{
                      width: { md: 360, lg: 420 },
                      height: { md: 360, lg: 420 },
                      borderRadius: '50%',
                      backgroundImage: `url(${earthImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: '0 40px 90px rgba(15,23,42,0.45)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), transparent 60%)',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </AnimatePresence>

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: { xs: 32, sm: 48, md: 64 },
          transform: 'translateX(-50%)',
          width: 'min(90vw, 680px)',
          zIndex: 30,
        }}
      >
        <AISearchBar
          onSearchStart={handleRevealMap}
          placeholder="Buscar terrenos..."
          variant={heroVisible ? 'hero' : 'default'}
        />
      </Box>
    </Box>
  );
}
