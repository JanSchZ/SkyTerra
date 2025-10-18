import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { propertyService } from '../../services/api';

const WORKFLOW_STAGE_LABELS = {
  review: 'En revisión',
  approved: 'Publicación aprobada',
  pilot: 'Operación con piloto',
  post: 'En postproducción',
  live: 'Publicada',
};

const WORKFLOW_ORDER = ['review', 'approved', 'pilot', 'post', 'live'];

const formatNumber = (value) => Number(value || 0).toLocaleString('es-CL');

const AdminAnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await propertyService.getAdminSummary();
      setSummary(response);
    } catch (err) {
      console.error('Error loading analytics summary', err);
      setError('No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const workflowCounts = summary?.workflow_counts || {};
  const stageStats = summary?.stage_duration_stats || {};
  const propertiesByDay = summary?.properties_by_day || [];

  const workflowData = useMemo(
    () =>
      WORKFLOW_ORDER.map((key) => ({
        key,
        label: WORKFLOW_STAGE_LABELS[key] || key,
        value: workflowCounts[key] ?? 0,
      })),
    [workflowCounts]
  );

  const durationData = useMemo(
    () =>
      WORKFLOW_ORDER.map((key) => {
        const stats = stageStats[key] || {};
        return {
          key,
          label: WORKFLOW_STAGE_LABELS[key] || key,
          average: stats.average_days ?? 0,
          median: stats.median_days ?? 0,
          expected: stats.expected_days ?? 0,
        };
      }),
    [stageStats]
  );

  const recentVelocity = useMemo(
    () =>
      propertiesByDay.map((entry) => ({
        date: entry.day || entry.date,
        created: entry.count || entry.total || 0,
      })),
    [propertiesByDay]
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Analítica operativa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comprende el funnel completo y evalúa el desempeño de cada etapa.
              </Typography>
            </Box>
             <IconButton onClick={loadSummary} disabled={loading}>
               <RefreshIcon className={loading ? 'spin' : ''} />
             </IconButton>
           </Stack>

           {error && <Alert severity="error">{error}</Alert>}

           <Grid container spacing={2}>
             <Grid item xs={12} sm={6} md={3}>
               <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                 <Stack spacing={1}>
                   <Typography variant="subtitle2" color="text.secondary">En revisión</Typography>
                   <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatNumber(summary?.pending_properties ?? 0)}</Typography>
                   <Typography variant="body2" color="text.secondary">Publicaciones esperando validación documental.</Typography>
                 </Stack>
               </Paper>
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
               <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                 <Stack spacing={1}>
                   <Typography variant="subtitle2" color="text.secondary">Publicadas hoy</Typography>
                   <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatNumber(summary?.published_today ?? 0)}</Typography>
                   <Typography variant="body2" color="text.secondary">Aprobaciones que avanzaron a estado activo.</Typography>
                 </Stack>
               </Paper>
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
               <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                 <Stack spacing={1}>
                   <Typography variant="subtitle2" color="text.secondary">Propiedades en vivo</Typography>
                   <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatNumber(summary?.live_properties ?? 0)}</Typography>
                   <Typography variant="body2" color="text.secondary">Publicaciones visibles actualmente en Skyterra.</Typography>
                 </Stack>
               </Paper>
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
               <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                 <Stack spacing={1}>
                   <Typography variant="subtitle2" color="text.secondary">Tiempo promedio (ha)</Typography>
                   <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatNumber(summary?.average_property_size ?? 0)}</Typography>
                   <Typography variant="body2" color="text.secondary">Tamaño promedio de los terrenos activos.</Typography>
                 </Stack>
               </Paper>
             </Grid>
           </Grid>

           <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
             <Stack spacing={2}>
               <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                 <Box>
                   <Typography variant="h6" sx={{ fontWeight: 600 }}>Funnel del workflow</Typography>
                   <Typography variant="body2" color="text.secondary">Cantidad de publicaciones por hito clave.</Typography>
                 </Box>
                 <InsightsOutlinedIcon fontSize="small" color="action" />
               </Stack>
               <Box sx={{ width: '100%', height: 320 }}>
                 <ResponsiveContainer>
                   <BarChart data={workflowData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                     <XAxis dataKey="label" stroke="rgba(0,0,0,0.45)" tick={{ fontSize: 12 }} />
                     <YAxis stroke="rgba(0,0,0,0.45)" allowDecimals={false} />
                     <RechartsTooltip
                       cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                       contentStyle={{ background: '#101010', color: '#ffffff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                       formatter={(value) => formatNumber(value)}
                     />
                     <Bar dataKey="value" fill="#101010" radius={[6, 6, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </Box>
             </Stack>
           </Paper>

           <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
             <Stack spacing={2}>
               <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                 <Box>
                   <Typography variant="h6" sx={{ fontWeight: 600 }}>Duración por etapa</Typography>
                   <Typography variant="body2" color="text.secondary">Promedio, mediana y SLA de cada tramo.</Typography>
                 </Box>
                 <TimelineIcon fontSize="small" color="action" />
               </Stack>
               <Box sx={{ width: '100%', height: 320 }}>
                 <ResponsiveContainer>
                   <BarChart data={durationData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                     <XAxis dataKey="label" stroke="rgba(0,0,0,0.45)" tick={{ fontSize: 12 }} />
                     <YAxis stroke="rgba(0,0,0,0.45)" tickFormatter={(value) => `${value.toFixed(1)}d`} />
                     <RechartsTooltip
                       cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                       contentStyle={{ background: '#101010', color: '#ffffff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                       formatter={(value, name) => {
                         if (name === 'average') return [`${value.toFixed(2)} días`, 'Promedio'];
                         if (name === 'median') return [`${value.toFixed(2)} días`, 'Mediana'];
                         if (name === 'expected' && value > 0) return [`${value.toFixed(2)} días`, 'SLA'];
                         return ['—', name];
                       }}
                     />
                     <Bar dataKey="average" name="Promedio" fill="#101010" radius={[6, 6, 0, 0]} />
                     <Bar dataKey="median" name="Mediana" fill="#5f6368" radius={[6, 6, 0, 0]} />
                     <Bar dataKey="expected" name="SLA" fill="#b9c0c7" radius={[6, 6, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </Box>
               <Stack direction="row" spacing={1} flexWrap="wrap">
                 {durationData.map((item) => (
                   <Chip
                     key={item.key}
                     label={`${WORKFLOW_STAGE_LABELS[item.key] || item.key}: ${item.average.toFixed(1)}d promedio`}
                     size="small"
                     variant="outlined"
                   />
                 ))}
               </Stack>
             </Stack>
           </Paper>

           <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
             <Stack spacing={2}>
               <Box>
                 <Typography variant="h6" sx={{ fontWeight: 600 }}>Altas recientes</Typography>
                 <Typography variant="body2" color="text.secondary">Propiedades creadas por día (últimos 7 días).</Typography>
               </Box>
               <Box sx={{ width: '100%', height: 280 }}>
                 <ResponsiveContainer>
                   <LineChart data={recentVelocity} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                     <XAxis dataKey="date" stroke="rgba(0,0,0,0.45)" tickFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })} />
                     <YAxis stroke="rgba(0,0,0,0.45)" allowDecimals={false} />
                     <RechartsTooltip
                       contentStyle={{ background: '#101010', color: '#ffffff', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                       formatter={(value) => formatNumber(value)}
                     />
                     <Line type="monotone" dataKey="created" stroke="#101010" strokeWidth={2} dot={{ r: 3 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </Box>
             </Stack>
           </Paper>
         </Stack>
       </Container>
     </Box>
   );
 };

 export default AdminAnalyticsPage;
