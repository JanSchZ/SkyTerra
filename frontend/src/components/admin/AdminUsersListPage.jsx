import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { mockProperties } from '../../_mocks/properties'; // Re-using for plausible names/locations

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

const userRoles = ['admin', 'vendedor_profesional', 'dueño_particular'];

const mockUsers = mockProperties.map((prop, i) => ({
    id: 2000 + i,
    name: `Usuario ${i + 1}`,
    email: `user${i+1}@skyterra.dev`,
    avatar: `https://i.pravatar.cc/150?u=user${i+1}`,
    role: userRoles[i % userRoles.length],
    plan: prop.type, // Re-using property type as a stand-in for plan name
    joinDate: prop.publicationDate,
    propertyCount: Math.floor(Math.random() * 5),
}));

const RoleChip = ({ role }) => {
    const roleConfig = {
      admin: {
        icon: <AdminPanelSettingsIcon />,
        label: 'Administrador',
        color: 'secondary',
      },
      vendedor_profesional: {
        icon: <BusinessIcon />,
        label: 'Vendedor Pro',
        color: 'primary',
      },
      dueño_particular: {
        icon: <PersonIcon />,
        label: 'Dueño Particular',
        color: 'default',
      },
    };
  
    const config = roleConfig[role] || {};
  
    return <Chip icon={config.icon} label={config.label} color={config.color} variant="outlined" size="small" />;
};

const columns = [
    { 
        field: 'name', 
        headerName: 'Usuario', 
        minWidth: 250,
        flex: 1,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={params.row.avatar} sx={{ mr: 2 }} />
                <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{params.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{params.row.email}</Typography>
                </Box>
            </Box>
        )
    },
    {
        field: 'role',
        headerName: 'Rol',
        minWidth: 180,
        renderCell: (params) => <RoleChip role={params.value} />,
    },
    { field: 'plan', headerName: 'Plan Actual', minWidth: 150 },
    { 
        field: 'propertyCount', 
        headerName: 'Propiedades', 
        minWidth: 120,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
    },
    { field: 'joinDate', headerName: 'Fecha de Ingreso', minWidth: 180, type: 'date', valueGetter: (params) => new Date(params.value)},
];


const AdminUsersListPage = () => {
  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
            Gestión de Usuarios
        </Typography>
        <GlassContainer>
            <DataGrid
                rows={mockUsers}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                checkboxSelection
                disableSelectionOnClick
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
        </GlassContainer>
    </Box>
  );
};

export default AdminUsersListPage;
