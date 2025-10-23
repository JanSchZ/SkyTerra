import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotListedLocationIcon from '@mui/icons-material/NotListedLocation';
import { useTheme } from '@mui/material/styles';
import config from '../../config/environment';
import { operatorService } from '../../services/api';

const DOCUMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'En revisión' },
  { value: 'approved', label: 'Aprobado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'expired', label: 'Vencido' },
];

const DOCUMENT_STATUS_META = {
  pending: { label: 'En revisión', color: 'warning' },
  approved: { label: 'Aprobado', color: 'success' },
  rejected: { label: 'Rechazado', color: 'error' },
  expired: { label: 'Vencido', color: 'error' },
};

const DOCUMENT_TYPE_LABELS = {
  id: 'Identificación oficial',
  license: 'Licencia de piloto',
  drone_registration: 'Registro de dron',
  insurance: 'Seguro',
  background_check: 'Certificado de antecedentes',
  other: 'Otro documento',
};

const OPERATOR_STATUS_META = {
  approved: { label: 'Aprobado', color: 'success' },
  pending: { label: 'Pendiente', color: 'warning' },
  rejected: { label: 'Rechazado', color: 'error' },
  suspended: { label: 'Suspendido', color: 'info' },
};

const JOB_STATUS_COLORS = {
  assigned: 'info',
  scheduling: 'info',
  scheduled: 'primary',
  shooting: 'warning',
  finished: 'success',
  uploading: 'warning',
  received: 'success',
  qc: 'info',
  editing: 'info',
  preview_ready: 'success',
  ready_for_publish: 'success',
  published: 'success',
  canceled: 'error',
};

const getDocumentPilotId = (doc) => {
  if (!doc) return null;
  if (typeof doc.pilot === 'number') return doc.pilot;
  if (doc.pilot && typeof doc.pilot.id === 'number') return doc.pilot.id;
  return null;
};

const ensureNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
};

const getInitials = (value) => {
  if (!value) return 'OP';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OP';
};

const computeOperatorName = (operator) => {
  if (!operator) return 'Operador sin nombre';
  if (operator.display_name) return operator.display_name;
  const first = operator.user?.first_name ?? '';
  const last = operator.user?.last_name ?? '';
  const fallback = `${first} ${last}`.trim();
  if (fallback) return fallback;
  return operator.user?.email || `Operador #${operator.id}`;
};

const jobStatusColor = (status) => JOB_STATUS_COLORS[status] || 'default';

const extractLinksFromValue = (value, accumulator) => {
  if (!value) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      accumulator.add(trimmed);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => extractLinksFromValue(entry, accumulator));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((entry) => extractLinksFromValue(entry, accumulator));
  }
};

const extractLinksFromJob = (job) => {
  const links = new Set();
  if (!job) return [];
  extractLinksFromValue(job.deliverables, links);
  if (Array.isArray(job.timeline)) {
    job.timeline.forEach((event) => extractLinksFromValue(event?.metadata, links));
  }
  return Array.from(links);
};

