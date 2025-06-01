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
  Link as MuiLink, // Para enlaces a detalles si es necesario
} from '@mui/material';
import { propertyService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPublicationsPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  const fetchProperties = useCallback(async (page = 1) => {
    setLoadingPage(true);
    if (page === 1) setLoading(true); // Full loading state only for first page
    setError(null);
    try {
      const response = await propertyService.getPaginatedProperties(page); 
      setProperties(response.results || []);
      setCurrentPage(page);
      // Assuming page_size is the one set in backend (e.g., 12)
      // You might need to get page_size from settings or define it here
      const pageSize = 12; // This should ideally match the backend page_size
      setTotalPages(Math.ceil(response.count / pageSize));
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
    try {
      const updatedProperty = await propertyService.setPropertyStatus(propertyId, newStatus);
      setProperties((prevProperties) =>
        prevProperties.map((prop) =>
          prop.id === propertyId ? { ...prop, publication_status: updatedProperty.publication_status } : prop
        )
      );
      setSnackbar({ open: true, message: `Estado de propiedad ID ${propertyId} actualizado a ${newStatus}.`, severity: 'success' });
    } catch (err) {
      console.error("Error updating property status:", err);
      setSnackbar({ open: true, message: err.message || 'Error al actualizar el estado.', severity: 'error' });
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
      // NEEDS_CHANGES: 'Necesita Cambios' // Si se añade en el futuro
    };
    return statusMap[statusValue] || statusValue;
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
        )}

        {properties.length > 0 && (
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
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Estado Actual</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Creada</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.map((prop) => (
                  <TableRow hover key={prop.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{prop.id}</TableCell>
                    <TableCell>
                      <MuiLink component="button" variant="body2" onClick={() => navigate(`/property/${prop.id}`)}>
                        {prop.name}
                      </MuiLink>
                    </TableCell>
                    <TableCell>{prop.owner_email || prop.owner_username || 'N/A'}</TableCell> {/* Asumiendo que tienes owner_email o username en el serializer */}
                    <TableCell>{prop.type}</TableCell>
                    <TableCell>${parseFloat(prop.price).toLocaleString('es-CL')}</TableCell>
                    <TableCell>{prop.size}</TableCell>
                    <TableCell>{getStatusLabel(prop.publication_status)}</TableCell>
                    <TableCell>{new Date(prop.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select
                        value={prop.publication_status}
                        onChange={(e) => handleChangeStatus(prop.id, e.target.value)}
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="pending">Pendiente</MenuItem>
                        <MenuItem value="approved">Aprobar</MenuItem>
                        <MenuItem value="rejected">Rechazar</MenuItem>
                        {/* <MenuItem value="NEEDS_CHANGES">Necesita Cambios</MenuItem> */}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
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
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPublicationsPage; 