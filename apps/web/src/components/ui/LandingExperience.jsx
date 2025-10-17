import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../map/MapView';

const MotionBox = motion(Box);

const starfieldBackground = `
  radial-gradient(2px 2px at 20px 40px, rgba(255,255,255,0.7), transparent),
  radial-gradient(1.5px 1.5px at 140px 90px, rgba(255,255,255,0.5), transparent),
  radial-gradient(1px 1px at 220px 150px, rgba(255,255,255,0.35), transparent),
  radial-gradient(1.8px 1.8px at 340px 60px, rgba(255,255,255,0.55), transparent),
  radial-gradient(1.2px 1.2px at 480px 120px, rgba(255,255,255,0.45), transparent)
`;

const mapVariants = {
  idle: {
    scale: 0.92,
    x: '14vw',
    borderRadius: '50%',
    boxShadow: '0 40px 160px rgba(15, 23, 42, 0.45)',
    filter: 'saturate(1.1) brightness(1.05)',
  },
  transition: {
    scale: 1.08,
    x: '2vw',
    borderRadius: '32px',
    boxShadow: '0 60px 220px rgba(15, 23, 42, 0.5)',
    filter: 'saturate(1.12) brightness(1.07)',
  },
  complete: {
    scale: 1,
    x: 0,
    borderRadius: '0px',
    boxShadow: '0 0 0 rgba(0,0,0,0)',
    filter: 'saturate(1) brightness(1)',
  },
};

const textFadeVariants = {
  idle: { opacity: 1, y: 0 },
  transition: { opacity: 0, y: -24, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } },
};

