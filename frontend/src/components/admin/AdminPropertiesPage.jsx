import React from 'react';
import { Typography, Box } from '@mui/material';

const AdminPropertiesPage = () => (
  <Box>
    <Typography variant="h4" sx={{ mb: 2 }}>
      Gestión de Propiedades
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
      Aquí podrás ver, aprobar, rechazar y editar propiedades.
    </Typography>
  </Box>
);

export default AdminPropertiesPage; 