import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Avatar, IconButton, Menu, MenuItem, LinearProgress, Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, ListItemText, ListItemAvatar, Paper, InputBase, CircularProgress, Alert, FormControl, InputLabel, Select } from '@mui/material';
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
import ManagePropertyToursDialog from './ManagePropertyToursDialog.jsx';

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
    const [manageToursOpen, setManageToursOpen] = useState(false);
    const [docsModalOpen, setDocsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectionModel, setSelectionModel] = useState([]);
    
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
        setManageToursOpen(true);
        handleCloseMenu();
    };
    
    const handleOpenDocsModal = () => {
        setDocsModalOpen(true);
        handleCloseMenu();
    };

    // Función para cargar propiedades
    const loadProperties = useCallback(async (search = '', page = 0, pageSize = 10, status = '') => {
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
            if (status) {
                filters.publication_status = status;
            }
            
            const response = await propertyService.getPaginatedProperties(page + 1, filters, pageSize);
            
            setProperties(response.results || []);
            setTotalCount(response.count || 0);
            setError(null);
        } catch (err) {
            console.error('Error loading properties:', err);
            setError('Error al cargar las propiedades. Verifique su conexión.');
            setProperties([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    }, []);

    // Efecto para cargar propiedades inicialmente
    useEffect(() => {
        // Como las propiedades funcionan (según logs), cargamos directamente
        // StaffRoute ya valida que solo admins puedan acceder
        loadProperties('', paginationModel.page, paginationModel.pageSize, statusFilter);
    }, [paginationModel.page, paginationModel.pageSize, statusFilter, loadProperties]);

    // Debounce para búsqueda
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== undefined) {
                loadProperties(searchTerm, 0, paginationModel.pageSize, statusFilter);
                setPaginationModel(prev => ({ ...prev, page: 0 }));
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, statusFilter, paginationModel.pageSize, loadProperties]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handlePaginationModelChange = (newModel) => {
        setPaginationModel(newModel);
    };

    const GRID_MIN_WIDTH = 1100;

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
            field: 'has_tour',
            headerName: 'Tour 360°',
            minWidth: 180,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {params?.value ? (
                        <Chip label="Activo" color="success" size="small" />
                    ) : (
                        <Chip label="Sin tour" size="small" />
                    )}
                    <IconButton
                        size="small"
                        aria-label="Gestionar tour 360"
                        title="Gestionar tour 360"
                        onClick={(event) => {
                            event.stopPropagation();
                            setSelectedProperty(params.row);
                            setManageToursOpen(true);
                        }}
                    >
                        <TourIcon fontSize="inherit" />
                    </IconButton>
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
            renderCell: (params) => <StatusChip status={params?.value || 'pending'} />,
        },
        {
            field: 'plusvalia_score',
            headerName: 'Plusvalía Score',
            minWidth: 180,
            renderCell: (params) => <PlusvaliaScore score={params?.value || 0} />
        },
        { 
            field: 'price', 
            headerName: 'Precio (CLP)', 
            minWidth: 180,
            type: 'number',
            valueFormatter: (params) => {
                if (params?.value == null) {
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
            valueFormatter: (params) => `${params?.value || 'N/A'} ha`,
        },
        { 
            field: 'created_at', 
            headerName: 'Fecha Creación', 
            minWidth: 180, 
            type: 'date', 
            valueGetter: (params) => params?.value ? new Date(params.value) : new Date()
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            type: 'actions',
            minWidth: 100,
            cellClassName: 'actions',
            getActions: ({ row }) => {
                return [
                    <IconButton key="tour" title="Gestionar tour" onClick={() => { setSelectedProperty(row); setManageToursOpen(true); }}>
                        <TourIcon />
                    </IconButton>,
                    <IconButton key="menu" onClick={(e) => handleOpenMenu(e, row)}>
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
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => loadProperties('', paginationModel.page, paginationModel.pageSize)}>
                    Reintentar
                </Button>
            </Box>
        );
    }

    return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 'calc(100vh - 140px)' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Gestión de Propiedades
          </Typography>
          <Typography variant="body2" color="text.secondary">
              Busca, filtra y gestiona tours y documentos desde un único lugar.
          </Typography>
        </Box>

        {/* Filtros y acciones */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchContainer elevation={0} sx={{ flex: 1, minWidth: 260 }}>
              <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              <InputBase
                  placeholder="Buscar propiedades por nombre..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  autoComplete="off"
                  sx={{ flex: 1 }}
              />
              {searchLoading && (
                  <CircularProgress size={20} sx={{ ml: 1 }} />
              )}
          </SearchContainer>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="status-filter-label">Estado</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="approved">Aprobado</MenuItem>
              <MenuItem value="rejected">Rechazado</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            disableElevation
            onClick={() => {
              const selectedId = selectionModel?.[0];
              const row = properties.find((p) => p.id === selectedId);
              if (row) {
                setSelectedProperty(row);
                setManageToursOpen(true);
              }
            }}
            disabled={!selectionModel?.length}
          >
            Gestionar Tour 360°
          </Button>
        </Box>

        <Box
          className="scroll-container"
          sx={{
            flex: 1,
            minHeight: 320,
            width: '100%',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            p: { xs: 0.5, md: 1.5 },
            backgroundColor: '#ffffff',
            overflow: 'hidden',
            boxShadow: '0 12px 24px rgba(16,16,16,0.04)',
          }}
        >
            <DataGrid
                getRowId={(row) => row.id}
                rows={properties}
                columns={columns}
                paginationModel={paginationModel}
                onPaginationModelChange={handlePaginationModelChange}
                pageSizeOptions={[10, 25, 50]}
                rowCount={totalCount}
                paginationMode="server"
                loading={loading || searchLoading}
                checkboxSelection
                onRowSelectionModelChange={(m) => setSelectionModel(m)}
                disableSelectionOnClick
                disableColumnMenu
                density="compact"
                components={{
                    Toolbar: GridToolbar,
                }}
                sx={{
                    height: '100%',
                    width: '100%',
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
                    },
                    '& .MuiDataGrid-main, & .MuiDataGrid-columnHeaders, & .MuiDataGrid-virtualScroller': {
                        minWidth: GRID_MIN_WIDTH,
                    },
                    '& .MuiDataGrid-virtualScroller': {
                        overflowX: 'auto',
                    },
                    '& .MuiDataGrid-columnSeparator': {
                        color: 'rgba(0,0,0,0.08)',
                    },
                    '& .MuiDataGrid-footerContainer': {
                        minWidth: GRID_MIN_WIDTH,
                    },
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
                <ManagePropertyToursDialog
                    open={manageToursOpen}
                    onClose={() => setManageToursOpen(false)}
                    propertyId={selectedProperty?.id}
                    propertyName={selectedProperty?.name}
                    onChange={() => {
                        // Refresh the property data to reflect tour state
                        loadProperties(searchTerm, paginationModel.page, paginationModel.pageSize);
                    }}
                />

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