const searchVariants = {
  idle: { opacity: 1, y: 0 },
  transition: { opacity: 0, y: 24, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

const overlayVariants = {
  idle: { opacity: 1 },
  transition: { opacity: 1 },
  complete: { opacity: 0 },
};

const LandingExperience = ({
  mapRef,
  filters = {},
  appliedFilters,
  initialData,
  onExperienceComplete,
  hasCompletedLanding,
}) => {
  const [landingStage, setLandingStage] = useState(hasCompletedLanding ? 'complete' : 'idle');
  const [searchValue, setSearchValue] = useState('');
  const completionNotifiedRef = useRef(false);

  const initialViewState = useMemo(
    () => ({
      longitude: -55,
      latitude: -14,
      zoom: 2.75,
      pitch: 35,
      bearing: -18,
    }),
    [],
  );

  useEffect(() => {
    if (hasCompletedLanding) {
      setLandingStage('complete');
    }
  }, [hasCompletedLanding]);

  useEffect(() => {
    if (landingStage === 'transition') {
      const timer = setTimeout(() => {
        setLandingStage('complete');
      }, 2400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [landingStage]);

  useEffect(() => {
    if (landingStage === 'complete' && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      if (onExperienceComplete) {
        onExperienceComplete();
      }
    }
  }, [landingStage, onExperienceComplete]);

  const handleExplore = () => {
    if (landingStage !== 'idle') return;
    setLandingStage('transition');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleExplore();
  };

  const currentVariant = landingStage === 'idle' ? 'idle' : landingStage === 'transition' ? 'transition' : 'complete';

  return (
    <MotionBox
      initial={{ backgroundColor: '#ffffff' }}
      animate={{ backgroundColor: landingStage === 'complete' ? '#030712' : '#ffffff' }}
      transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <MotionBox
        initial={{ opacity: hasCompletedLanding ? 1 : 0 }}
        animate={{ opacity: landingStage === 'complete' ? 1 : 0 }}
        transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: landingStage === 'complete' ? 0.2 : 0 }}
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#030712',
          backgroundImage: starfieldBackground,
          backgroundSize: '320px 320px',
          backgroundRepeat: 'repeat',
          zIndex: 0,
        }}
      />

      <MotionBox
        variants={mapVariants}
        initial={hasCompletedLanding ? 'complete' : 'idle'}
        animate={currentVariant}
        transition={{ duration: landingStage === 'transition' ? 1.6 : 1.2, ease: [0.4, 0, 0.2, 1] }}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          overflow: 'hidden',
          pointerEvents: landingStage === 'complete' ? 'auto' : 'none',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(3,7,18,0.7) 0%, rgba(3,7,18,0.25) 45%, rgba(3,7,18,0) 70%)', opacity: landingStage === 'idle' ? 1 : 0, transition: 'opacity 1.2s ease', pointerEvents: 'none', zIndex: 2 }} />
        <Box sx={{ position: 'absolute', inset: '-12%', background: 'radial-gradient(circle, rgba(30,64,175,0.3) 0%, rgba(15,23,42,0) 65%)', opacity: landingStage === 'idle' ? 1 : 0, transition: 'opacity 1.2s ease', pointerEvents: 'none', zIndex: 1 }} />
        <MapView
          ref={mapRef}
          filters={filters}
          appliedFilters={appliedFilters}
          initialData={initialData}
          disableIntroAnimation={false}
          embedded
          embeddedHeight="100%"
          initialViewState={initialViewState}
        />
      </MotionBox>

      <AnimatePresence>
        {landingStage !== 'complete' && (
          <MotionBox
            key="landing-overlay"
            variants={overlayVariants}
            initial="idle"
            animate={currentVariant}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }}
            sx={{
              position: 'relative',
              zIndex: 3,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, #ffffff 0%, #ffffff 52%, rgba(255,255,255,0.82) 68%, rgba(255,255,255,0) 88%)',
              px: { xs: 3, sm: 6, md: 10 },
              py: { xs: 4, sm: 6, md: 8 },
              boxSizing: 'border-box',
            }}
          >
            <MotionBox
              variants={textFadeVariants}
              animate={currentVariant}
              sx={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
            >
              SKYTERRA
            </MotionBox>

            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'flex-start',
              }}
            >
              <Box sx={{ maxWidth: { xs: '100%', md: '460px' } }}>
                <Typography
                  component={motion.h1}
                  variants={textFadeVariants}
                  animate={currentVariant}
                  transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                  sx={{
                    fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.4rem' },
                    fontWeight: 600,
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: '#0f172a',
                    mb: 3,
                  }}
                >
                  Invierte informado
                </Typography>

                <MotionBox variants={textFadeVariants} animate={currentVariant}>
                  <Button
                    onClick={handleExplore}
                    size="large"
                    sx={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '999px',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      boxShadow: '0 20px 40px rgba(15, 23, 42, 0.25)',
                      '&:hover': {
                        backgroundColor: '#111827',
                        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
                      },
                    }}
                  >
                    Explorar
                  </Button>
                </MotionBox>
              </Box>
            </Box>

            <MotionBox
              component="form"
              variants={searchVariants}
              animate={currentVariant}
              onSubmit={handleSearchSubmit}
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: { xs: '100%', sm: '90%', md: '720px' },
                alignSelf: { xs: 'stretch', md: 'flex-start' },
                backgroundColor: '#f5f5f7',
                borderRadius: '999px',
                px: { xs: 2.5, sm: 3.5 },
                py: { xs: 1.5, sm: 1.8 },
                boxShadow: '0 30px 60px rgba(15, 23, 42, 0.12)',
              }}
            >
              <Box
                component="input"
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar terrenos..."
                sx={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: { xs: '1rem', sm: '1.05rem' },
                  color: '#1f2937',
                  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  '&::placeholder': {
                    color: '#6b7280',
                    opacity: 1,
                  },
                }}
              />
              <IconButton
                type="submit"
                onClick={handleExplore}
                sx={{
                  width: { xs: 44, sm: 48 },
                  height: { xs: 44, sm: 48 },
                  borderRadius: '50%',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  ml: 2,
                  '&:hover': {
                    backgroundColor: '#111827',
                  },
                }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </MotionBox>
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  );
};

export default LandingExperience;