const DocumentReviewDialog = ({ open, document, onClose, onSubmit }) => {
  const [status, setStatus] = useState(document?.status || 'pending');
  const [notes, setNotes] = useState(document?.notes ?? '');
  const [expiresAt, setExpiresAt] = useState(document?.expires_at ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setStatus(document?.status || 'pending');
      setNotes(document?.notes ?? '');
      setExpiresAt(document?.expires_at ?? '');
      setSaving(false);
      setError(null);
    }
  }, [open, document]);

  const handleSubmit = async () => {
    if (!document) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        status,
        notes: notes.trim() || null,
        expires_at: expiresAt || null,
      });
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'No se pudo actualizar el documento.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = document?.doc_type ? (DOCUMENT_TYPE_LABELS[document.doc_type] || document.doc_type) : 'Documento';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Revisión de documento</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Tipo de documento" value={typeLabel} fullWidth disabled />
          <TextField
            select
            label="Estado"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            fullWidth
          >
            {DOCUMENT_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Observaciones"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={3}
            placeholder="Notas internas o feedback para el operador"
            fullWidth
          />
          <TextField
            label="Fecha de expiración"
            type="date"
            value={expiresAt ? expiresAt.slice(0, 10) : ''}
            onChange={(event) => setExpiresAt(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AdminOperatorsPage = () => {
  const theme = useTheme();
  const [operators, setOperators] = useState([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [activeOperator, setActiveOperator] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [documentDialog, setDocumentDialog] = useState({ open: false, document: null });
  const [viewState, setViewState] = useState({
    longitude: -70.6693,
    latitude: -33.4489,
    zoom: 4.5,
    pitch: 0,
    bearing: 0,
  });

  const applyDocumentUpdate = useCallback((updatedDoc) => {
    const pilotId = getDocumentPilotId(updatedDoc);
    if (!pilotId) {
      return;
    }
    setOperators((prev) =>
      prev.map((operator) => {
        if (operator.id !== pilotId) {
          return operator;
        }
        const nextDocuments = Array.isArray(operator.documents)
          ? operator.documents.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
          : [];
        if (!nextDocuments.some((doc) => doc.id === updatedDoc.id)) {
          nextDocuments.push(updatedDoc);
        }
        return { ...operator, documents: nextDocuments };
      })
    );
    setActiveOperator((prev) => {
      if (!prev || prev.id !== pilotId) {
        return prev;
      }
      const nextDocuments = Array.isArray(prev.documents)
        ? prev.documents.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
        : [];
      if (!nextDocuments.some((doc) => doc.id === updatedDoc.id)) {
        nextDocuments.push(updatedDoc);
      }
      return { ...prev, documents: nextDocuments };
    });
  }, []);

  const loadOperators = useCallback(async () => {
    setOperatorsLoading(true);
    setOperatorsError(null);
    try {
      const response = await operatorService.listOperators({ page_size: 200, ordering: '-updated_at' });
      setOperators(response.results);
      if (selectedOperatorId) {
        const matching = response.results.find((item) => item.id === selectedOperatorId);
        if (matching) {
          setActiveOperator({ ...matching, documents: matching.documents });
        }
      }
    } catch (error) {
      console.error('Error loading operators', error);
      const message = error?.response?.data?.detail || error?.message || 'No se pudieron cargar los operadores.';
      setOperatorsError(message);
    } finally {
      setOperatorsLoading(false);
    }
  }, [selectedOperatorId]);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  const handleSelectOperator = useCallback(
    async (operator) => {
      if (!operator) {
        return;
      }
      if (operator.id === selectedOperatorId && activeOperator && activeOperator.id === operator.id) {
        return;
      }
      setSelectedOperatorId(operator.id);
      setActiveOperator((prev) => (prev && prev.id === operator.id ? prev : operator));
      setJobs([]);
      setJobsError(null);
      setJobsLoading(true);
      try {
        const [detail, jobsResponse] = await Promise.all([
          operatorService.fetchOperator(operator.id),
          operatorService.listOperatorJobs({ assigned_pilot: operator.id, page_size: 100, ordering: '-created_at' }),
        ]);
        setActiveOperator(detail);
        setOperators((prev) => prev.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)));
        setJobs(jobsResponse.results);
      } catch (error) {
        console.error('Error loading operator detail', error);
        const message = error?.response?.data?.detail || error?.message || 'No pudimos cargar el detalle del operador.';
        setJobsError(message);
      } finally {
        setJobsLoading(false);
      }
    },
    [activeOperator, selectedOperatorId]
  );

  useEffect(() => {
    if (!operatorsLoading && operators.length > 0 && !selectedOperatorId) {
      handleSelectOperator(operators[0]);
    }
  }, [operatorsLoading, operators, selectedOperatorId, handleSelectOperator]);

  const operatorsWithCoords = useMemo(
    () =>
      operators.filter((operator) => {
        const lat = ensureNumber(operator.location_latitude);
        const lon = ensureNumber(operator.location_longitude);
        return lat !== null && lon !== null;
      }),
    [operators]
  );

  const coverageFeatures = useMemo(() => {
    return operatorsWithCoords
      .map((operator) => {
        const lat = ensureNumber(operator.location_latitude);
        const lon = ensureNumber(operator.location_longitude);
        if (lat === null || lon === null) {
          return null;
        }
        const radius = Math.max(Number(operator.coverage_radius_km) || 0, 5);
        const feature = turf.circle([lon, lat], radius, {
          steps: 64,
          units: 'kilometers',
          properties: {
            id: operator.id,
            is_available: Boolean(operator.is_available),
            is_selected: operator.id === selectedOperatorId,
            name: computeOperatorName(operator),
            radius,
          },
        });
        return feature;
      })
      .filter(Boolean);
  }, [operatorsWithCoords, selectedOperatorId]);

  const coverageGeoJson = useMemo(
    () => ({ type: 'FeatureCollection', features: coverageFeatures }),
    [coverageFeatures]
  );

  const initialMapView = useMemo(() => {
    if (operatorsWithCoords.length === 0) {
      return { longitude: -70.6693, latitude: -33.4489, zoom: 4.5, pitch: 0, bearing: 0 };
    }
    const sum = operatorsWithCoords.reduce(
      (acc, operator) => {
        const lat = ensureNumber(operator.location_latitude);
        const lon = ensureNumber(operator.location_longitude);
        return {
          lat: acc.lat + (lat ?? 0),
          lon: acc.lon + (lon ?? 0),
        };
      },
      { lat: 0, lon: 0 }
    );
    const centerLat = sum.lat / operatorsWithCoords.length;
    const centerLon = sum.lon / operatorsWithCoords.length;
    const zoom = operatorsWithCoords.length > 1 ? 5.2 : 8.5;
    return { longitude: centerLon, latitude: centerLat, zoom, pitch: 0, bearing: 0 };
  }, [operatorsWithCoords]);

  useEffect(() => {
    if (!activeOperator && operatorsWithCoords.length > 0) {
      setViewState(initialMapView);
    }
  }, [activeOperator, operatorsWithCoords, initialMapView]);

  useEffect(() => {
    if (!activeOperator) {
      return;
    }
    const lat = ensureNumber(activeOperator.location_latitude);
    const lon = ensureNumber(activeOperator.location_longitude);
    if (lat === null || lon === null) {
      return;
    }
    setViewState((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lon,
      zoom: prev.zoom < 8 ? 8 : prev.zoom,
    }));
  }, [activeOperator?.id, activeOperator?.location_latitude, activeOperator?.location_longitude]);

  const summary = useMemo(() => {
    const total = operators.length;
    const available = operators.filter((operator) => operator.is_available).length;
    const approved = operators.filter((operator) => operator.status === 'approved').length;
    const pendingDocs = operators.reduce((acc, operator) => {
      const docs = Array.isArray(operator.documents)
        ? operator.documents.filter((doc) => doc.status === 'pending')
        : [];
      return acc + docs.length;
    }, 0);
    const offline = total - available;
    return { total, available, approved, pendingDocs, offline };
  }, [operators]);

  const summaryCards = useMemo(
    () => [
      {
        title: 'Operadores activos',
        value: summary.total,
        description: 'Pilotos registrados en la red',
        icon: <AssignmentTurnedInIcon color="primary" />, 
      },
      {
        title: 'Disponibles ahora',
        value: summary.available,
        description: 'Pilotos listos para recibir misiones',
        icon: <CheckCircleIcon color="success" />, 
      },
      {
        title: 'Sin disponibilidad',
        value: summary.offline,
        description: 'Pilotos marcados como no disponibles',
        icon: <NotListedLocationIcon color="warning" />, 
      },
      {
        title: 'Docs pendientes',
        value: summary.pendingDocs,
        description: 'Documentos esperando revisión',
        icon: <HourglassBottomIcon color="warning" />, 
      },
    ],
    [summary]
  );

  const rows = useMemo(
    () =>
      operators.map((operator) => {
        const name = computeOperatorName(operator);
        const email = operator.user?.email || '';
        return {
          id: operator.id,
          name,
          email,
          status: operator.status,
          is_available: operator.is_available,
          coverage_radius_km: operator.coverage_radius_km,
          drone_model: operator.drone_model,
          last_heartbeat_at: operator.last_heartbeat_at,
          avatarSeed: getInitials(name),
          raw: operator,
        };
      }),
    [operators]
  );

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Operador',
        flex: 1.4,
        minWidth: 240,
        renderCell: (params) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{ width: 40, height: 40 }}
              src={`https://api.dicebear.com/7.x/initials/svg?radius=40&seed=${encodeURIComponent(params.row.avatarSeed)}`}
            >
              {params.row.avatarSeed}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {params.row.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {params.row.email || '—'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        minWidth: 150,
        renderCell: (params) => {
          const meta = OPERATOR_STATUS_META[params.value] || { label: params.value, color: 'default' };
          return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />;
        },
      },
      {
        field: 'is_available',
        headerName: 'Disponibilidad',
        minWidth: 160,
        renderCell: (params) =>
          params.value ? (
            <Chip size="small" label="Disponible" color="success" />
          ) : (
            <Chip size="small" label="No disponible" variant="outlined" />
          ),
      },
      {
        field: 'coverage_radius_km',
        headerName: 'Radio (km)',
        minWidth: 130,
        valueFormatter: (params) => {
          const value = Number(params.value);
          return Number.isFinite(value) && value > 0 ? `${Math.round(value)} km` : '—';
        },
      },
      {
        field: 'drone_model',
        headerName: 'Dron',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => params.value || '—',
      },
      {
        field: 'last_heartbeat_at',
        headerName: 'Última señal',
        minWidth: 200,
        valueFormatter: (params) => formatDateTime(params.value),
      },
    ],
    []
  );

  const handleRowSelection = useCallback(
    (selectionModel) => {
      const [first] = selectionModel;
      if (!first) {
        return;
      }
      const operator = operators.find((item) => item.id === first);
      if (operator) {
        handleSelectOperator(operator);
      }
    },
    [operators, handleSelectOperator]
  );

  const handleRowClick = useCallback(
    (params) => {
      if (params?.row?.raw) {
        handleSelectOperator(params.row.raw);
      }
    },
    [handleSelectOperator]
  );

  const handleDocumentDialogSubmit = useCallback(
    async (payload) => {
      const document = documentDialog.document;
      if (!document) {
        return;
      }
      try {
        const updated = await operatorService.updateDocument(document.id, payload);
        applyDocumentUpdate(updated);
        setFeedback({ type: 'success', message: 'Documento actualizado correctamente.' });
        setDocumentDialog({ open: false, document: null });
      } catch (error) {
        console.error('Error updating document', error);
        throw error;
      }
    },
    [documentDialog.document, applyDocumentUpdate]
  );

  const handleDocumentDialogClose = useCallback(() => {
    setDocumentDialog({ open: false, document: null });
  }, []);

  const handleFeedbackClose = useCallback(() => setFeedback(null), []);

  const mapFillLayer = useMemo(() => (
    {
      id: 'operator-coverage-fill',
      type: 'fill',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'is_selected'], true],
          ['case', ['==', ['get', 'is_available'], true], 'rgba(34,197,94,0.35)', 'rgba(239,68,68,0.35)'],
          ['case', ['==', ['get', 'is_available'], true], 'rgba(34,197,94,0.18)', 'rgba(239,68,68,0.18)'],
        ],
        'fill-outline-color': [
          'case',
          ['==', ['get', 'is_available'], true],
          'rgba(34,197,94,0.6)',
          'rgba(239,68,68,0.6)',
        ],
      },
    }
  ), []);

  const mapLineLayer = useMemo(() => (
    {
      id: 'operator-coverage-line',
      type: 'line',
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'is_selected'], true],
          ['case', ['get', 'is_available'], 'rgba(34,197,94,0.9)', 'rgba(239,68,68,0.9)'],
          ['case', ['get', 'is_available'], 'rgba(34,197,94,0.6)', 'rgba(239,68,68,0.6)'],
        ],
        'line-width': 2,
      },
    }
  ), []);

  const mapToken = config.mapbox?.accessToken;

  const selectedDocuments = Array.isArray(activeOperator?.documents) ? activeOperator.documents : [];

  const jobItems = jobs;

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }} gutterBottom>
            Red de Operadores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualiza cobertura, documentos y disponibilidad de pilotos para coordinar la postproducción y asignar nuevas misiones.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadOperators}
          disabled={operatorsLoading}
        >
          Actualizar
        </Button>
      </Stack>

      {operatorsError ? (
        <Alert severity="error">{operatorsError}</Alert>
      ) : null}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Cobertura geográfica
              </Typography>
              <Tooltip title="Visualiza dónde están ubicados los operadores y el radio aproximado que cubren.">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Stack>
            <Box sx={{ flex: 1, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              {!mapToken ? (
                <Alert severity="warning" sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  Falta configurar VITE_MAPBOX_ACCESS_TOKEN para visualizar el mapa.
                </Alert>
              ) : (
                <Map
                  mapboxAccessToken={mapToken}
                  mapStyle={config.mapbox?.style || 'mapbox://styles/mapbox/light-v11'}
                  viewState={viewState}
                  onMove={(event) => setViewState(event.viewState)}
                  style={{ width: '100%', height: '100%' }}
                >
                  <NavigationControl position="bottom-right" />
                  {coverageFeatures.length > 0 ? (
                    <Source id="operator-coverage" type="geojson" data={coverageGeoJson}>
                      <Layer {...mapFillLayer} />
                      <Layer {...mapLineLayer} />
                    </Source>
                  ) : null}
                  {operatorsWithCoords.map((operator) => {
                    const lat = ensureNumber(operator.location_latitude);
                    const lon = ensureNumber(operator.location_longitude);
                    if (lat === null || lon === null) {
                      return null;
                    }
                    const isSelected = operator.id === selectedOperatorId;
                    const markerColor = operator.is_available ? theme.palette.success.main : theme.palette.error.main;
                    const borderColor = isSelected ? theme.palette.common.white : theme.palette.grey[900];
                    return (
                      <Marker key={operator.id} latitude={lat} longitude={lon} anchor="bottom">
                        <Tooltip
                          title={`${computeOperatorName(operator)} • ${operator.coverage_radius_km ? `${operator.coverage_radius_km} km` : 'Radio sin definir'}`}
                          arrow
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleSelectOperator(operator)}
                            sx={{
                              p: 0.5,
                              backgroundColor: markerColor,
                              border: `2px solid ${borderColor}`,
                              color: theme.palette.common.white,
                              '&:hover': { backgroundColor: markerColor },
                            }}
                          >
                            <LocationOnIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Marker>
                    );
                  })}
                </Map>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Grid container spacing={2}>
            {summaryCards.map((card) => (
              <Grid item xs={12} sm={6} key={card.title}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                  <Stack spacing={1.2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {card.icon}
                      <Typography variant="subtitle2" color="text.secondary">
                        {card.title}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.description}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Operadores disponibles
            </Typography>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              density="comfortable"
              disableRowSelectionOnClick
              hideFooterSelectedRowCount
              loading={operatorsLoading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
              }}
              rowSelectionModel={selectedOperatorId ? [selectedOperatorId] : []}
              onRowSelectionModelChange={handleRowSelection}
              onRowClick={handleRowClick}
              sx={{
                '& .MuiDataGrid-cell': { borderBottom: `1px solid ${theme.palette.divider}` },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.action.hover,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  fontWeight: 600,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2.5, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activeOperator ? (
              <>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{ width: 56, height: 56 }}
                    src={`https://api.dicebear.com/7.x/initials/svg?radius=40&seed=${encodeURIComponent(getInitials(computeOperatorName(activeOperator)))}`}
                  >
                    {getInitials(computeOperatorName(activeOperator))}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {computeOperatorName(activeOperator)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activeOperator.user?.email || 'Sin correo registrado'}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(() => {
                    const meta = OPERATOR_STATUS_META[activeOperator.status] || { label: activeOperator.status, color: 'default' };
                    return <Chip label={meta.label} color={meta.color} size="small" />;
                  })()}
                  <Chip
                    label={activeOperator.is_available ? 'Disponible' : 'No disponible'}
                    color={activeOperator.is_available ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip
                    label={`Radio ${activeOperator.coverage_radius_km ? `${Math.round(activeOperator.coverage_radius_km)} km` : 'sin definir'}`}
                    size="small"
                    icon={<DoneAllIcon fontSize="small" />}
                  />
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Teléfono
                    </Typography>
                    <Typography variant="body2">
                      {activeOperator.phone_number || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Ciudad base
                    </Typography>
                    <Typography variant="body2">
                      {activeOperator.base_city || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Dron principal
                    </Typography>
                    <Typography variant="body2">
                      {activeOperator.drone_model || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Años de experiencia
                    </Typography>
                    <Typography variant="body2">
                      {Number.isFinite(Number(activeOperator.experience_years))
                        ? `${activeOperator.experience_years} años`
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Última señal
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(activeOperator.last_heartbeat_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Sitio web
                    </Typography>
                    {activeOperator.website ? (
                      <Link href={activeOperator.website} target="_blank" rel="noopener noreferrer" variant="body2">
                        {activeOperator.website}
                      </Link>
                    ) : (
                      <Typography variant="body2">—</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Portafolio
                    </Typography>
                    {activeOperator.portfolio_url ? (
                      <Link href={activeOperator.portfolio_url} target="_blank" rel="noopener noreferrer" variant="body2">
                        {activeOperator.portfolio_url}
                      </Link>
                    ) : (
                      <Typography variant="body2">—</Typography>
                    )}
                  </Grid>
                  {activeOperator.notes ? (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Notas internas
                      </Typography>
                      <Typography variant="body2">{activeOperator.notes}</Typography>
                    </Grid>
                  ) : null}
                </Grid>

                <Divider />

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Documentos requeridos
                    </Typography>
                    <Chip
                      size="small"
                      color="info"
                      label={`${selectedDocuments.length} documentos`}
                    />
                  </Stack>
                  {selectedDocuments.length === 0 ? (
                    <Alert severity="info">Aún no recibimos documentos de este operador.</Alert>
                  ) : (
                    <List dense disablePadding>
                      {selectedDocuments.map((document) => {
                        const meta = DOCUMENT_STATUS_META[document.status] || {
                          label: document.status,
                          color: 'default',
                        };
                        return (
                          <React.Fragment key={document.id}>
                            <ListItem alignItems="flex-start">
                              <ListItemText
                                primary={DOCUMENT_TYPE_LABELS[document.doc_type] || document.doc_type}
                                secondary={
                                  <Stack spacing={0.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                                      {document.expires_at ? (
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={`Vence ${formatDateTime(document.expires_at).split(' ')[0]}`}
                                        />
                                      ) : null}
                                    </Stack>
                                    {document.notes ? (
                                      <Typography variant="caption" color="text.secondary">
                                        {document.notes}
                                      </Typography>
                                    ) : null}
                                  </Stack>
                                }
                              />
                              <ListItemSecondaryAction>
                                <Tooltip title="Descargar documento original">
                                  <span>
                                    <IconButton
                                      edge="end"
                                      component="a"
                                      href={document.file_url || document.file || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      disabled={!document.file_url && !document.file}
                                      size="small"
                                    >
                                      <CloudDownloadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Button
                                  size="small"
                                  onClick={() => setDocumentDialog({ open: true, document })}
                                  sx={{ ml: 1 }}
                                >
                                  Revisar
                                </Button>
                              </ListItemSecondaryAction>
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        );
                      })}
                    </List>
                  )}
                </Stack>

                <Divider />

                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Misiones recientes
                  </Typography>
                  {jobsLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : jobsError ? (
                    <Alert severity="error">{jobsError}</Alert>
                  ) : jobItems.length === 0 ? (
                    <Alert severity="info">Aún no registramos misiones para este operador.</Alert>
                  ) : (
                    <List dense disablePadding>
                      {jobItems.map((job) => {
                        const links = extractLinksFromJob(job);
                        return (
                          <React.Fragment key={job.id}>
                            <ListItem alignItems="flex-start">
                              <ListItemText
                                primary={
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {job.property_details?.name || `Trabajo #${job.id}`}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      color={jobStatusColor(job.status)}
                                      label={job.status_label || job.status}
                                    />
                                  </Stack>
                                }
                                secondary={
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">
                                      {job.scheduled_start
                                        ? `Agendado ${formatDateTime(job.scheduled_start)}`
                                        : 'Sin fecha agendada'}
                                    </Typography>
                                    {links.length > 0 ? (
                                      <Stack spacing={0.5}>
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                          Material en crudo:
                                        </Typography>
                                        {links.map((link) => (
                                          <Link
                                            key={link}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="caption"
                                          >
                                            {link}
                                          </Link>
                                        ))}
                                      </Stack>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        Sin entregables registrados todavía.
                                      </Typography>
                                    )}
                                  </Stack>
                                }
                              />
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        );
                      })}
                    </List>
                  )}
                </Stack>
              </>
            ) : (
              <Alert severity="info">Selecciona un operador para ver su detalle.</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      <DocumentReviewDialog
        open={documentDialog.open}
        document={documentDialog.document}
        onClose={handleDocumentDialogClose}
        onSubmit={handleDocumentDialogSubmit}
      />

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={5000}
        onClose={handleFeedbackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {feedback ? (
          <Alert onClose={handleFeedbackClose} severity={feedback.type} variant="filled" sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
};

export default AdminOperatorsPage;
