import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Alert, Divider, CircularProgress, IconButton, Tooltip, Button, ButtonGroup } from '@mui/material';
import { Psychology as SamIcon, Analytics as AnalyticsIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api, authService } from '../../services/api';

const SamAdminPage = () => {
  // Only analytics state
  const [usageStats, setUsageStats] = useState(null);
  const [daysRange, setDaysRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      try { await authService.ensureCsrfCookie?.(); } catch (error) { void error; }
      await Promise.all([loadUsageStats()]);
    } catch (err) {
      setError('Error cargando datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Removed config/models logic per new spec

  const loadUsageStats = async (range = daysRange) => {
    try {
      const response = await api.get('/ai/logs/usage_stats/', { params: { days: range } });
      const data = response.data;
      setUsageStats(data);
    } catch (err) {
      console.error('Error loading usage stats:', err);
      throw err;
    }
  };

  const changeRange = async (newRange) => {
    if (newRange === daysRange) return;
    setDaysRange(newRange);
    setLoading(true);
    try {
      await loadUsageStats(newRange);
    } finally {
      setLoading(false);
    }
  };

  // All icon/config/model handlers removed

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  const COLORS = ['#6a11cb', '#2575fc'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <SamIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Administración de Sam
        </Typography>
        <Box ml="auto" display="flex" alignItems="center" gap={1}>
          <ButtonGroup size="small" aria-label="days range selector">
            <Button variant={daysRange === 7 ? 'contained' : 'outlined'} onClick={() => changeRange(7)}>7d</Button>
            <Button variant={daysRange === 30 ? 'contained' : 'outlined'} onClick={() => changeRange(30)}>30d</Button>
            <Button variant={daysRange === 90 ? 'contained' : 'outlined'} onClick={() => changeRange(90)}>90d</Button>
          </ButtonGroup>
          <Tooltip title="Actualizar datos">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Tarjetas de métricas */}
        {usageStats && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AnalyticsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Estadísticas de uso (últimos {usageStats.period_days} días)</Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{
                        background: 'linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {usageStats.total_requests.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Requests
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{
                        background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {usageStats.total_tokens_input.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tokens de Entrada
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{
                        background: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        {usageStats.total_tokens_output.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tokens de Salida
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{
                        background: 'linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        ${usageStats.total_cost.toFixed(4)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Costo Total
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Serie diaria */}
                {usageStats.daily && usageStats.daily.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Tráfico diario
                    </Typography>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={usageStats.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="request_count" stroke={COLORS[1]} strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="total_tokens_output" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Uso por modelo */}
                {usageStats.usage_by_model && usageStats.usage_by_model.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Uso por Modelo
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={usageStats.usage_by_model}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="model_used__name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="request_count" fill="#6a11cb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SamAdminPage;