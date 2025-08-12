import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Menu, MenuItem, LinearProgress, Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, ListItemText, ListItemAvatar, Paper, InputBase, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { styled } from '@mui/material/styles';
import { propertyService, authService } from '../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TourIcon from '@mui/icons-material/Tour';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';

const SearchContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: 400,
  padding: '8px 16px',
  marginBottom: 16,
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
  },
}));

const StatusChip = ({ status }) => {
    const statusConfig = {
    approved: {
        icon: <CheckCircleOutlineIcon />,
        label: 'Aprobado',
       color: 'default',
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
  const color = score > 75 ? '#16a34a' : score > 40 ? '#f59e0b' : '#ef4444';
  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '70%', mr: 1, position:'relative', height:10, borderRadius:8, overflow:'hidden', background:'rgba(0,0,0,0.08)' }}>
        <Box sx={{ position:'absolute', inset:0 }}>
          <Box sx={{ position:'absolute', top:0, left:0, bottom:0, width:`${Math.min(100, Number(score)).toFixed(0)}%`, background: color }} />
        </Box>
      </Box>
      <Box sx={{ minWidth: 40 }}>
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
    
    // Estados para datos y búsqueda
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    
    // Estados para paginación
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });
    const [totalCount, setTotalCount] = useState(0);

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

    // Función para cargar propiedades
    const loadProperties = useCallback(async (search = '', page = 0, pageSize = 10) => {
        try {
            if (search) {
                setSearchLoading(true);
            } else if (page === 0) {
                setLoading(true);
            }
            
            const filters = {};
            if (search) {
                filters.search = search;
            }
            
            console.log('Loading properties with filters:', filters, 'page:', page + 1);
            const response = await propertyService.getPaginatedProperties(page + 1, filters);
            console.log('Properties response:', response);
            
            setProperties(response.results || []);
            setTotalCount(response.count || 0);
            setError(null);
        } catch (err) {
            console.error('Error loading properties:', err);
            let errorMessage = 'Error al cargar las propiedades.';
            
            if (err.response?.status === 401) {
                errorMessage = 'No tiene permisos para acceder a esta información. Verifique su sesión de administrador.';
            } else if (err.response?.status === 403) {
                errorMessage = 'Acceso denegado. Se requieren permisos de administrador.';
            } else if (err.message) {
                errorMessage += ' ' + err.message;
            }
            
            setError(errorMessage);
            setProperties([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    }, []);

    // Efecto para cargar propiedades inicialmente
    useEffect(() => {
        // Verificar autenticación antes de cargar (sin llamada al backend)
        const user = authService.getStoredUser();
        console.log('Admin user check:', user);
        
        if (!user || !user.id) {
            console.warn('No valid user found in localStorage');
            setLoading(false);
            // No establecemos error, dejamos que StaffRoute maneje la redirección
            return;
        }
        
        if (!user.is_staff) {
            setError('Se requieren permisos de administrador para acceder a esta página.');
            setLoading(false);
            return;
        }
        
        console.log('Loading properties for admin user:', user.username || user.email);
        loadProperties('', paginationModel.page, paginationModel.pageSize);
    }, [paginationModel.page, paginationModel.pageSize, loadProperties]);

    // Debounce para búsqueda
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== undefined) {
                loadProperties(searchTerm, 0, paginationModel.pageSize);
                setPaginationModel(prev => ({ ...prev, page: 0 }));
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, paginationModel.pageSize, loadProperties]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handlePaginationModelChange = (newModel) => {
        setPaginationModel(newModel);
    };

    const columns = [
        { 
            field: 'name', 
            headerName: 'Propiedad', 
            minWidth: 250,
            flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                        src={params.row?.images?.[0]?.image || null} 
                        sx={{ mr: 2 }} 
                        variant="rounded" 
                    />
                    <Typography variant="body2">{params.value || ''}</Typography>
                </Box>
            )
        },
        { 
            field: 'location_name', 
            headerName: 'Ubicación', 
            minWidth: 200, 
            flex: 1,
            valueGetter: (params) => params?.row?.location_name || 'No especificada'
        },
        {
            field: 'publication_status',
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
        { 
            field: 'created_at', 
            headerName: 'Fecha Creación', 
            minWidth: 180, 
            type: 'date', 
            valueGetter: (params) => new Date(params.value)
        },
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

    if (loading && !searchLoading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Gestión de Propiedades
                </Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button 
                    variant="outlined" 
                    onClick={() => loadProperties('', paginationModel.page, paginationModel.pageSize)}
                    disabled={loading || searchLoading}
                >
                    {loading || searchLoading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                    Reintentar
                </Button>
            </Box>
        );
    }

    return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Gestión de Propiedades
        </Typography>
        
        {/* Barra de búsqueda */}
        <SearchContainer elevation={0}>
            <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            <InputBase
                placeholder="Buscar propiedades por nombre..."
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ flex: 1 }}
            />
            {searchLoading && (
                <CircularProgress size={20} sx={{ ml: 1 }} />
            )}
        </SearchContainer>
        
        <Box sx={{ 
          height: 'calc(100vh - 200px)', 
          width: '100%',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '4px',
          p: 1
        }}>
            <DataGrid
                rows={properties || []}
                columns={columns}
                paginationModel={paginationModel}
                onPaginationModelChange={handlePaginationModelChange}
                pageSizeOptions={[10, 25, 50]}
                rowCount={totalCount}
                paginationMode="server"
                loading={loading || searchLoading}
                checkboxSelection
                disableSelectionOnClick
                components={{
                    Toolbar: GridToolbar,
                    NoRowsOverlay: () => (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            gap: 2 
                        }}>
                            <Typography variant="h6" color="text.secondary">
                                {searchTerm ? 'No se encontraron propiedades que coincidan con la búsqueda' : 'No hay propiedades disponibles'}
                            </Typography>
                            {searchTerm && (
                                <Typography variant="body2" color="text.secondary">
                                    Pruebe con otros términos de búsqueda
                                </Typography>
                            )}
                        </Box>
                    ),
                }}
                getRowId={(row) => row.id || Math.random()}
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
                            {selectedProperty?.documents?.map(doc => (
                                <ListItem key={doc.id} secondaryAction={<StatusChip status={doc.status} />}>
                                    <ListItemAvatar>
                                        <Avatar><FolderIcon /></Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={doc.name} secondary={doc.type} />
                                </ListItem>
                            )) || (
                                <ListItem>
                                    <ListItemText primary="No hay documentos disponibles" />
                                </ListItem>
                            )}
                        </List>
                    </DialogContent>
                </Dialog>
            </>
        )}
        </Box>
    );
};

export default AdminDetailedPropertiesPage;
