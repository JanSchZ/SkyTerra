import React, { useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { propertyService, tourService } from '../../services/api';
import UploadTourDialog from '../tours/UploadTourDialog';
import WorkflowTimeline from '../ui/WorkflowTimeline.jsx';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';

const WORKFLOW_STAGE_LABELS = {
  review: 'En revisión',
  approved: 'Publicación aprobada',
  pilot: 'Operación con piloto',
  post: 'En postproducción',
  live: 'Publicada',
};

const QUICK_ACTIONS = [
  {
    key: 'changes_requested',
    label: 'Solicitar correcciones',
    nodes: ['review', 'approved'],
    requiresMessage: true,
    confirmLabel: 'Solicitar correcciones',
    successMessage: 'Solicitaste correcciones al vendedor.',
    helperText: 'Describe con claridad qué debe ajustar el vendedor. Se enviará junto con la notificación.',
    description: 'Envía una notificación al vendedor con los ajustes que debe realizar.',
  },
  {
    key: 'approved_for_shoot',
    label: 'Aprobar y enviar a pilotos',
    nodes: ['review'],
    allowMessage: true,
    defaultMessage: 'Publicación aprobada. Preparar agenda de vuelo con pilotos.',
    confirmLabel: 'Enviar a pilotos',
    successMessage: 'La publicación fue enviada al equipo de pilotos.',
    helperText: 'Puedes añadir notas para el equipo de producción (opcional).',
    description: 'Crea automáticamente la orden de producción y avisa al equipo de pilotos.',
  },
  {
    key: 'received',
    label: 'Marcar material recibido',
    nodes: ['pilot', 'post'],
    confirmLabel: 'Confirmar recepción',
    successMessage: 'El material quedó marcado como recibido.',
    description: 'Confirma que ya recibiste el material grabado por los pilotos.',
  },
  {
    key: 'ready_for_publish',
    label: 'Listo para publicar',
    nodes: ['post'],
    confirmLabel: 'Marcar como listo',
    successMessage: 'La publicación quedó lista para lanzar.',
    description: 'Marca la publicación como lista para programación en la web.',
  },
  {
    key: 'published',
    label: 'Publicar en Skyterra',
    nodes: ['post', 'live'],
    confirmLabel: 'Publicar',
    successMessage: 'La propiedad ahora está publicada en SkyTerra.',
    description: 'Publica inmediatamente la propiedad en el catálogo de SkyTerra.',
  },
];

const STAGE_FILTERS = new Set(['review', 'approved', 'pilot', 'post', 'live']);

const STAGE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'pilot', label: 'Operación piloto' },
  { value: 'post', label: 'Postproducción' },
  { value: 'live', label: 'Publicadas' },
];

