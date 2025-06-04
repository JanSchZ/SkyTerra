import React from 'react';
import { Typography, Box } from '@mui/material';

const AdminPropertiesPage = () => (
  <Box>
    <Typography variant="h4" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', mb: 2 }}>
      Gestión de Propiedades
    </Typography>
    <Typography variant="body1" sx={{ color: '#8faacc', fontFamily: 'Clear Sans, sans-serif' }}>
      Aquí podrás ver, aprobar, rechazar y editar propiedades.
    </Typography>
  </Box>
);

export default AdminPropertiesPage; 