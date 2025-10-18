import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { propertyService, tourService } from '../../services/api';
import UploadTourDialog from '../tours/UploadTourDialog';
import WorkflowTimeline from '../ui/WorkflowTimeline.jsx';

const WORKFLOW_STAGE_LABELS = {
  review: 'En revisión',
  approved: 'Publicación aprobada',
  pilot: 'Operación con piloto',
  post: 'En postproducción',
  live: 'Publicada',
};

const QUICK_ACTIONS = [
  { key: 'changes_requested', label: 'Solicitar correcciones', nodes: ['review', 'approved'] },
  { key: 'approved_for_shoot', label: 'Aprobar y enviar a pilotos', nodes: ['review'] },
  { key: 'received', label: 'Marcar material recibido', nodes: ['pilot', 'post'] },
  { key: 'ready_for_publish', label: 'Listo para publicar', nodes: ['post'] },
  { key: 'published', label: 'Publicar en Skyterra', nodes: ['post', 'live'] },
];

const getCurrentStage = (timeline = []) => {
  const active = timeline.find((item) => item.state === 'active');
  if (active) return active;
  const done = timeline.filter((item) => item.state === 'done');
  if (done.length) return done[done.length - 1];
  return timeline[0] || null;
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

function PropertyManagementPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = { page_size: 100 };
      if (statusFilter !== 'all') {
        filters.workflow_node = statusFilter;
      }
      const data = await propertyService.getPaginatedProperties(1, filters);
      const list = data.results || data;
      const formatted = list.map((p) => {
        const stage = getCurrentStage(p.workflow_timeline);
        return {
          id: p.id,
          name: p.name,
          owner: p.owner_details?.username || p.owner_username || p.owner || '—',
          price: p.price,
          size: p.size,
          workflow_node: p.workflow_node,
          workflow_node_label: WORKFLOW_STAGE_LABELS[p.workflow_node] || p.workflow_node,
          timeline: p.workflow_timeline,
          current_stage: stage,
        };
      });
      setRows(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshToggle]);

  const handleTransition = async (propertyId, substate) => {
    try {
      await propertyService.transitionWorkflow(propertyId, substate);
      setRefreshToggle((v) => !v);
    } catch (err) {
      console.error(err);
    }
  };

  const openDetailDialog = async (propertyId) => {
    setTimelineLoading(true);
    try {
      const data = await propertyService.getProperty(propertyId);
      setSelectedProperty(data);
      try {
        const arr = await tourService.getPropertyTours(propertyId);
        setTours(arr);
      } catch (e) {
        console.error('Error obteniendo tours', e);
      }
      setDetailOpen(true);
    } catch (e) {
      console.error('Error obteniendo detalles de propiedad', e);
    } finally {
      setTimelineLoading(false);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Nombre', flex: 1 },
    { field: 'owner', headerName: 'Propietario', width: 160 },
    {
      field: 'workflow_node',
      headerName: 'Etapa',
      width: 160,
      renderCell: ({ row }) => (
        <Chip label={row.workflow_node_label} color={row.current_stage?.state === 'active' ? 'primary' : 'default'} size="small" />
      ),
    },
    {
      field: 'current_stage',
      headerName: 'Días en etapa',
      width: 140,
      valueGetter: ({ row }) => formatDuration(row.current_stage),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 360,
      renderCell: (params) => {
        const availableActions = QUICK_ACTIONS.filter((action) => action.nodes.includes(params.row.workflow_node));
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            {availableActions.map((action) => (
              <Button
                key={action.key}
                variant={action.key === 'approved_for_shoot' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleTransition(params.id, action.key)}
              >
                {action.label}
              </Button>
            ))}
            <Button color="info" variant="text" size="small" onClick={() => openDetailDialog(params.id)}>
              Ver detalle
            </Button>
          </Stack>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Administrar Propiedades
      </Typography>

      <FormControl sx={{ minWidth: 220, mb: 2 }} size="small">
        <InputLabel id="status-filter-label">Filtrar por etapa</InputLabel>
        <Select
          labelId="status-filter-label"
          value={statusFilter}
          label="Filtrar por etapa"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="all">Todas</MenuItem>
          <MenuItem value="review">En revisión</MenuItem>
          <MenuItem value="approved">Publicación aprobada</MenuItem>
          <MenuItem value="pilot">Operación con piloto</MenuItem>
          <MenuItem value="post">Postproducción</MenuItem>
          <MenuItem value="live">Publicadas</MenuItem>
        </Select>
      </FormControl>

      <Paper elevation={0} sx={{ height: 600, width: '100%', borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', p: 1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          sx={{
            '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.02)' },
            '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0,0,0,0.01)' },
            border: 'none',
          }}
          pageSizeOptions={[10, 25, 50]}
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          localeText={{ noRowsLabel: 'No se encontraron propiedades' }}
        />
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de Propiedad</DialogTitle>
        <DialogContent dividers>
          {timelineLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          )}
          {!timelineLoading && selectedProperty && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">{selectedProperty.name}</Typography>
              <Typography variant="body2">ID: {selectedProperty.id}</Typography>
              <Typography variant="body2">Precio: US$ {Number(selectedProperty.price).toLocaleString()}</Typography>
              <Typography variant="body2">Tamaño: {selectedProperty.size} ha</Typography>
              <Typography variant="body2">
                Contacto: {selectedProperty.contact_name || '—'} · {selectedProperty.contact_phone || 'Sin teléfono'}
              </Typography>
              {selectedProperty.contact_email && (
                <Typography variant="body2">{selectedProperty.contact_email}</Typography>
              )}
              <Typography variant="body2">
                Dirección: {[selectedProperty.address_line1, selectedProperty.address_line2]
                  .filter(Boolean)
                  .join(', ') || 'Pendiente'}
              </Typography>
              <WorkflowTimeline timeline={selectedProperty.workflow_timeline} />
              <Typography variant="subtitle1" sx={{ mt: 2 }}>
                Tours 360°
              </Typography>
              {tours.length === 0 && <Typography variant="body2">No hay tours para esta propiedad</Typography>}
              {tours.length > 0 && (
                <Box sx={{ mt: 2, height: 400, borderRadius: 2, overflow: 'hidden' }}>
                  <iframe
                    src={tours[0].url}
                    title="Preview tour"
                    style={{ width: '100%', height: '100%', border: 0 }}
                    allowFullScreen
                  />
                </Box>
              )}
              <Button variant="outlined" size="small" sx={{ mt: 2, alignSelf: 'flex-start' }} onClick={() => setUploadDialogOpen(true)}>
                Subir nuevo tour
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <UploadTourDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        propertyId={selectedProperty?.id}
        onUploaded={() => {
          if (selectedProperty) openDetailDialog(selectedProperty.id);
        }}
      />
    </Box>
  );
}

export default PropertyManagementPage;
