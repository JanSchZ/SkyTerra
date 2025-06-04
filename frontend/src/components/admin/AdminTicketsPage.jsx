import React from 'react';
import { Typography, Box } from '@mui/material';

const AdminTicketsPage = () => (
  <Box>
    <Typography variant="h4" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', mb: 2 }}>
      Tickets de Soporte
    </Typography>
    <Typography variant="body1" sx={{ color: '#8faacc', fontFamily: 'Clear Sans, sans-serif' }}>
      Aquí podrás ver y responder tickets de soporte de los usuarios.
    </Typography>
  </Box>
);

export default AdminTicketsPage; 