import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Map, { Layer, NavigationControl, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
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
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [documentStatusSaving, setDocumentStatusSaving] = useState(() => new Set());
  const [jobRatingDrafts, setJobRatingDrafts] = useState({});
  const [jobRatingNotes, setJobRatingNotes] = useState({});
  const [jobRatingSaving, setJobRatingSaving] = useState(() => new Set());
  const mapToken = config.mapbox?.accessToken;

  const refreshOperatorDetails = useCallback(
    async (pilotId) => {
      if (!pilotId) {
        return;
      }
      try {
        const detail = await operatorService.fetchOperator(pilotId);
        setOperators((prev) => prev.map((item) => (item.id === detail.id ? { ...item, ...detail } : item)));
        setActiveOperator((prev) => (prev && prev.id === detail.id ? { ...prev, ...detail } : prev));
      } catch (error) {
        console.error('Error refreshing operator detail', error);
      }
    },
    [setOperators, setActiveOperator]
  );

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
    if (!mapReady) {
      return;
    }
    const mapInstance = mapRef.current;
    const map = mapInstance?.getMap?.();
    if (!map) {
      return;
    }

    if (activeOperator) {
      const lat = ensureNumber(activeOperator.location_latitude);
      const lon = ensureNumber(activeOperator.location_longitude);
      if (lat === null || lon === null) {
        return;
      }
      const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 8;
      map.flyTo({
        center: [lon, lat],
        zoom: currentZoom < 8 ? 8 : currentZoom,
        duration: 800,
      });
      return;
    }

    if (operatorsWithCoords.length > 0) {
      const { longitude, latitude, zoom } = initialMapView;
      map.flyTo({ center: [longitude, latitude], zoom, duration: 800 });
    }
  }, [mapReady, activeOperator?.id, activeOperator?.location_latitude, activeOperator?.location_longitude, operatorsWithCoords, initialMapView]);

  const summary = useMemo(() => {
    const total = operators.length;
    const available = operators.filter((operator) => operator.is_available).length;
    const approved = operators.filter((operator) => operator.status === 'approved').length;
    const pendingDocs = operators.reduce((acc, operator) => {
      const docs = Array.isArray(operator.documents)
        ? operator.documents.filter((doc) => doc.status !== 'approved' || doc.is_expired)
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

  const rowSelectionModel = useMemo(() => {
    const ids = new Set();
    if (selectedOperatorId !== null && selectedOperatorId !== undefined) {
      ids.add(selectedOperatorId);
    }
    return { type: 'include', ids };
  }, [selectedOperatorId]);

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
          const valueRaw = params?.value;
          const value = Number(valueRaw);
          return Number.isFinite(value) && value > 0 ? `${Math.round(value)} km` : '—';
        },
      },
      {
        field: 'drone_model',
        headerName: 'Dron',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => params?.value || params?.row?.drone_model || '—',
      },
      {
        field: 'last_heartbeat_at',
        headerName: 'Última señal',
        minWidth: 200,
        valueFormatter: (params) => formatDateTime(params?.value),
      },
    ],
    []
  );

  const handleRowSelection = useCallback(
    (selectionModel) => {
      const ids = selectionModel?.ids;
      if (!(ids instanceof Set) || ids.size === 0) {
        return;
      }
      const firstSelectedId = ids.values().next().value;
      const operator = operators.find((item) => item.id === firstSelectedId);
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
        await refreshOperatorDetails(getDocumentPilotId(updated));
        setFeedback({ type: 'success', message: 'Documento actualizado correctamente.' });
        setDocumentDialog({ open: false, document: null });
      } catch (error) {
        console.error('Error updating document', error);
        throw error;
      }
    },
    [documentDialog.document, applyDocumentUpdate, refreshOperatorDetails]
  );

  const handleDocumentDialogClose = useCallback(() => {
    setDocumentDialog({ open: false, document: null });
  }, []);

  const handleDocumentStatusChange = useCallback(
    async (document, nextStatus) => {
      if (!document || !nextStatus || document.status === nextStatus) {
        return;
      }
      setDocumentStatusSaving((prev) => {
        const next = new Set(prev);
        next.add(document.id);
        return next;
      });
      try {
        const updated = await operatorService.updateDocument(document.id, { status: nextStatus });
        applyDocumentUpdate(updated);
        await refreshOperatorDetails(getDocumentPilotId(updated));
        setFeedback({ type: 'success', message: 'Estado de documento actualizado correctamente.' });
      } catch (error) {
        console.error('Error updating document status', error);
        const message = error?.response?.data?.detail || error?.message || 'No pudimos actualizar el estado del documento.';
        setFeedback({ type: 'error', message });
      } finally {
        setDocumentStatusSaving((prev) => {
          const next = new Set(prev);
          next.delete(document.id);
          return next;
        });
      }
    },
    [applyDocumentUpdate, refreshOperatorDetails]
  );

  const handleFeedbackClose = useCallback(() => setFeedback(null), []);

  useEffect(() => {
    setJobRatingDrafts(() => {
      const next = {};
      jobs.forEach((job) => {
        next[job.id] = job.pilot_rating ?? null;
      });
      return next;
    });
    setJobRatingNotes(() => {
      const next = {};
      jobs.forEach((job) => {
        next[job.id] = job.pilot_review_notes ?? '';
      });
      return next;
    });
  }, [jobs]);

  useEffect(() => {
    if (!mapToken) {
      setMapReady(false);
    }
  }, [mapToken]);

  const handleJobRatingChange = useCallback((jobId, value) => {
    setJobRatingDrafts((prev) => ({ ...prev, [jobId]: value ?? null }));
  }, []);

  const handleJobRatingNoteChange = useCallback((jobId, value) => {
    setJobRatingNotes((prev) => ({ ...prev, [jobId]: value }));
  }, []);

  const handleJobRatingSubmit = useCallback(
    async (jobId) => {
      const rating = jobRatingDrafts[jobId];
      if (typeof rating !== 'number' || rating <= 0) {
        setFeedback({ type: 'error', message: 'Selecciona una calificación antes de guardar.' });
        return;
      }
      setJobRatingSaving((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      try {
        const notes = jobRatingNotes[jobId]?.trim() || null;
        const updated = await operatorService.rateOperator(jobId, { rating, notes });
        setJobs((prev) => prev.map((job) => (job.id === updated.id ? { ...job, ...updated } : job)));
        if (updated.assigned_pilot) {
          setActiveOperator((prev) => (prev && prev.id === updated.assigned_pilot.id ? { ...prev, ...updated.assigned_pilot } : prev));
          setOperators((prev) =>
            prev.map((operator) =>
              operator.id === updated.assigned_pilot.id ? { ...operator, ...updated.assigned_pilot } : operator
            )
          );
        }
        setFeedback({ type: 'success', message: 'Calificación guardada correctamente.' });
      } catch (error) {
        console.error('Error rating operator', error);
        const message = error?.response?.data?.error || error?.message || 'No pudimos guardar la calificación.';
        setFeedback({ type: 'error', message });
      } finally {
        setJobRatingSaving((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    },
    [jobRatingDrafts, jobRatingNotes]
  );

  const handleCoverageClick = useCallback(
    (event) => {
      const feature = event?.features?.find((item) => item?.properties?.id !== undefined);
      if (!feature) {
        return;
      }
      const operatorId = Number(feature.properties.id);
      if (!Number.isFinite(operatorId)) {
        return;
      }
      const operator = operators.find((item) => item.id === operatorId);
      if (operator) {
        handleSelectOperator(operator);
      }
    },
    [operators, handleSelectOperator]
  );

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

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid container xs={12} spacing={2}>
          {summaryCards.map((card) => (
            <Grid xs={12} sm={6} md={3} key={card.title}>
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

        <Grid xs={12}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: { xs: '58vh', md: '68vh', xl: '74vh' },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Cobertura geográfica
              </Typography>
              <Tooltip title="Visualiza dónde están ubicados los operadores y el radio aproximado que cubren.">
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </Stack>
            <Box
              sx={{
                flex: 1,
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                height: '100%',
                minHeight: { xs: 380, md: 0 },
              }}
            >
              {!mapToken ? (
                <Alert severity="warning" sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  Falta configurar VITE_MAPBOX_ACCESS_TOKEN para visualizar el mapa.
                </Alert>
              ) : (
                <Map
                  ref={mapRef}
                  reuseMaps
                  initialViewState={initialMapView}
                  mapboxAccessToken={mapToken}
                  mapStyle={config.mapbox?.style || 'mapbox://styles/mapbox/light-v11'}
                  interactiveLayerIds={[mapFillLayer.id]}
                  onClick={handleCoverageClick}
                  onLoad={() => setMapReady(true)}
                  style={{ width: '100%', height: '100%' }}
                >
                  <NavigationControl position="bottom-right" />
                  {coverageFeatures.length > 0 ? (
                    <Source id="operator-coverage" type="geojson" data={coverageGeoJson}>
                      <Layer {...mapFillLayer} />
                      <Layer {...mapLineLayer} />
                    </Source>
                  ) : null}
                </Map>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid container xs={12} spacing={3} alignItems="stretch">
          <Grid xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
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
                rowSelectionModel={rowSelectionModel}
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

          <Grid xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
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
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Teléfono
                    </Typography>
                    <Typography variant="body2">
                      {activeOperator.phone_number || '—'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Dron principal
                    </Typography>
                    <Typography variant="body2">
                      {activeOperator.drone_model || '—'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Años de experiencia
                    </Typography>
                    <Typography variant="body2">
                      {Number.isFinite(Number(activeOperator.experience_years))
                        ? `${activeOperator.experience_years} años`
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Última señal
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(activeOperator.last_heartbeat_at)}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
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
                  <Grid xs={12}>
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
                    <Grid xs={12}>
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
                        const statusLabel = document.status_label || meta.label || 'En revisión';
                        const isExpired = Boolean(document.is_expired);
                        const documentSaving = documentStatusSaving.has(document.id);
                        const statusChipColor = isExpired ? 'error' : meta.color;
                        return (
                          <React.Fragment key={document.id}>
                            <ListItem
                              alignItems="flex-start"
                              sx={{
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: { xs: 1.5, sm: 2 },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                              }}
                            >
                              <ListItemText
                                primaryTypographyProps={{ component: 'div' }}
                                secondaryTypographyProps={{ component: 'div' }}
                                primary={DOCUMENT_TYPE_LABELS[document.doc_type] || document.doc_type}
                                secondary={
                                  <Stack spacing={0.5}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                      <Chip size="small" label={statusLabel} color={statusChipColor} variant="outlined" />
                                      {document.expires_at ? (
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={isExpired ? 'Documento vencido' : `Vence ${formatDateTime(document.expires_at).split(' ')[0]}`}
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
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                  <InputLabel id={`doc-status-${document.id}`}>Estado</InputLabel>
                                  <Select
                                    labelId={`doc-status-${document.id}`}
                                    label="Estado"
                                    value={document.status}
                                    onChange={(event) => handleDocumentStatusChange(document, event.target.value)}
                                    disabled={documentSaving}
                                  >
                                    {DOCUMENT_STATUS_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <Tooltip title="Descargar documento original">
                                  <span>
                                    <IconButton
                                      edge="end"
                                      component="a"
                                      href={document.file_url || document.file || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      disabled={(!document.file_url && !document.file) || documentSaving}
                                      size="small"
                                    >
                                      <CloudDownloadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Button
                                  size="small"
                                  onClick={() => setDocumentDialog({ open: true, document })}
                                  disabled={documentSaving}
                                >
                                  Revisar
                                </Button>
                                {documentSaving ? <CircularProgress size={18} /> : null}
                              </Stack>
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
                        const ratingValue = jobRatingDrafts[job.id] ?? null;
                        const ratingSaving = jobRatingSaving.has(job.id);
                        const notesValue = jobRatingNotes[job.id] ?? '';
                        return (
                          <React.Fragment key={job.id}>
                            <ListItem
                              alignItems="flex-start"
                              sx={{ flexDirection: 'column', gap: 1.5, alignItems: 'stretch' }}
                            >
                              <ListItemText
                                primaryTypographyProps={{ component: 'div' }}
                                secondaryTypographyProps={{ component: 'div' }}
                                primary={
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {job.property_details?.name || `Trabajo #${job.id}`}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      color={jobStatusColor(job.status)}
                                      label={job.status_label || job.status}
                                    />
                                    {typeof job.pilot_rating === 'number' ? (
                                      <Chip
                                        size="small"
                                        color="success"
                                        label={`Rating: ${job.pilot_rating.toFixed(1)}`}
                                        variant="outlined"
                                      />
                                    ) : null}
                                  </Stack>
                                }
                                secondary={
                                  <Stack spacing={0.75}>
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
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                sx={{ width: '100%' }}
                              >
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Rating
                                    value={typeof ratingValue === 'number' ? ratingValue : null}
                                    precision={0.5}
                                    onChange={(_, newValue) => handleJobRatingChange(job.id, newValue)}
                                    disabled={ratingSaving}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {typeof ratingValue === 'number'
                                      ? `${ratingValue.toFixed(1)} / 5`
                                      : 'Sin calificar'}
                                  </Typography>
                                </Stack>
                                <TextField
                                  size="small"
                                  label="Notas internas (opcional)"
                                  value={notesValue}
                                  onChange={(event) => handleJobRatingNoteChange(job.id, event.target.value)}
                                  multiline
                                  minRows={2}
                                  maxRows={4}
                                  sx={{ flex: 1, minWidth: 200 }}
                                  disabled={ratingSaving}
                                />
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => handleJobRatingSubmit(job.id)}
                                  disabled={ratingSaving || typeof ratingValue !== 'number' || ratingValue <= 0}
                                >
                                  {ratingSaving ? 'Guardando…' : 'Guardar calificación'}
                                </Button>
                                {ratingSaving ? <CircularProgress size={20} /> : null}
                              </Stack>
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
