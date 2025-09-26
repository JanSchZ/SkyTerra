import React from 'react';
import { AppBar, Toolbar, Typography, Button, Stack, Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

const AppHeader = () => {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.4 }}
    >
      <AppBar
        position="absolute"
        elevation={0}
        sx={{
          top: 0,
          left: 0,
          right: 0,
          py: { xs: 1, md: 2 },
          backgroundColor: 'transparent',
        }}
      >
        <Toolbar
          sx={{
            width: '100%',
            maxWidth: '1280px',
            mx: 'auto',
            px: { xs: 2, md: 4 },
            borderRadius: 999,
            backdropFilter: 'blur(18px)',
            backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.04),
            border: (theme) => `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
            boxShadow: '0 10px 30px rgba(5, 21, 61, 0.25)',
            display: 'flex',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography
              variant="h5"
              component={RouterLink}
              to="/"
              sx={{
                color: 'common.white',
                textDecoration: 'none',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              SkyTerra
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 1, md: 2.5 }}
            alignItems="center"
            sx={{ display: { xs: 'none', md: 'flex' }, mr: { md: 1 } }}
          >
            <Button
              component="a"
              href="#capabilities"
              color="inherit"
              sx={{ color: alpha('#FFFFFF', 0.85), textTransform: 'none', fontWeight: 500 }}
            >
              Capacidades
            </Button>
            <Button
              component="a"
              href="#metricas"
              color="inherit"
              sx={{ color: alpha('#FFFFFF', 0.85), textTransform: 'none', fontWeight: 500 }}
            >
              Métricas
            </Button>
            <Button
              component="a"
              href="mailto:hola@skyterra.ai"
              color="inherit"
              sx={{ color: alpha('#FFFFFF', 0.85), textTransform: 'none', fontWeight: 500 }}
            >
              Contacto
            </Button>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to="/login"
              color="inherit"
              sx={{
                color: 'common.white',
                textTransform: 'none',
                fontWeight: 600,
                px: { xs: 1.5, md: 2 },
              }}
            >
              Ingresar
            </Button>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 999,
                px: { xs: 2, md: 3 },
                background: 'linear-gradient(120deg, #5B8EFF 0%, #8BC6FF 100%)',
                boxShadow: '0 10px 30px rgba(72, 145, 255, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(120deg, #6C9EFF 0%, #9ED2FF 100%)',
                  boxShadow: '0 12px 36px rgba(72, 145, 255, 0.45)',
                },
              }}
            >
              Crear cuenta
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
    </motion.div>
  );
};

export default AppHeader;
