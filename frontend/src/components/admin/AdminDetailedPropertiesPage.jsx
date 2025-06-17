import React, { useState } from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Menu, MenuItem, LinearProgress, Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, ListItemText, ListItemAvatar } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import { mockProperties } from '../../_mocks/properties';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TourIcon from '@mui/icons-material/Tour';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';

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

const PlusvaliaScore = ({ score }) => {
    const getColor = (value) => {
        if (value > 75) return 'success';
        if (value > 40) return 'warning';
        return 'error';
    };

    return (
        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '70%', mr: 1 }}>
                <LinearProgress variant="determinate" value={score} color={getColor(score)} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="text.secondary">{`${Math.round(score)}%`}</Typography>
            </Box>
        </Box>
    );
};

const AdminDetailedPropertiesPage = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [tourModalOpen, setTourModalOpen] = useState(false);
    const [docsModalOpen, setDocsModalOpen] = useState(false);

    const handleOpenMenu = (event, property) => {
        setAnchorEl(event.currentTarget);
        setSelectedProperty(property);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedProperty(null);
    };

    const handleOpenTourModal = () => {
        setTourModalOpen(true);
        handleCloseMenu();
    };
    
    const handleOpenDocsModal = () => {
        setDocsModalOpen(true);
        handleCloseMenu();
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
            field: 'plusvalia_score',
            headerName: 'Plusvalía Score',
            minWidth: 180,
            renderCell: (params) => <PlusvaliaScore score={params.value} />
        },
        { 
            field: 'price', 
            headerName: 'Precio (CLP)', 
            minWidth: 180,
            type: 'number',
            valueFormatter: (params) => {
                if (params.value == null) {
                    return 'N/A';
                }
                return `$${params.value.toLocaleString('es-CL')}`;
            },
        },
        { 
            field: 'size', 
            headerName: 'Tamaño (ha)', 
            minWidth: 120,
            type: 'number',
            valueFormatter: (params) => `${params.value} ha`,
        },
        { field: 'publicationDate', headerName: 'Fecha Publicación', minWidth: 180, type: 'date', valueGetter: (params) => new Date(params.value)},
        {
            field: 'actions',
            headerName: 'Acciones',
            type: 'actions',
            minWidth: 100,
            cellClassName: 'actions',
            getActions: ({ row }) => {
                return [
                    <IconButton onClick={(e) => handleOpenMenu(e, row)}>
                        <MoreVertIcon />
                    </IconButton>
                ];
            },
        }
    ];

    return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Gestión de Propiedades
                    </Typography>
        <Box sx={{ 
          height: 'calc(100vh - 120px)', 
          width: '100%',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '4px',
          p: 1
        }}>
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
        </Box>
        <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
        >
            <MenuItem onClick={handleOpenTourModal}><TourIcon sx={{mr: 1}}/> Gestionar Tour 360</MenuItem>
            <MenuItem onClick={handleOpenDocsModal}><DescriptionIcon sx={{mr: 1}}/> Ver Documentos</MenuItem>
        </Menu>

        {selectedProperty && (
            <>
                <Dialog open={tourModalOpen} onClose={() => setTourModalOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Gestionar Tour para: {selectedProperty.name}</DialogTitle>
                    <DialogContent>
                        <Typography sx={{mb: 2}}>Sube un archivo ZIP para el tour virtual.</Typography>
                        <Button variant="contained" component="label">
                            Subir Archivo
                            <input type="file" hidden accept=".zip"/>
                                        </Button>
                    </DialogContent>
                </Dialog>

                <Dialog open={docsModalOpen} onClose={() => setDocsModalOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Documentos de: {selectedProperty.name}</DialogTitle>
                    <DialogContent>
                        <List>
                            {selectedProperty.documents.map(doc => (
                                <ListItem key={doc.id} secondaryAction={<StatusChip status={doc.status} />}>
                                    <ListItemAvatar>
                                        <Avatar><FolderIcon /></Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={doc.name} secondary={doc.type} />
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                </Dialog>
            </>
        )}
        </Box>
    );
};

export default AdminDetailedPropertiesPage;
