import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

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
        <Toolbar sx={{ justifyContent: 'space-between', width: '100%', maxWidth: '1400px', mx: 'auto', px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="h4" 
              component={RouterLink}
              to="/"
              sx={{ 
                color: 'white', 
                textDecoration: 'none',
                fontWeight: 'bold',
                fontFamily: "'Source Code Pro', monospace",
                textShadow: '0 2px 10px rgba(0,0,0,0.4)'
              }}
            >
              SkyTerra
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