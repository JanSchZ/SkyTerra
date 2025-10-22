import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, Avatar, Alert, CircularProgress } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import { adminService } from '../../services/api';

const GlassContainer = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.4)',
  backdropFilter: 'blur(12px)',
  borderRadius: '15px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  padding: theme.spacing(3),
  height: 'calc(100vh - 120px)', 
  width: '100%',
}));

const RoleChip = ({ role }) => {
  if (role === 'admin') {
    return <Chip icon={<AdminPanelSettingsIcon />} label="Administrador" color="secondary" variant="outlined" size="small" />;
  }
  return <Chip icon={<PersonIcon />} label="Usuario" color="default" variant="outlined" size="small" />;
};

const AdminUsersListPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const { results } = await adminService.fetchUsers({ pageSize: 200 });
        setUsers(results);
      } catch (err) {
        console.error('Error loading users', err);
        setError(err?.message || 'No se pudieron cargar los usuarios.');
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const rows = useMemo(() => users.map((user) => {
    const displayName = user.first_name || user.last_name
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : (user.username || user.email || `Usuario ${user.id}`);
    const initials = displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST';

    return {
      id: user.id,
      displayName,
      email: user.email,
      role: user.is_staff ? 'admin' : 'user',
      propertyCount: user.property_count ?? 0,
      dateJoined: user.date_joined,
      avatarSeed: initials,
      isSuperuser: user.is_superuser,
    };
  }), [users]);

  const columns = useMemo(() => [
    { 
      field: 'displayName', 
      headerName: 'Usuario', 
      minWidth: 260,
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{ mr: 2, width: 36, height: 36 }}
            src={`https://api.dicebear.com/7.x/initials/svg?radius=40&seed=${encodeURIComponent(params.row.avatarSeed)}`}
          >
            {params.row.avatarSeed}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'role',
      headerName: 'Rol',
      minWidth: 160,
      renderCell: (params) => (
        <RoleChip role={params.value} />
      ),
    },
    {
      field: 'isSuperuser',
      headerName: 'Superusuario',
      minWidth: 140,
      type: 'boolean',
    },
    { 
      field: 'propertyCount', 
      headerName: 'Propiedades', 
      minWidth: 140,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'dateJoined',
      headerName: 'Fecha de ingreso',
      minWidth: 190,
      valueGetter: (params) => {
        const raw = params?.value ?? null;
        if (!raw) return null;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
      },
      valueFormatter: (params) => {
        const v = params?.value;
        if (!v || !(v instanceof Date)) return '—';
        return v.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
      },
    },
  ], []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
        Gestión de Usuarios
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Visualiza a los usuarios registrados, detecta roles administrativos y monitorea la creación de propiedades.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <GlassContainer>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            checkboxSelection
            disableSelectionOnClick
            autoHeight
            components={{
              Toolbar: GridToolbar,
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              },
              '& .MuiDataGrid-toolbarContainer': {
                padding: 1,
              }
            }}
          />
        )}
      </GlassContainer>
    </Box>
  );
};

export default AdminUsersListPage;
