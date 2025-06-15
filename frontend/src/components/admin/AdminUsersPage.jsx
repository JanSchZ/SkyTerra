import React from 'react';
import { Typography, Box } from '@mui/material';
import AdminUsersListPage from './AdminUsersListPage';

const AdminUsersPage = () => (
  <Box>
    <Typography variant="h4" sx={{ mb: 2 }}>
      Gestión de Usuarios
    </Typography>
    <Typography variant="body1" sx={{ color: 'text.secondary' }}>
      Aquí podrás ver, editar y cambiar el estado de los usuarios.
    </Typography>
  </Box>
);

export default function AdminUsersPageWrapper() {
  return <AdminUsersListPage />;
} 