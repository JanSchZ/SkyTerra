import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import AISearchBar from './AISearchBar';

const containerTransition = {
  duration: 0.85,
  ease: [0.16, 1, 0.3, 1],
};

const textVariants = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
};

const searchBarVariants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -80, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

const haloVariants = {
  initial: { opacity: 0, scale: 0.85, x: 60 },
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { delay: 0.1, duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: { opacity: 0, scale: 1.08, x: -40, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
};

const LandingExperienceOverlay = ({
  onRequestClose,
  onSearch,
  onLocationSearch,
  onSearchStart,
  onSearchComplete,
}) => {
  const theme = useTheme();

  const handleExplore = () => {
    if (onRequestClose) onRequestClose('explore');
  };

  const handleSearchStart = (query) => {
    if (onRequestClose) onRequestClose('search');
    if (onSearchStart) onSearchStart(query);
  };

  const handleSearchComplete = (result) => {
    if (onSearchComplete) onSearchComplete(result);
  };

  const handleLocationSearch = (location) => {
    if (onLocationSearch) onLocationSearch(location);
  };

  const handleSearch = (payload) => {
    if (onSearch) onSearch(payload);
  };

  return (
    <motion.div
      key="skyterra-landing-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={containerTransition}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(112deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 36%, rgba(255,255,255,0.74) 52%, rgba(15,23,42,0.2) 70%, rgba(15,23,42,0.06) 82%, rgba(15,23,42,0) 92%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <Box
        component={motion.div}
        variants={haloVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: '-32%', sm: '-10%', md: '5%' },
          width: { xs: '140vw', sm: '90vw', md: 'min(64vw, 680px)' },
          aspectRatio: '1 / 1',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '-16%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(15,23,42,0.28), rgba(15,23,42,0))',
            filter: 'blur(36px)',
            opacity: 0.75,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.32)',
            mixBlendMode: 'screen',
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.58), rgba(255,255,255,0) 55%),' +
              'radial-gradient(circle at 72% 78%, rgba(15,23,42,0.5), rgba(15,23,42,0) 68%)',
            opacity: 0.9,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: '11%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.38), rgba(255,255,255,0))',
            mixBlendMode: 'screen',
            opacity: 0.85,
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: { xs: 10, md: 12 },
          pb: { xs: 8, md: 10 },
          px: { xs: 3, sm: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 'min(520px, 90vw)',
            alignSelf: { xs: 'center', md: 'flex-start' },
          }}
        >
          <motion.div variants={textVariants} initial="initial" animate="animate" exit="exit">
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.04em',
                fontSize: { xs: '2.9rem', sm: '3.4rem', md: '3.8rem' },
                color: theme.palette.mode === 'dark' ? '#0b1526' : '#0b1526',
                lineHeight: 1.05,
              }}
            >
              Vende informado
            </Typography>
          </motion.div>

          <motion.div
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Typography
              variant="body1"
              sx={{
                mt: 3,
                color: 'rgba(15,23,42,0.68)',
                fontSize: { xs: '1.05rem', md: '1.1rem' },
                lineHeight: 1.6,
                maxWidth: { xs: '100%', sm: '90%' },
              }}
            >
              Comprende cada territorio con precisión geoespacial, accede a datos confiables y publica tus propiedades con toda la información necesaria.
            </Typography>
          </motion.div>

          <motion.div variants={textVariants} initial="initial" animate="animate" exit="exit" transition={{ delay: 0.24 }}>
            <Button
              onClick={handleExplore}
              variant="contained"
              size="large"
              sx={{
                mt: 4,
                px: 4.5,
                py: 1.4,
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '1.05rem',
                backgroundColor: '#0f172a',
                boxShadow: '0 28px 48px rgba(15,23,42,0.25)',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#111b2f',
                  boxShadow: '0 34px 68px rgba(15,23,42,0.3)',
                },
              }}
            >
              Explorar
            </Button>
          </motion.div>
        </Box>

        <motion.div
          variants={searchBarVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Box sx={{ width: 'min(760px, 92vw)' }}>
            <AISearchBar
              variant="hero"
              placeholder="Buscar terrenos..."
              onSearch={handleSearch}
              onLocationSearch={handleLocationSearch}
              onSearchStart={handleSearchStart}
              onSearchComplete={handleSearchComplete}
              autoFocus
            />
          </Box>
        </motion.div>
      </Box>
    </motion.div>
  );
};

export default LandingExperienceOverlay;

