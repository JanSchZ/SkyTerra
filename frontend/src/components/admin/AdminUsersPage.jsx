import React from 'react';
import { Typography, Box } from '@mui/material';
import AdminUsersListPage from './AdminUsersListPage';

const AdminUsersPage = () => (
  <Box>
    <Typography variant="h4" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', mb: 2 }}>
      Gestión de Usuarios
    </Typography>
    <Typography variant="body1" sx={{ color: '#8faacc', fontFamily: 'Clear Sans, sans-serif' }}>
      Aquí podrás ver, editar y cambiar el estado de los usuarios.
    </Typography>
  </Box>
);

export default function AdminUsersPageWrapper() {
  return <AdminUsersListPage />;
} 