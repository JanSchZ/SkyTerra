import React from 'react';
import { Typography, Box } from '@mui/material';

const AdminSettingsPage = () => (
  <Box>
    <Typography variant="h4" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', mb: 2 }}>
      Configuración
    </Typography>
    <Typography variant="body1" sx={{ color: '#8faacc', fontFamily: 'Clear Sans, sans-serif' }}>
      Aquí podrás ajustar la configuración de la plataforma.
    </Typography>
  </Box>
);

export default AdminSettingsPage; 