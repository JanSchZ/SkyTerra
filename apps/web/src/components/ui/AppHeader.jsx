import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoSkyterra from '../../assets/Logo_skyterra_blanco.png';

const AppHeader = () => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 50, delay: 0.5 }}
    >
      <AppBar 
        position="absolute" 
        elevation={0}
        sx={{ 
          backgroundColor: 'transparent',
          top: 0,
          left: 0,
          right: 0,
          pt: 2, // Padding top for some space from the edge
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', width: '100%', maxWidth: '1400px', mx: 'auto', px: { xs: 2, md: 3 } }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              gap: 1.2,
            }}
          >
            <Box
              component="img"
              src={LogoSkyterra}
              alt="Skyterra"
              sx={{
                height: 32,
                width: 'auto',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: 400,
                letterSpacing: { xs: '0.08em', md: '0.1em' },
                textTransform: 'uppercase',
                lineHeight: 1,
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.35)',
              }}
            >
              SKYTERRA
            </Typography>
          </Box>
          <Box>
            <IconButton
              component={RouterLink}
              to="/login"
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <PersonOutlineIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    </motion.div>
  );
};

export default AppHeader; 
