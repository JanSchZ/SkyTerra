import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  FormControl,
  InputLabel
} from '@mui/material';
import { propertyService, adminService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPublicationsPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [processingProperty, setProcessingProperty] = useState(null);
  const [tourDialog, setTourDialog] = useState({ open: false, property: null });
  const [tourData, setTourData] = useState({ url: '', type: '360' });
  const navigate = useNavigate();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const fetchProperties = useCallback(async (page = 1) => {
    setLoadingPage(true);
    if (page === 1) setLoading(true);
    setError(null);
    try {
      // Get both pending and all properties for admin view
      const [pendingResponse, allResponse] = await Promise.all([
        adminService.getPendingProperties(),
        propertyService.getPaginatedProperties(page)
      ]);
      
      // Combine and prioritize pending properties
      const pendingProps = pendingResponse.properties || [];
      const allProps = allResponse.results || [];
      
      // Remove duplicates and prioritize pending
      const pendingIds = new Set(pendingProps.map(p => p.id));
      const otherProps = allProps.filter(p => !pendingIds.has(p.id));
      const combinedProps = [...pendingProps, ...otherProps];
      
      setProperties(combinedProps);
      setCurrentPage(page);
      const pageSize = 12;
      setTotalPages(Math.ceil(allResponse.count / pageSize));
    } catch (err) {
      console.error("Error fetching properties for admin:", err);
      setError(err.message || 'Error al cargar las propiedades. Asegúrese de tener permisos de administrador.');
      setProperties([]);
      setTotalPages(1);
    } finally {
      setLoadingPage(false);
      if (page === 1) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(currentPage);
  }, [fetchProperties, currentPage]);
  const handleChangeStatus = async (propertyId, newStatus) => {
    if (processingProperty) return; // Prevent multiple simultaneous operations
    
    setProcessingProperty(propertyId);
    try {
      let result;
      if (newStatus === 'approved') {
        result = await adminService.approveProperty(propertyId);
        setSnackbar({ 
          open: true, 
          message: `Propiedad aprobada exitosamente. ${result.email_sent ? 'Email enviado al propietario.' : ''}`, 
          severity: 'success' 
        });
      } else if (newStatus === 'rejected') {
        result = await adminService.rejectProperty(propertyId);
        setSnackbar({ 
          open: true, 
          message: `Propiedad rechazada. ${result.email_sent ? 'Email enviado al propietario.' : ''}`, 
          severity: 'warning' 
        });
      } else {
        // For other status changes, use the old method
        result = await propertyService.setPropertyStatus(propertyId, newStatus);
        setSnackbar({ open: true, message: `Estado actualizado a ${newStatus}.`, severity: 'success' });
      }

      // Update the property in the list
      setProperties((prevProperties) =>
        prevProperties.map((prop) =>
          prop.id === propertyId 
            ? { ...prop, publication_status: newStatus } 
            : prop
        )
      );
    } catch (err) {
      console.error("Error updating property status:", err);
      setSnackbar({ open: true, message: err.message || 'Error al actualizar el estado.', severity: 'error' });
    } finally {
      setProcessingProperty(null);
    }
  };

  const handleAddTour = async (property) => {
    setTourDialog({ open: true, property });
    setTourData({ url: '', type: '360' });
  };

  const handleTourSubmit = async () => {
    if (!tourData.url || !tourDialog.property) return;

    try {
      const result = await adminService.addTourToProperty(tourDialog.property.id, tourData);
      setSnackbar({ 
        open: true, 
        message: 'Tour virtual añadido exitosamente.', 
        severity: 'success' 
      });
      setTourDialog({ open: false, property: null });
      setTourData({ url: '', type: '360' });
      // Refresh the properties list
      fetchProperties(currentPage);
    } catch (err) {
      console.error("Error adding tour:", err);
      setSnackbar({ open: true, message: err.message || 'Error al añadir tour virtual.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };
  const getStatusLabel = (statusValue) => {
    const statusMap = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return statusMap[statusValue] || statusValue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: 'rgba(255, 193, 7, 0.2)', color: '#ffc107' };
      case 'approved': return { bg: 'rgba(40, 167, 69, 0.2)', color: '#28a745' };
      case 'rejected': return { bg: 'rgba(220, 53, 69, 0.2)', color: '#dc3545' };
      default: return { bg: 'rgba(108, 117, 125, 0.2)', color: '#6c757d' };
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => fetchProperties(currentPage)}>Reintentar</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3}}>
          Panel de Administración de Publicaciones
        </Typography>
        
        {loadingPage && <Box sx={{display: 'flex', justifyContent: 'center', my:2}}><CircularProgress size={24} /></Box>}
        
        {properties.length === 0 && !loading && !loadingPage && (
          <Typography variant="body1">No hay propiedades para mostrar.</Typography>
        )}        {properties.length > 0 && (
          <TableContainer component={Paper} elevation={2} sx={{ maxHeight: '75vh'}}>
            <Table stickyHeader aria-label="sticky table de propiedades">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Propietario</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Precio</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Tamaño (ha)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Tours</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Creada</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.map((prop) => {
                  const statusColor = getStatusColor(prop.publication_status);
                  return (
                    <TableRow hover key={prop.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>{prop.id}</TableCell>
                      <TableCell>
                        <MuiLink component="button" variant="body2" onClick={() => navigate(`/property/${prop.id}`)}>
                          {prop.name}
                        </MuiLink>
                      </TableCell>
                      <TableCell>{prop.owner_details?.email || prop.owner_details?.username || 'N/A'}</TableCell>
                      <TableCell>{prop.type}</TableCell>
                      <TableCell>${parseFloat(prop.price).toLocaleString('es-CL')}</TableCell>
                      <TableCell>{prop.size}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(prop.publication_status)}
                          size="small"
                          sx={{ 
                            backgroundColor: statusColor.bg, 
                            color: statusColor.color,
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2">
                            {prop.tours?.length || 0} tours
                          </Typography>
                          {prop.publication_status === 'approved' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAddTour(prop)}
                              sx={{ fontSize: '0.7rem', py: 0.5 }}
                            >
                              + Tour
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{new Date(prop.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {prop.publication_status === 'pending' ? (
                            <>
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => handleChangeStatus(prop.id, 'approved')}
                                disabled={processingProperty === prop.id}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                {processingProperty === prop.id ? <CircularProgress size={16} /> : 'Aprobar'}
                              </Button>
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleChangeStatus(prop.id, 'rejected')}
                                disabled={processingProperty === prop.id}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                {processingProperty === prop.id ? <CircularProgress size={16} /> : 'Rechazar'}
                              </Button>
                            </>
                          ) : (
                            <Select
                              value={prop.publication_status}
                              onChange={(e) => handleChangeStatus(prop.id, e.target.value)}
                              size="small"
                              sx={{ minWidth: 120 }}
                              disabled={processingProperty === prop.id}
                            >
                              <MenuItem value="pending">Pendiente</MenuItem>
                              <MenuItem value="approved">Aprobar</MenuItem>
                              <MenuItem value="rejected">Rechazar</MenuItem>
                            </Select>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination Controls */} 
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3 }}>
            <Button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1 || loadingPage}
              sx={{mr: 1}}
            >
              Anterior
            </Button>
            <Typography sx={{mx:1}}>
              Página {currentPage} de {totalPages}
            </Typography>
            <Button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages || loadingPage}
              sx={{ml: 1}}
            >
              Siguiente
            </Button>
          </Box>
        )}
      </Paper>      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Tour Dialog */}
      <Dialog open={tourDialog.open} onClose={() => setTourDialog({ open: false, property: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Añadir Tour Virtual a "{tourDialog.property?.name}"
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="URL del Tour 360°"
              fullWidth
              value={tourData.url}
              onChange={(e) => setTourData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://ejemplo.com/tour360"
              sx={{ mb: 2 }}
              helperText="Ingresa la URL del tour virtual 360°"
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Tour</InputLabel>
              <Select
                value={tourData.type}
                label="Tipo de Tour"
                onChange={(e) => setTourData(prev => ({ ...prev, type: e.target.value }))}
              >
                <MenuItem value="360">Tour 360°</MenuItem>
                <MenuItem value="video">Video Tour</MenuItem>
                <MenuItem value="gallery">Galería</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTourDialog({ open: false, property: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTourSubmit} 
            variant="contained"
            disabled={!tourData.url}
          >
            Añadir Tour
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPublicationsPage; 