const formatNumber = (value) => Number(value || 0).toLocaleString('es-CL');

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
  const [searchParams, setSearchParams] = useSearchParams();
  const stageParam = searchParams.get('stage');
  const focusParam = searchParams.get('focus');
  const normalizedStage = stageParam && STAGE_FILTERS.has(stageParam) ? stageParam : 'all';
  const focus = focusParam === 'sla' ? 'sla' : null;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState(normalizedStage);
  const [sortModel, setSortModel] = useState(() =>
    focus === 'sla' ? [{ field: 'durationHours', sort: 'desc' }] : []
  );
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState({
    open: false,
    action: null,
    property: null,
    message: '',
    loading: false,
    submitAttempted: false,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: 'success',
    message: '',
  });

  useEffect(() => {
    if (normalizedStage !== statusFilter) {
      setStatusFilter(normalizedStage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedStage]);

  useEffect(() => {
    if (focus === 'sla') {
      setSortModel([{ field: 'durationHours', sort: 'desc' }]);
    }
  }, [focus]);

  const resetActionDialog = () => {
    setActionDialog({
      open: false,
      action: null,
      property: null,
      message: '',
      loading: false,
      submitAttempted: false,
    });
  };

  const openActionDialog = (property, action) => {
    setActionDialog({
      open: true,
      action,
      property,
      message: action.defaultMessage || '',
      loading: false,
      submitAttempted: false,
    });
  };

  const closeActionDialog = () => {
    if (actionDialog.loading) return;
    resetActionDialog();
  };

  const handleActionMessageChange = (event) => {
    const value = event.target.value;
    setActionDialog((prev) => ({
      ...prev,
      message: value,
      submitAttempted: false,
    }));
  };

  const handleConfirmAction = async () => {
    if (!actionDialog.action || !actionDialog.property) return;
    const { action, property, message } = actionDialog;
    const trimmedMessage = message.trim();

    if (action.requiresMessage && !trimmedMessage) {
      setActionDialog((prev) => ({ ...prev, submitAttempted: true }));
      return;
    }

    try {
      setActionDialog((prev) => ({ ...prev, loading: true }));
      await propertyService.transitionWorkflow(property.id, action.key, trimmedMessage || undefined);
      setSnackbar({
        open: true,
        severity: 'success',
        message: action.successMessage || 'Estado actualizado correctamente.',
      });
      resetActionDialog();
      setRefreshToggle((v) => !v);
    } catch (err) {
      console.error(err);
      setActionDialog((prev) => ({ ...prev, loading: false }));
      setSnackbar({
        open: true,
        severity: 'error',
        message: err?.message || 'No fue posible actualizar el flujo.',
      });
    }
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
        const expectedHours =
          stage?.expected_hours ??
          (stage?.expected_days != null ? stage.expected_days * 24 : null);
        const durationHours =
          stage?.duration_hours ??
          (stage?.duration_days != null ? stage.duration_days * 24 : null);
        const slaBreach =
          stage?.sla_breached ??
          (expectedHours != null && durationHours != null ? durationHours > expectedHours : false);
        const lastEvent = p.last_event || null;
        const workflowNodeLabel = WORKFLOW_STAGE_LABELS[p.workflow_node] || p.workflow_node;
        const substateLabel = stage?.label || stage?.name || '';
        const normalize = (value) => (typeof value === 'string' ? value.trim() : '');
        const normalizedStage = normalize(workflowNodeLabel).toLowerCase();
        const normalizedSubstate = normalize(substateLabel).toLowerCase();
        let eventLabelCandidate = normalize(lastEvent?.substate_label || lastEvent?.substate || '');
        if (eventLabelCandidate) {
          const normalizedEvent = eventLabelCandidate.toLowerCase();
          if (
            normalizedEvent === normalizedStage ||
            (normalizedSubstate && normalizedEvent === normalizedSubstate)
          ) {
            eventLabelCandidate = '';
          }
        }
        const rawEventMessage = lastEvent?.message || '';
        if (!eventLabelCandidate) {
          eventLabelCandidate = normalize(rawEventMessage);
        }
        const lastEventLabel = eventLabelCandidate || 'Sin novedades';
        const trimmedMessage = normalize(rawEventMessage);
        const lastEventMessage =
          trimmedMessage && trimmedMessage !== eventLabelCandidate ? rawEventMessage : '';
        return {
          id: p.id,
          name: p.name,
          owner: p.owner_details?.username || p.owner_username || p.owner || '—',
          ownerEmail: p.owner_email || '',
          price: p.price,
          size: p.size,
          planName: p.plan_name || '—',
          workflow_node: p.workflow_node,
          workflow_node_label: workflowNodeLabel,
          timeline: p.workflow_timeline,
          current_stage: stage,
          substateLabel,
          expectedHours,
          durationHours,
          slaBreach,
          stageState: stage?.state || null,
          lastEventLabel,
          lastEventMessage,
          lastEventAt: lastEvent?.created_at ? new Date(lastEvent.created_at) : null,
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

  const stageCounts = useMemo(() => {
    const base = {
      review: 0,
      approved: 0,
      pilot: 0,
      post: 0,
      live: 0,
    };
    rows.forEach((row) => {
      const key = row.workflow_node;
      if (key) {
        base[key] = (base[key] || 0) + 1;
      }
    });
    return base;
  }, [rows]);

  const totalRows = rows.length;
  const slaAlerts = useMemo(() => rows.reduce((acc, row) => acc + (row.slaBreach ? 1 : 0), 0), [rows]);

  const metrics = useMemo(
    () => [
      {
        label: 'Publicaciones activas',
        value: totalRows,
        helper: 'Workflow en curso dentro de la consola.',
      },
      {
        label: 'Fuera de SLA',
        value: slaAlerts,
        helper: 'Requieren seguimiento prioritario.',
      },
      {
        label: 'En revisión',
        value: stageCounts.review || 0,
        helper: 'Pendientes de moderación inicial.',
      },
      {
        label: 'Postproducción',
        value: stageCounts.post || 0,
        helper: 'Esperando material final o pulido.',
      },
    ],
    [totalRows, slaAlerts, stageCounts]
  );

  const handleManualRefresh = () => setRefreshToggle((v) => !v);

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

  const handleStageChange = (_, value) => {
    if (value === null) return;
    setStatusFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('stage');
    } else {
      nextParams.set('stage', value);
    }
    nextParams.delete('focus');
    setSearchParams(nextParams, { replace: true });
  };

  const activeFilterLabel = statusFilter !== 'all' ? WORKFLOW_STAGE_LABELS[statusFilter] : null;

  const columns = [
    {
      field: 'name',
      headerName: 'Propiedad',
      flex: 1.2,
      minWidth: 260,
      renderCell: ({ row }) => (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.owner}
          </Typography>
          {row.ownerEmail && (
            <Typography variant="caption" color="text.secondary">
              {row.ownerEmail}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'planName',
      headerName: 'Plan',
      minWidth: 160,
      valueGetter: (params) => {
        const row = params?.row;
        return row?.planName || '—';
      },
    },
    {
      field: 'workflow_node',
      headerName: 'Etapa',
      minWidth: 200,
      renderCell: ({ row }) => {
        const stageLabel = row.workflow_node_label || '—';
        const substate = row.substateLabel || '';
        const shouldShowSubstate =
          !!substate && substate.trim().toLowerCase() !== stageLabel.trim().toLowerCase();
        return (
          <Stack spacing={0.5}>
            <Chip
              label={stageLabel}
              color={row.current_stage?.state === 'active' ? 'primary' : 'default'}
              size="small"
            />
            {shouldShowSubstate && (
              <Typography variant="caption" color="text.secondary">
                Subestado: {substate}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'durationHours',
      headerName: 'Tiempo en etapa',
      minWidth: 180,
      valueGetter: (params) => {
        const row = params?.row;
        return row?.durationHours ?? 0;
      },
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
      renderCell: ({ row }) => (
        <Stack spacing={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatDuration(row.current_stage)}
          </Typography>
          {row.slaBreach && <Chip label="Fuera de SLA" size="small" color="warning" variant="outlined" />}
        </Stack>
      ),
    },
    {
      field: 'lastEventLabel',
      headerName: 'Último evento',
      flex: 1,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Stack spacing={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.lastEventLabel || 'Sin novedades'}
          </Typography>
          {row.lastEventMessage && (
            <Tooltip title={row.lastEventMessage} placement="top">
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.lastEventMessage}
              </Typography>
            </Tooltip>
          )}
          {row.lastEventAt instanceof Date && !Number.isNaN(row.lastEventAt.getTime()) && (
            <Typography variant="caption" color="text.secondary">
              {row.lastEventAt.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      minWidth: 320,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row || {};
        const availableActions = QUICK_ACTIONS.filter((action) => action.nodes.includes(row.workflow_node));
        return (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {availableActions.map((action) => (
              <Button
                key={action.key}
                variant={action.key === 'approved_for_shoot' ? 'contained' : 'outlined'}
                color={action.key === 'changes_requested' ? 'warning' : 'primary'}
                size="small"
                onClick={() => openActionDialog(params.row, action)}
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

  const selectedAction = actionDialog.action;
  const dialogProperty = actionDialog.property;
  const showMessageField = Boolean(
    selectedAction && (selectedAction.requiresMessage || selectedAction.allowMessage)
  );
  const messageError = Boolean(
    selectedAction?.requiresMessage && actionDialog.submitAttempted && !actionDialog.message.trim()
  );
  const dialogHelperText = messageError
    ? 'Debes ingresar un mensaje para continuar.'
    : selectedAction?.helperText;
  const confirmLabel = selectedAction?.confirmLabel || 'Confirmar';
  const dialogStageLabel = dialogProperty?.workflow_node_label || '—';
  const dialogSubstateLabel = dialogProperty?.substateLabel || '';
  const showDialogSubstateChip = Boolean(dialogSubstateLabel) &&
    dialogSubstateLabel.trim().toLowerCase() !== dialogStageLabel.trim().toLowerCase();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Consola de Aprobaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supervisión y acciones rápidas para publicaciones en workflow.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Actualizar listado">
              <span>
                <IconButton onClick={handleManualRefresh} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {metrics.map((metric) => (
            <Paper
              key={metric.label}
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.08)',
                height: '100%',
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {metric.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {formatNumber(metric.value)}
                </Typography>
                {metric.helper && (
                  <Typography variant="caption" color="text.secondary">
                    {metric.helper}
                  </Typography>
                )}
              </Stack>
            </Paper>
          ))}
        </Box>

        {focus === 'sla' && (
          <Alert severity="warning">
            Priorizando publicaciones fuera de SLA. Ordenamos por mayor tiempo en etapa para atender los casos críticos primero.
          </Alert>
        )}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <ToggleButtonGroup
            exclusive
            color="primary"
            size="small"
            value={statusFilter}
            onChange={handleStageChange}
            sx={{ flexWrap: 'wrap' }}
          >
            {STAGE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ textTransform: 'none', px: 2 }}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1} alignItems="center">
            {activeFilterLabel && (
              <Chip label={`Filtro: ${activeFilterLabel}`} size="small" color="primary" variant="outlined" />
            )}
            {focus === 'sla' && (
              <Chip label="Prioridad SLA" size="small" color="warning" variant="outlined" />
            )}
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.08)',
            p: 1,
            overflowX: 'auto',
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            sx={{
              width: '100%',
              '& .MuiDataGrid-columnHeaders': { backgroundColor: 'rgba(0,0,0,0.02)' },
              '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(0,0,0,0.01)' },
              border: 'none',
              minWidth: '720px',
            }}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            getRowHeight={() => 'auto'}
            sortModel={sortModel}
            onSortModelChange={(model) => setSortModel(model)}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            localeText={{ noRowsLabel: 'No se encontraron propiedades' }}
          />
        </Paper>
      </Stack>

      <Dialog open={actionDialog.open} onClose={closeActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedAction?.label || 'Confirmar acción'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {selectedAction?.description && (
              <Typography variant="body2" color="text.secondary">
                {selectedAction.description}
              </Typography>
            )}
            {dialogProperty && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.02)' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {dialogProperty.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dialogProperty.owner}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={dialogStageLabel} />
                  {showDialogSubstateChip && (
                    <Chip size="small" variant="outlined" label={dialogSubstateLabel} />
                  )}
                </Stack>
              </Paper>
            )}
            {showMessageField && (
              <TextField
                autoFocus
                multiline
                minRows={3}
                label={selectedAction?.requiresMessage ? 'Mensaje para el vendedor' : 'Notas (opcional)'}
                placeholder={selectedAction?.defaultMessage || selectedAction?.placeholder}
                value={actionDialog.message}
                onChange={handleActionMessageChange}
                error={messageError}
                helperText={dialogHelperText}
                fullWidth
              />
            )}
            {!showMessageField && selectedAction?.helperText && (
              <Typography variant="body2" color="text.secondary">
                {selectedAction.helperText}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog} disabled={actionDialog.loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmAction} variant="contained" disabled={actionDialog.loading}>
            {actionDialog.loading ? 'Guardando…' : confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PropertyManagementPage;
