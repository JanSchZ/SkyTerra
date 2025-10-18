import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/api';
import WorkflowTimeline from '../ui/WorkflowTimeline.jsx';

const PAGE_SIZE = 12;

const QUICK_ACTIONS = [
  {
    label: 'Solicitar correcciones',
    substate: 'changes_requested',
    success: 'Se solicitaron correcciones al vendedor.',
    confirm: false,
    nodes: ['review', 'approved'],
  },
  {
    label: 'Aprobar y enviar a pilotos',
    substate: 'approved_for_shoot',
    success: 'Publicación aprobada y enviada a pilotos en el radio.',
    confirm: true,
    nodes: ['review'],
  },
  {
    label: 'Marcar material recibido',
    substate: 'received',
    success: 'Material marcado como recibido. Se inicia postproducción.',
    confirm: false,
    nodes: ['pilot', 'post'],
  },
  {
    label: 'Listo para publicar',
    substate: 'ready_for_publish',
    success: 'Publicación marcada como lista para salir a producción.',
    confirm: false,
    nodes: ['post'],
  },
  {
    label: 'Publicar en Skyterra',
    substate: 'published',
    success: 'Publicación activada y visible en Skyterra.',
    confirm: true,
    nodes: ['post', 'live'],
  },
];

const WORKFLOW_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas las etapas' },
  { value: 'review', label: 'En revisión' },
  { value: 'approved', label: 'Publicación aprobada' },
  { value: 'pilot', label: 'Operación con piloto' },
  { value: 'post', label: 'En postproducción' },
  { value: 'live', label: 'Publicada' },
];

const stageColor = (state) => {
  if (state === 'done') return 'success';
  if (state === 'active') return 'primary';
  return 'default';
};

const formatDuration = (stage) => {
  if (!stage) return '—';
  if (stage.duration_days != null) {
    if (stage.duration_days >= 1) {
      return `${stage.duration_days.toFixed(1)} días`;
    }
    if (stage.duration_hours != null) {
      return `${stage.duration_hours.toFixed(1)} h`;
    }
  }
  if (stage.duration_hours != null) {
    return `${stage.duration_hours.toFixed(1)} h`;
  }
  return '—';
};

