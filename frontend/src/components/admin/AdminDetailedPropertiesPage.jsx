import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Typography, Container, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, CircularProgress, Alert,
    TablePagination, TableSortLabel, Chip, IconButton, Menu, MenuItem, Tooltip as MuiTooltip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, TextField, Snackbar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TourIcon from '@mui/icons-material/Tour'; // Icon for tour management
import { useNavigate } from 'react-router-dom';


const headCells = [
    { id: 'id', numeric: true, disablePadding: false, label: 'ID' },
    { id: 'name', numeric: false, disablePadding: false, label: 'Name' },
    { id: 'price', numeric: true, disablePadding: false, label: 'Price' },
    { id: 'size', numeric: true, disablePadding: false, label: 'Size (ha)' },
    { id: 'plusvalia_score', numeric: true, disablePadding: false, label: 'Plusvalía', sortable: true },
    { id: 'listing_type', numeric: false, disablePadding: false, label: 'Modality' },
    { id: 'publication_status', numeric: false, disablePadding: false, label: 'Status' },
    { id: 'created_at', numeric: false, disablePadding: false, label: 'Created At' },
    { id: 'owner_details', numeric: false, disablePadding: false, label: 'Owner' },
    { id: 'actions', numeric: true, disablePadding: false, label: 'Actions', sortable: false },
];

const statusChipProps = {
    pending: {
        label: 'Pending',
        color: 'warning',
        icon: <HourglassEmptyIcon />,
    },
    approved: {
        label: 'Approved',
        color: 'success',
        icon: <CheckCircleOutlineIcon />,
    },
    rejected: {
        label: 'Rejected',
        color: 'error',
        icon: <HighlightOffIcon />,
    },
    default: {
        label: 'Unknown',
        color: 'default',
    }
};

function EnhancedTableHead(props) {
    const { order, orderBy, onRequestSort } = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow sx={{ "& th": { color: "#8faacc", backgroundColor: "#182534", whiteSpace: 'nowrap' } }}>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        {headCell.sortable !== false ? (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={orderBy === headCell.id ? order : 'asc'}
                                onClick={createSortHandler(headCell.id)}
                                sx={{
                                    '&.Mui-active': { color: '#E5E8F0' },
                                    '& .MuiTableSortLabel-icon': { color: '#E5E8F0 !important' },
                                }}
                            >
                                {headCell.label}
                            </TableSortLabel>
                        ) : headCell.label }
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}


