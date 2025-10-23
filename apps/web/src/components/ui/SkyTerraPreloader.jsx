import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const floatingPanels = [
  {
    id: 'panel-1',
    top: { xs: '14%', md: '16%' },
    left: { xs: '48%', md: '56%' },
    size: { xs: 120, md: 190 },
    rotation: -6,
    opacity: 0.5,
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(147,197,253,0.32) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    delay: 0,
  },
  {
    id: 'panel-2',
    top: { xs: '52%', md: '54%' },
    left: { xs: '70%', md: '72%' },
    size: { xs: 110, md: 160 },
    rotation: 4,
    opacity: 0.4,
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(56,189,248,0.28) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    delay: 0.2,
  },
  {
    id: 'panel-3',
    top: { xs: '68%', md: '70%' },
    left: { xs: '46%', md: '50%' },
    size: { xs: 100, md: 150 },
    rotation: -3,
    opacity: 0.45,
    gradient: 'linear-gradient(135deg, rgba(125,211,252,0.18) 0%, rgba(59,130,246,0.22) 100%)',
    border: '1px solid rgba(125, 211, 252, 0.25)',
    delay: 0.35,
  },
];

const orbitPulse = {
  scale: [1, 1.08, 1],
  opacity: [0.4, 0.85, 0.4],
};

const orbitTransition = {
  duration: 4.4,
  ease: 'easeInOut',
  repeat: Infinity,
};

const SkyTerraPreloader = () => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        color: '#e2e8f0',
        background: 'radial-gradient(120% 120% at 0% 0%, rgba(59,130,246,0.28) 0%, rgba(15,23,42,0.94) 42%, rgba(8,11,19,0.98) 100%)',
        overflow: 'hidden',
        fontFamily: '"Helvetica", Arial, sans-serif',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(70% 90% at 20% 20%, rgba(148,163,184,0.18) 0%, rgba(15,23,42,0) 60%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        component={motion.div}
        sx={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.32) 0%, rgba(14,116,144,0) 70%)',
          top: { xs: '28%', md: '30%' },
          right: { xs: '12%', md: '18%' },
          filter: 'blur(0.4px)',
        }}
        animate={orbitPulse}
        transition={{ ...orbitTransition, duration: 5.2 }}
      />

      {floatingPanels.map((panel) => (
        <Box
          key={panel.id}
          component={motion.div}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: panel.opacity, y: [0, -10, 0], rotate: [panel.rotation, panel.rotation + 2, panel.rotation] }}
          transition={{
            duration: 6.2,
            delay: panel.delay,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          sx={{
            position: 'absolute',
            top: panel.top,
            left: panel.left,
            width: panel.size,
            height: panel.size,
            borderRadius: { xs: '20px', md: '28px' },
            background: panel.gradient,
            border: panel.border,
            boxShadow: '0 30px 60px rgba(15,23,42,0.35)',
            mixBlendMode: 'screen',
          }}
        />
      ))}

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
        sx={{
          position: 'relative',
          zIndex: 10,
          maxWidth: { xs: '80vw', sm: 440, md: 520 },
          pl: { xs: 4, md: 12 },
          pr: { xs: 4, md: 0 },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: 'rgba(191, 219, 254, 0.85)',
            letterSpacing: '0.38em',
            textTransform: 'uppercase',
            display: 'block',
            mb: { xs: 2, md: 3 },
          }}
        >
          Exploración inmobiliaria
        </Typography>

        <Typography
          component={motion.h1}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.05, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
          sx={{
            fontSize: { xs: '2.8rem', sm: '3.4rem', md: '4.2rem' },
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            textTransform: 'uppercase',
            color: '#dbeafe',
            textShadow: '0 12px 40px rgba(15,23,42,0.45)',
          }}
        >
          THE SKYTERRA LAND INTELLIGENCE
        </Typography>

        <Typography
          component={motion.p}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.05, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
          sx={{
            mt: { xs: 3, md: 4 },
            fontSize: { xs: '1rem', md: '1.1rem' },
            lineHeight: 1.7,
            color: 'rgba(226, 232, 240, 0.88)',
            maxWidth: 420,
          }}
        >
          Preparando mapas inmersivos, datos ambientales y herramientas predictivas para conectar proyectos con territorios
          extraordinarios.
        </Typography>
      </Box>

      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
        sx={{
          position: 'absolute',
          top: { xs: 20, md: 28 },
          right: { xs: 24, md: 48 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.5,
          textTransform: 'uppercase',
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(148, 163, 184, 0.75)', letterSpacing: '0.28em' }}>
          Skyterra status
        </Typography>
        <Typography
          component={motion.span}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          sx={{ fontSize: '0.85rem', letterSpacing: '0.12em', color: '#93c5fd' }}
        >
          calibrando territorio
        </Typography>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 28, md: 42 },
          left: { xs: 32, md: 80 },
          right: { xs: 32, md: 120 },
          height: 6,
          borderRadius: 999,
          background: 'rgba(148, 163, 184, 0.16)',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(59,130,246,0.25)',
        }}
      >
        <Box
          component={motion.div}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: [0.6, 0.05, 0.2, 0.9],
          }}
          sx={{
            transformOrigin: '0% 50%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 45%, #818cf8 100%)',
            boxShadow: '0 0 18px rgba(125, 211, 252, 0.6)',
          }}
        />
      </Box>
    </Box>
  );
};

export default SkyTerraPreloader;