const AdminPublicationsPage = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuProperty, setMenuProperty] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState(null);

  const fetchProperties = useCallback(
    async (page = 1, filter = workflowFilter) => {
      setLoadingPage(true);
      if (page === 1) setLoading(true);
      setError(null);
      try {
        const params = {};
        if (filter && filter !== 'all') {
          params.workflow_node = filter;
        }
        const response = await propertyService.getPaginatedProperties(page, params, PAGE_SIZE);
        setProperties(response.results || []);
        setCurrentPage(page);
        setTotalPages(Math.max(1, Math.ceil((response.count || 0) / PAGE_SIZE)));
      } catch (err) {
        console.error('Error fetching properties for admin:', err);
        setError(err.message || 'Error al cargar las propiedades. Verifica tus permisos.');
        setProperties([]);
        setTotalPages(1);
      } finally {
        setLoadingPage(false);
        if (page === 1) setLoading(false);
      }
    },
    [workflowFilter]
  );

  useEffect(() => {
    fetchProperties(1, workflowFilter);
  }, [fetchProperties, workflowFilter]);

  const getCurrentStage = (property) => {
    const timeline = property?.workflow_timeline || [];
    const active = timeline.find((node) => node.state === 'active');
    if (active) return active;
    const done = timeline.filter((node) => node.state === 'done');
    if (done.length) return done[done.length - 1];
    return timeline[0] || null;
  };

  const handleWorkflowFilterChange = (event) => {
    setWorkflowFilter(event.target.value);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !loadingPage) {
      fetchProperties(newPage, workflowFilter);
    }
  };

  const handleCloseSnackbar = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleOpenMenu = (event, property) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuProperty(property);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuProperty(null);
  };

  const handleTransition = async (action) => {
    if (!menuProperty) return;
    if (action.confirm && !window.confirm('¿Confirmas esta transición?')) {
      handleCloseMenu();
      return;
    }
    try {
      await propertyService.transitionWorkflow(menuProperty.id, action.substate);
      setSnackbar({ open: true, message: action.success, severity: 'success' });
      handleCloseMenu();
      fetchProperties(currentPage, workflowFilter);
    } catch (err) {
      console.error('Error aplicando transición', err);
      setSnackbar({ open: true, message: err.message || 'No se pudo actualizar el flujo.', severity: 'error' });
    }
  };

  const handleOpenTimeline = async (property) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await propertyService.getProperty(property.id);
      setSelectedPropertyDetail(detail);
    } catch (err) {
      console.error('Error loading property detail', err);
      setSnackbar({ open: true, message: 'No fue posible cargar el detalle de la publicación.', severity: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseTimeline = () => {
    setDetailOpen(false);
    setSelectedPropertyDetail(null);
  };

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => fetchProperties(1, workflowFilter)}>
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Panel de administración de publicaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Controla el flujo de revisión, producción y publicación de cada propiedad en Skyterra.
            </Typography>
          </Box>
          <Select
            value={workflowFilter}
            onChange={handleWorkflowFilterChange}
            size="small"
            sx={{ minWidth: 220 }}
          >
            {WORKFLOW_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {loadingPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loadingPage && properties.length === 0 && (
          <Typography variant="body1">No se encontraron publicaciones con el filtro seleccionado.</Typography>
        )}

        {properties.length > 0 && (
          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Propietario</TableCell>
                  <TableCell>Etapa actual</TableCell>
                  <TableCell>Días en etapa</TableCell>
                  <TableCell>Último hito</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {properties.map((property) => {
                  const currentStage = getCurrentStage(property);
                  const stageChip = (
                    <Chip
                      size="small"
                      color={stageColor(currentStage?.state)}
                      label={currentStage?.label || 'Sin datos'}
                    />
                  );
                  const lastEvent = currentStage?.current_event;
                  return (
                    <TableRow hover key={property.id}>
                      <TableCell>{property.id}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {
                            localStorage.setItem('skipAutoFlight', 'true');
                            navigate(`/property/${property.id}`);
                          }}
                        >
                          {property.name}
                        </Button>
                      </TableCell>
                      <TableCell>{property.owner_details?.email || property.owner_details?.username || '—'}</TableCell>
                      <TableCell>{stageChip}</TableCell>
                      <TableCell>{formatDuration(currentStage)}</TableCell>
                      <TableCell>{lastEvent?.substate_label || lastEvent?.substate || '—'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button variant="outlined" size="small" onClick={() => handleOpenTimeline(property)}>
                            Ver progreso
                          </Button>
                          <IconButton size="small" onClick={(event) => handleOpenMenu(event, property)}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loadingPage}>
              Anterior
            </Button>
            <Typography variant="body2" color="text.secondary">
              Página {currentPage} de {totalPages}
            </Typography>
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || loadingPage}>
              Siguiente
            </Button>
          </Box>
        )}
      </Paper>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {QUICK_ACTIONS.filter((action) => action.nodes.includes(menuProperty?.workflow_node)).map((action) => (
          <MenuItem key={action.substate} onClick={() => handleTransition(action)}>
            {action.label}
          </MenuItem>
        ))}
        {(!menuProperty || !QUICK_ACTIONS.some((action) => action.nodes.includes(menuProperty.workflow_node))) && (
          <MenuItem disabled>No hay acciones rápidas disponibles</MenuItem>
        )}
      </Menu>

      <Dialog open={detailOpen} onClose={handleCloseTimeline} fullWidth maxWidth="md">
        <DialogTitle>Detalle de publicación</DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!detailLoading && selectedPropertyDetail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{selectedPropertyDetail.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ID {selectedPropertyDetail.id} · {selectedPropertyDetail.plan_details?.name || 'Sin plan'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Contacto del vendedor</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPropertyDetail.contact_name || '—'} · {selectedPropertyDetail.contact_phone || 'Sin teléfono'}
                </Typography>
                {selectedPropertyDetail.contact_email && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedPropertyDetail.contact_email}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2">Dirección</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[selectedPropertyDetail.address_line1, selectedPropertyDetail.address_line2]
                    .filter(Boolean)
                    .join(', ') || 'Dirección pendiente'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[selectedPropertyDetail.address_city, selectedPropertyDetail.address_region, selectedPropertyDetail.address_country]
                    .filter(Boolean)
                    .join(', ') || 'Completa ciudad y país para coordinar el vuelo.'}
                </Typography>
              </Box>
              <WorkflowTimeline timeline={selectedPropertyDetail.workflow_timeline} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeline}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPublicationsPage;
