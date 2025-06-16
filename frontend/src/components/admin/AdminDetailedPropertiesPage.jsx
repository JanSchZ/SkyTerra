import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import { mockProperties } from '../../_mocks/properties';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';

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

const StatusChip = ({ status }) => {
    const statusConfig = {
      approved: {
        icon: <CheckCircleOutlineIcon />,
        label: 'Aprobado',
        color: 'success',
      },
      pending: {
        icon: <HourglassEmptyIcon />,
        label: 'Pendiente',
        color: 'warning',
      },
      rejected: {
        icon: <DoNotDisturbOnIcon />,
        label: 'Rechazado',
        color: 'error',
      },
    };
  
    const config = statusConfig[status] || {};
  
    return <Chip icon={config.icon} label={config.label} color={config.color} variant="outlined" size="small" />;
};

const columns = [
    { 
        field: 'name', 
        headerName: 'Propiedad', 
        minWidth: 250,
        flex: 1,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={params.row.image} sx={{ mr: 2 }} variant="rounded" />
                <Typography variant="body2">{params.value}</Typography>
            </Box>
        )
    },
    { field: 'location', headerName: 'Ubicación', minWidth: 200, flex: 1 },
    {
        field: 'status',
        headerName: 'Estado',
        minWidth: 150,
        renderCell: (params) => <StatusChip status={params.value} />,
    },
    { 
        field: 'price', 
        headerName: 'Precio (CLP)', 
        minWidth: 180,
        type: 'number',
        valueFormatter: (params) => `$${params.value.toLocaleString('es-CL')}`,
    },
    { 
        field: 'size', 
        headerName: 'Tamaño (ha)', 
        minWidth: 120,
        type: 'number',
        valueFormatter: (params) => `${params.value} ha`,
    },
    { field: 'publicationDate', headerName: 'Fecha Publicación', minWidth: 180, type: 'date', valueGetter: (params) => new Date(params.value)},
];


const AdminDetailedPropertiesPage = () => {
  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
            Gestión de Propiedades
        </Typography>
        <GlassContainer>
            <DataGrid
                rows={mockProperties}
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

export default AdminDetailedPropertiesPage;
