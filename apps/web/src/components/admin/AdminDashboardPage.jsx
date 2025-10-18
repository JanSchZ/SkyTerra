import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlightIcon from '@mui/icons-material/FlightTakeoff';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { propertyService } from '../../services/api';
import WorkflowTimeline from '../ui/WorkflowTimeline.jsx';

const WORKFLOW_STAGE_LABELS = {
  review: 'En revisión',
  approved: 'Publicación aprobada',
  pilot: 'Operación con piloto',
  post: 'En postproducción',
  live: 'Publicada',
};

const WORKFLOW_ORDER = ['review', 'approved', 'pilot', 'post', 'live'];

const formatNumber = (value) => Number(value || 0).toLocaleString('es-CL');

const formatDuration = (hours) => {
  if (hours == null) return '—';
  if (hours >= 48) return `${(hours / 24).toFixed(1)} días`;
  if (hours >= 1) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours * 60)} min`;
};

const AdminDashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await propertyService.getAdminSummary();
      setSummary(response);
    } catch (err) {
      console.error('Error loading admin summary', err);
      setError('No fue posible cargar el resumen operativo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const workflowCounts = summary?.workflow_counts || {};
  const stageStats = summary?.stage_duration_stats || {};
  const propertiesInProgress = summary?.properties_in_progress || [];

  const stageDurationData = useMemo(
    () =>
      WORKFLOW_ORDER.map((key) => {
        const stats = stageStats[key] || {};
        return {
          key,
          label: WORKFLOW_STAGE_LABELS[key] || key,
          average: stats.average_days ?? 0,
          expected: stats.expected_days ?? 0,
          breaches: stats.sla_breaches ?? 0,
        };
      }),
    [stageStats]
  );

  const metricCards = useMemo(
    () => [
      {
        label: 'Pilotos disponibles',
        value: formatNumber(summary?.pilots_available ?? 0),
        icon: <FlightIcon fontSize="small" />, 
        helper: 'Pilotos aprobados con disponibilidad activa.',
      },
      {
        label: 'Operaciones en terreno',
        value: formatNumber(summary?.active_jobs ?? 0),
        icon: <TimelineIcon fontSize="small" />, 
        helper: 'Trabajos invitando, asignados o agendados.',
      },
      {
        label: 'Postproducción en curso',
        value: formatNumber(summary?.postproduction_jobs ?? 0),
        icon: <CameraIcon fontSize="small" />, 
        helper: 'Material recibido, en QC o edición.',
      },
      {
        label: 'Alertas activas',
        value: formatNumber(summary?.alerts_total ?? 0),
        icon: <WarningAmberIcon fontSize="small" />, 
        helper: 'Alertas visibles para el equipo administrador.',
      },
    ],
    [summary]
  );

  const workflowCards = useMemo(
    () =>
      WORKFLOW_ORDER.map((key) => ({
        key,
        label: WORKFLOW_STAGE_LABELS[key] || key,
        value: formatNumber(workflowCounts[key] ?? 0),
      })),
    [workflowCounts]
  );

  const handleOpenDetail = (property) => {
    setSelectedProperty(property);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedProperty(null);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Panel operativo Skyterra
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sincroniza a vendedores, administradores y pilotos con una vista única del workflow.
              </Typography>
            </Box>
            <IconButton onClick={loadSummary} disabled={loading}>
              <RefreshIcon className={loading ? 'spin' : ''} />
            </IconButton>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Grid container spacing={2}>
            {metricCards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.label}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', height: '100%' }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {card.icon}
                      <Typography variant="subtitle2" color="text.secondary">
                        {card.label}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.helper}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Distribución por etapa
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Publicaciones por hito del workflow (review → live).
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SupportAgentIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {formatNumber(summary?.pending_properties ?? 0)} publicaciones esperando revisión manual.
                  </Typography>
                </Stack>
              </Stack>
              <Grid container spacing={2}>
                {workflowCards.map((item) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={item.key}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px dashed rgba(0,0,0,0.12)', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {item.value}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Duración promedio por etapa
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compara el tiempo real vs el SLA objetivo de cada hito.
                </Typography>
              </Box>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stageDurationData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(0,0,0,0.45)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(0,0,0,0.45)" tickFormatter={(value) => `${value.toFixed(1)}d`} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ background: '#101010', color: '#ffffff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                      formatter={(value, name) => {
                        if (name === 'average') return [`${value.toFixed(2)} días`, 'Promedio real'];
                        if (name === 'expected' && value > 0) return [`${value.toFixed(2)} días`, 'SLA plan'];
                        return ['—', name];
                      }}
                    />
                    <Bar dataKey="average" name="Promedio real" fill="#101010" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expected" name="SLA plan" fill="#9aa0a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {stageDurationData.map((item) => (
                  <Chip
                    key={item.key}
                    size="small"
                    label={`${WORKFLOW_STAGE_LABELS[item.key] || item.key}: ${item.breaches} fuera de SLA`}
                    color={item.breaches > 0 ? 'warning' : 'default'}
                    variant={item.breaches > 0 ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Publicaciones en curso
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revisa cuánto tiempo llevan en la etapa actual y el último evento registrado.
                </Typography>
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Propiedad</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Etapa</TableCell>
                      <TableCell>Días en etapa</TableCell>
                      <TableCell>Último evento</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propertiesInProgress.map((property) => {
                      const lastEvent = property.last_event;
                      return (
                        <TableRow key={property.id} hover>
                          <TableCell>{property.id}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {property.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {property.owner_email || 'Sin correo'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{property.plan_name || '—'}</TableCell>
                          <TableCell>
                            <Chip label={property.workflow_label} size="small" color="primary" variant={property.stage_state === 'pending' ? 'outlined' : 'filled'} />
                          </TableCell>
                          <TableCell>{formatDuration(property.stage_duration_hours)}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {lastEvent?.substate_label || lastEvent?.substate || '—'}
                              </Typography>
                              {lastEvent?.message && (
                                <Tooltip title={lastEvent.message} placement="top">
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {lastEvent.message}
                                  </Typography>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => handleOpenDetail(property)}>
                              Ver timeline
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {propertiesInProgress.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No hay publicaciones activas fuera del estado publicado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de workflow</DialogTitle>
        <DialogContent dividers>
          {selectedProperty ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{selectedProperty.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  ID {selectedProperty.id} · {selectedProperty.plan_name || 'Sin plan asignado'}
                </Typography>
              </Box>
              <WorkflowTimeline timeline={selectedProperty.timeline} />
            </Stack>
          ) : (
            <Typography variant="body2">Selecciona una publicación para revisar su historial.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboardPage;