const AdminDetailedPropertiesPage = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalProperties, setTotalProperties] = useState(0);
    const [filterListingType, setFilterListingType] = useState(''); // '' = all, 'sale', 'rent', 'both'
    const [orderBy, setOrderBy] = useState('created_at');
    const [order, setOrder] = useState('desc');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null); // Renamed to currentPropertyForMenu for clarity
    const navigate = useNavigate();

    // State for Tour Upload Modal
    const [openTourModal, setOpenTourModal] = useState(false);
    const [currentPropertyForTour, setCurrentPropertyForTour] = useState(null);
    const [existingTourDetails, setExistingTourDetails] = useState(null);
    const [tourFile, setTourFile] = useState(null);
    const [tourName, setTourName] = useState('');
    const [tourDescription, setTourDescription] = useState('');
    const [uploadingTour, setUploadingTour] = useState(false);
    const [loadingTourDetails, setLoadingTourDetails] = useState(false);

    // Snackbar state for notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');


    const fetchProperties = useCallback(() => {
        setLoading(true);
        setError(null);
        const params = {
            page: page + 1,
            page_size: rowsPerPage,
            ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
            ...(filterListingType ? { listing_type: filterListingType } : {}),
        };
        // Using the main /api/properties/ endpoint as it should have all necessary data
        // Ensure the PropertyListSerializer or PropertySerializer includes owner_details.
        axios.get('/api/properties/', {
            params,
            headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
        })
        .then(res => {
            setProperties(res.data.results || []);
            setTotalProperties(res.data.count || 0);
            setLoading(false);
        })
        .catch(err => {
            console.error("Error fetching properties:", err);
            setError('Error fetching properties. ' + (err.response?.data?.detail || err.message));
            setLoading(false);
        });
    }, [page, rowsPerPage, order, orderBy, filterListingType]);

    useEffect(() => {
        fetchProperties();
    }, [fetchProperties]);

    // Polling automático cada 10 segundos para refrescar la lista, solo actualizando si hay cambios reales
    useEffect(() => {
        const interval = setInterval(() => {
            const params = {
                page: page + 1,
                page_size: rowsPerPage,
                ordering: `${order === 'desc' ? '-' : ''}${orderBy}`,
            };
            axios.get('/api/properties/', {
                params,
                headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
            })
            .then(res => {
                const newProperties = res.data.results || [];
                // Solo actualiza si hay cambios reales
                const hasChanged =
                    newProperties.length !== properties.length ||
                    newProperties.some((newProp, idx) => {
                        const oldProp = properties[idx];
                        if (!oldProp) return true;
                        // Compara campos clave
                        return (
                            newProp.id !== oldProp.id ||
                            newProp.publication_status !== oldProp.publication_status ||
                            newProp.name !== oldProp.name ||
                            newProp.price !== oldProp.price ||
                            newProp.size !== oldProp.size
                        );
                    });
                if (hasChanged) {
                    setProperties(newProperties);
                    setTotalProperties(res.data.count || 0);
                }
            })
            .catch(err => {
                // No actualices el error visual si es polling
                // Opcional: puedes mostrar un pequeño indicador si quieres
            });
        }, 10000); // 10 segundos
        return () => clearInterval(interval);
    }, [page, rowsPerPage, order, orderBy, properties, filterListingType]);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleOpenActionMenu = (event, property) => {
        setAnchorEl(event.currentTarget);
        setSelectedProperty(property);
        // setCurrentPropertyForTour will be set in handleOpenTourModal after fetching details if needed
    };

    const handleCloseActionMenu = () => {
        setAnchorEl(null);
        // Don't reset selectedProperty here, it might be needed by modal if opened
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-CL', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const handleEditProperty = () => {
        if(selectedProperty) {
            navigate(`/edit-property/${selectedProperty.id}`);
        }
        handleCloseActionMenu();
    }

    const handleViewProperty = () => {
        if(selectedProperty) {
             // Assuming a public view route exists
            window.open(`/property/${selectedProperty.id}`, '_blank');
        }
        handleCloseActionMenu();
    }

    const handleSetStatus = async (newStatus) => {
        if (!selectedProperty) {
            handleCloseActionMenu();
            return;
        }

        // Use the set-status endpoint which handles all status changes
        const endpoint = `/api/properties/${selectedProperty.id}/set-status/`;
        const token = localStorage.getItem('auth_token');

        try {
            // Send the new status in the request body
            await axios.post(endpoint, { status: newStatus }, { 
                headers: {
                    Authorization: `Token ${token}`
                }
            });

            // Update local state
            setProperties(prevProperties => 
                prevProperties.map(prop => 
                    prop.id === selectedProperty.id 
                        ? { ...prop, publication_status: newStatus } 
                        : prop
                )
            );
            
            setSnackbarMessage(`Property ${selectedProperty.id} status updated to ${newStatus}.`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (err) {
            console.error(`Error setting property status to ${newStatus}:`, err);
            setSnackbarMessage(`Error updating property status: ${err.response?.data?.detail || err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
        handleCloseActionMenu();
    };

    const handleOpenTourModal = async () => {
        if (!selectedProperty) return;

        setCurrentPropertyForTour(selectedProperty);
        setLoadingTourDetails(true);
        setOpenTourModal(true);
        handleCloseActionMenu();

        try {
            const response = await axios.get(`/api/admin/tour-packages/?property_id=${selectedProperty.id}`, {
                headers: { Authorization: `Token ${localStorage.getItem('auth_token')}` }
            });
            if (response.data && response.data.results && response.data.results.length > 0) {
                const tour = response.data.results[0];
                setExistingTourDetails(tour);
                setTourName(tour.name || '');
                setTourDescription(tour.description || '');
            } else {
                setExistingTourDetails(null);
                setTourName(''); // Reset if no existing tour
                setTourDescription('');
            }
        } catch (error) {
            console.error("Error fetching existing tour details:", error);
            setSnackbarMessage('Error al cargar detalles del tour existente.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setExistingTourDetails(null); // Ensure it's null on error
        } finally {
            setLoadingTourDetails(false);
        }
    };

    const handleCloseTourModal = () => {
        setOpenTourModal(false);
        setTourFile(null);
        setTourName('');
        setTourDescription('');
        setCurrentPropertyForTour(null);
        setExistingTourDetails(null); // Reset existing tour details
        setUploadingTour(false);
    };

    const handleFileChange = (event) => {
        setTourFile(event.target.files[0]);
    };

    const handleUploadTour = () => {
        if (!currentPropertyForTour) {
            setSnackbarMessage('Error: Propiedad no seleccionada.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
        if (!tourFile && !existingTourDetails) { // Require file if no existing tour
            setSnackbarMessage('Por favor, selecciona un archivo ZIP.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }

        setUploadingTour(true);
        const formData = new FormData();
        if (tourFile) { // Only append if a new file is selected
            formData.append('tour_zip', tourFile);
        }
        formData.append('property', currentPropertyForTour.id);
        formData.append('name', tourName); // Always send name and description
        formData.append('description', tourDescription);

        const isUpdate = existingTourDetails && existingTourDetails.id;
        const url = isUpdate ? `/api/admin/tour-packages/${existingTourDetails.id}/` : '/api/admin/tour-packages/';
        const method = isUpdate ? 'put' : 'post';

        axios({ method, url, data: formData, headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Token ${localStorage.getItem('auth_token')}`
            }
        })
        .then(res => {
            setSnackbarMessage(isUpdate ? 'Tour actualizado exitosamente!' : 'Tour subido exitosamente!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleCloseTourModal();
            fetchProperties();
        })
        .catch(err => {
            console.error(`Error ${isUpdate ? 'updating' : 'uploading'} tour:`, err.response?.data || err.message);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || `Error al ${isUpdate ? 'actualizar' : 'subir'} el tour.`;
            setSnackbarMessage(errorMsg);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        })
        .finally(() => {
            setUploadingTour(false);
        });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
        setSnackbarOpen(false);
      };


    return (
        <Box sx={{ flexGrow: 1, py: 3 }}>
            <Container maxWidth="xl">
                <Paper
                    elevation={3}
                    sx={{
                        p: 3,
                        backgroundColor: '#182534',
                        color: '#E5E8F0',
                        borderRadius: '12px',
                    }}
                >
                    <Typography variant="h4" component="h1" sx={{ fontFamily: 'Code Pro, sans-serif', fontWeight: 'bold', mb: 3, color: '#E5E8F0' }}>
                        Manage Properties (Detailed List)
                    </Typography>

                    {/* Filtro de Modalidad (Venta/Arriendo/Ambas) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ color: '#8faacc' }}>Filtrar por modalidad:</Typography>
                      <TextField
                        select
                        size="small"
                        value={filterListingType}
                        onChange={(e) => { setFilterListingType(e.target.value); setPage(0); }}
                        SelectProps={{
                          native: true,
                        }}
                        sx={{
                          minWidth: 160,
                          '& select': { color: '#E5E8F0', backgroundColor: '#223449', borderRadius: 1, p:1 },
                          '& fieldset': { display: 'none' },
                        }}
                      >
                        <option value="">Todas</option>
                        <option value="sale">Venta</option>
                        <option value="rent">Arriendo</option>
                        <option value="both">Venta & Arriendo</option>
                      </TextField>
                    </Box>

                    {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="info" /></Box>}
                    {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                    {!loading && !error && (
                        <TableContainer>
                            <Table sx={{ minWidth: 900 }} aria-labelledby="tableTitle">
                                <EnhancedTableHead
                                    order={order}
                                    orderBy={orderBy}
                                    onRequestSort={handleRequestSort}
                                />
                                <TableBody>
                                    {properties.map((prop) => {
                                        const statusInfo = statusChipProps[prop.publication_status] || statusChipProps.default;
                                        return (
                                            <TableRow
                                                hover
                                                key={prop.id}
                                                sx={{ "& td": { color: '#E5E8F0', borderColor: '#223449', whiteSpace: 'nowrap' } }}
                                            >
                                                <TableCell component="th" scope="row" sx={{ color: '#8faacc' }}>{prop.id}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <MuiTooltip title={prop.name} placement="top">
                                                        <span>{prop.name}</span>
                                                    </MuiTooltip>
                                                </TableCell>
                                                <TableCell align="right">${prop.price ? parseFloat(prop.price).toLocaleString('es-CL') : 'N/A'}</TableCell>
                                                <TableCell align="right">{prop.size ? parseFloat(prop.size).toLocaleString('es-CL') : 'N/A'}</TableCell>
                                                <TableCell align="right">{prop.plusvalia_score !== null && prop.plusvalia_score !== undefined ? Number(prop.plusvalia_score).toFixed(2) : '—'}</TableCell>
                                                <TableCell>{prop.listing_type === 'sale' ? 'Venta' : prop.listing_type === 'rent' ? 'Arriendo' : 'Ambas'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={statusInfo.icon}
                                                        label={statusInfo.label}
                                                        color={statusInfo.color}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>{formatDate(prop.created_at)}</TableCell>
                                                <TableCell>
                                                    {prop.owner_details ? (
                                                        <MuiTooltip title={`ID: ${prop.owner_details.id} | Email: ${prop.owner_details.email || 'N/A'}`} placement="top">
                                                            <span>{prop.owner_details.username}</span>
                                                        </MuiTooltip>
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        onClick={(event) => handleOpenActionMenu(event, prop)}
                                                        size="small"
                                                        sx={{color: '#8faacc'}}
                                                    >
                                                        <MoreVertIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                     {!loading && !error && properties.length === 0 && (
                         <Typography sx={{ textAlign: 'center', mt: 3, color: '#8faacc' }}>
                            No properties found.
                         </Typography>
                    )}

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalProperties}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ color: '#8faacc',
                              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select, & .MuiTablePagination-selectIcon": {
                                  color: '#8faacc'
                              }
                        }}
                    />
                </Paper>
                {selectedProperty && <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseActionMenu}
                    PaperProps={{
                        style: {
                          backgroundColor: '#223449',
                          color: '#E5E8F0',
                          border: '1px solid #30363d'
                        },
                      }}
                >
                    <MenuItem onClick={handleViewProperty}><VisibilityIcon sx={{mr:1, color: '#8faacc'}}/> Ver Publicación</MenuItem>
                    <MenuItem onClick={handleEditProperty}><EditIcon sx={{mr:1, color: '#8faacc'}}/> Editar Propiedad</MenuItem>
                    <MenuItem onClick={handleOpenTourModal}><TourIcon sx={{mr:1, color: '#8faacc'}}/> Gestionar Tour</MenuItem>
                    {selectedProperty.publication_status !== 'approved' && (
                        <MenuItem onClick={() => handleSetStatus('approved')}><CheckCircleOutlineIcon sx={{mr:1, color: 'lightgreen'}}/> Aprobar</MenuItem>
                    )}
                    {selectedProperty.publication_status !== 'rejected' && (
                        <MenuItem onClick={() => handleSetStatus('rejected')}><HighlightOffIcon sx={{mr:1, color: 'salmon'}}/> Rechazar</MenuItem>
                    )}
                     {(selectedProperty.publication_status === 'approved' || selectedProperty.publication_status === 'rejected') && (
                        <MenuItem onClick={() => handleSetStatus('pending')}><HourglassEmptyIcon sx={{mr:1, color: 'orange'}}/> Marcar como Pendiente</MenuItem>
                    )}
                </Menu>}

                <Dialog open={openTourModal} onClose={handleCloseTourModal} PaperProps={{sx: {backgroundColor: '#182534', color: '#E5E8F0'}}}>
                    <DialogTitle sx={{color: '#E5E8F0', borderBottom: '1px solid #30363d'}}>
                        Gestionar Tour para Propiedad: {currentPropertyForTour?.name || ''} (ID: {currentPropertyForTour?.id || ''})
                    </DialogTitle>
                    <DialogContent sx={{mt: 2, minWidth: '500px'}}>
                        {loadingTourDetails ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {existingTourDetails && (
                                    <Box mb={3} p={2} sx={{border: '1px solid #30363d', borderRadius: '4px'}}>
                                        <Typography variant="subtitle1" sx={{color: '#E5E8F0', fontWeight:'bold'}}>Tour Actual:</Typography>
                                        <Typography variant="body2" sx={{color: '#8faacc'}}>Nombre: {existingTourDetails.name || 'N/A'}</Typography>
                                        <Typography variant="body2" sx={{color: '#8faacc'}}>Descripción: {existingTourDetails.description || 'N/A'}</Typography>
                                        <Typography variant="body2" sx={{color: '#8faacc'}}>Tour ID: {existingTourDetails.tour_id}</Typography>
                                        {existingTourDetails.url && (
                                            <Button
                                                href={existingTourDetails.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="small"
                                                sx={{mt:1, color:'#58a6ff'}}
                                            >
                                                Ver Tour Actual
                                            </Button>
                                        )}
                                    </Box>
                                )}
                                <DialogContentText sx={{color: '#8faacc', mb:1}}>
                                    {existingTourDetails ? 'Para reemplazar el tour existente, sube un nuevo archivo ZIP.' : 'Sube un archivo ZIP que contenga los archivos de tu tour virtual (ej. exportación de Pano2VR).'}
                                    <br/>
                                    El ZIP debe incluir un archivo `index.html` o `tour.html` en la raíz o en una subcarpeta directa.
                                </DialogContentText>
                                <Button
                                    variant="contained"
                                    component="label"
                                    fullWidth
                                    sx={{
                                        my: 2,
                                        backgroundColor: '#223449',
                                        '&:hover': {backgroundColor: '#304459'}
                                    }}
                                >
                                    {existingTourDetails ? "Reemplazar Tour (ZIP)" : "Seleccionar Archivo ZIP"}
                                    <input type="file" accept=".zip" hidden onChange={handleFileChange} />
                                </Button>
                                {tourFile && <Typography variant="body2" sx={{color: '#8faacc', mb:1, textAlign: 'center'}}>Nuevo archivo seleccionado: {tourFile.name}</Typography>}

                                <TextField
                                    autoFocus={!existingTourDetails} // Autofocus only if creating new
                                    id="tourName"
                                    label="Nombre del Tour"
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    value={tourName}
                                    onChange={(e) => setTourName(e.target.value)}
                                    sx={{ input: { color: '#E5E8F0' }, label: {color: '#8faacc'}, '& .MuiOutlinedInput-root': {'& fieldset': { borderColor: '#30363d' }} }}
                                />
                                <TextField
                                    margin="dense"
                                    id="tourDescription"
                                    label="Descripción del Tour"
                                    type="text"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    variant="outlined"
                                    value={tourDescription}
                                    onChange={(e) => setTourDescription(e.target.value)}
                                    sx={{ mt:1, input: { color: '#E5E8F0' }, label: {color: '#8faacc'}, '& .MuiOutlinedInput-root': {'& fieldset': { borderColor: '#30363d' }} }}
                                />
                            </>
                        )}
                    </DialogContent>
                    <DialogActions sx={{borderTop: '1px solid #30363d', p: '16px 24px'}}>
                        <Button onClick={handleCloseTourModal} sx={{color: '#8faacc'}}>Cancelar</Button>
                        <Button
                            onClick={handleUploadTour}
                            disabled={(!tourFile && !existingTourDetails) || !currentPropertyForTour || uploadingTour || loadingTourDetails}
                            variant="contained"
                            sx={{backgroundColor: '#58a6ff', '&:hover': {backgroundColor: '#7FBFFF'}, '&.Mui-disabled': {backgroundColor: 'rgba(88, 166, 255, 0.3)'}}}
                        >
                            {uploadingTour ? <CircularProgress size={24} color="inherit"/> : (existingTourDetails ? "Actualizar Tour" : "Subir Tour")}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%', backgroundColor: snackbarSeverity === 'success' ? '#2e7d32' : '#d32f2f', color: 'white' }}>
                        {snackbarMessage}
                    </Alert>
                </Snackbar>

            </Container>
        </Box>
    );
};

export default AdminDetailedPropertiesPage;
