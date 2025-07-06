import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Psychology as SamIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Memory as ModelIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const SamAdminPage = () => {
  const [samConfig, setSamConfig] = useState(null);
  const [models, setModels] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customIcon, setCustomIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSamConfig(),
        loadModels(),
        loadUsageStats()
      ]);
    } catch (err) {
      setError('Error cargando datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSamConfig = async () => {
    try {
      const response = await fetch('/api/ai/sam/current_config/');
      if (response.ok) {
        const data = await response.json();
        setSamConfig(data);
      } else {
        throw new Error('Error cargando configuración de Sam');
      }
    } catch (err) {
      console.error('Error loading Sam config:', err);
      throw err;
    }
  };

  const loadModels = async () => {
    try {
      const response = await fetch('/api/ai/models/');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      } else {
        throw new Error('Error cargando modelos');
      }
    } catch (err) {
      console.error('Error loading models:', err);
      throw err;
    }
  };

  const loadUsageStats = async () => {
    try {
      const response = await fetch('/api/ai/logs/usage_stats/?days=30');
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      } else {
        throw new Error('Error cargando estadísticas de uso');
      }
    } catch (err) {
      console.error('Error loading usage stats:', err);
      throw err;
    }
  };

  const populateDefaultModels = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/ai/models/populate_defaults/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message);
        await loadModels();
      } else {
        throw new Error('Error poblando modelos por defecto');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSamConfig = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/ai/sam/update_config/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samConfig)
      });
      
      if (response.ok) {
        const updatedConfig = await response.json();
        setSamConfig(updatedConfig);
        setSuccess('Configuración de Sam guardada exitosamente');
      } else {
        throw new Error('Error guardando configuración');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setSamConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIconUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setCustomIcon(file);
      const reader = new FileReader();
      reader.onload = (e) => setIconPreview(e.target.result);
      reader.readAsDataURL(file);
      setIconDialogOpen(true);
    } else {
      setError('Por favor selecciona un archivo de imagen PNG válido');
    }
  };

  const saveCustomIcon = async () => {
    if (!customIcon) return;
    
    try {
      const formData = new FormData();
      formData.append('sam_icon', customIcon);
      
      const response = await fetch('/api/ai/sam/upload_icon/', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setSuccess('Ícono de Sam actualizado exitosamente');
        setIconDialogOpen(false);
        setCustomIcon(null);
        setIconPreview(null);
      } else {
        throw new Error('Error subiendo ícono');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <SamIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Administración de Sam
        </Typography>
        <Box ml="auto">
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
        {/* Sam Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Configuración de Sam</Typography>
              </Box>

              {samConfig && (
                <Box space={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={samConfig.is_enabled || false}
                        onChange={(e) => handleConfigChange('is_enabled', e.target.checked)}
                      />
                    }
                    label="Habilitar Sam"
                    sx={{ mb: 2 }}
                  />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Modelo Actual</InputLabel>
                    <Select
                      value={samConfig.current_model || ''}
                      onChange={(e) => handleConfigChange('current_model', e.target.value)}
                    >
                      {models.filter(model => model.is_active).map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                            <span>{model.display_name}</span>
                            {model.supports_thinking && (
                              <Chip label="Thinking" size="small" color="primary" />
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Instrucciones Personalizadas"
                    value={samConfig.custom_instructions || ''}
                    onChange={(e) => handleConfigChange('custom_instructions', e.target.value)}
                    placeholder="Escribe las instrucciones personalizadas para Sam..."
                    sx={{ mb: 2 }}
                  />

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Historial Máximo"
                        value={samConfig.max_conversation_history || 10}
                        onChange={(e) => handleConfigChange('max_conversation_history', parseInt(e.target.value))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Temperatura"
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                        value={samConfig.response_temperature || 0.7}
                        onChange={(e) => handleConfigChange('response_temperature', parseFloat(e.target.value))}
                      />
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={saveSamConfig}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Custom Icon Upload */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                  <SamIcon />
                </Avatar>
                <Typography variant="h6">Ícono Personalizado</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sube un archivo PNG para personalizar el ícono de Sam que aparece en la interfaz.
              </Typography>

              <input
                accept="image/png,image/jpeg,image/jpg"
                style={{ display: 'none' }}
                id="sam-icon-upload"
                type="file"
                onChange={handleIconUpload}
              />
              <label htmlFor="sam-icon-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<UploadIcon />}
                >
                  Subir Ícono PNG
                </Button>
              </label>

              <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                Recomendado: 64x64px o 128x128px, formato PNG
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Statistics */}
        {usageStats && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AnalyticsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Estadísticas de Uso (últimos 30 días)</Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary.main">
                        {usageStats.total_requests.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Requests
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">
                        {usageStats.total_tokens_input.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tokens de Entrada
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">
                        {usageStats.total_tokens_output.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tokens de Salida
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="error.main">
                        ${usageStats.total_cost.toFixed(4)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Costo Total
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Usage by Model Chart */}
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
                        <Bar dataKey="request_count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Models Management */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <ModelIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Modelos de IA</Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={populateDefaultModels}
                  disabled={saving}
                  startIcon={<RefreshIcon />}
                >
                  Poblar Modelos por Defecto
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Thinking</TableCell>
                      <TableCell>Precio Input</TableCell>
                      <TableCell>Precio Output</TableCell>
                      <TableCell>Max Tokens</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2">
                              {model.display_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={model.is_active ? 'Activo' : 'Inactivo'}
                            color={model.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {model.supports_thinking ? (
                            <Chip label="Sí" color="primary" size="small" />
                          ) : (
                            <Chip label="No" color="default" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          ${model.price_per_1k_tokens_input}/1k
                        </TableCell>
                        <TableCell>
                          ${model.price_per_1k_tokens_output}/1k
                        </TableCell>
                        <TableCell>
                          {model.max_tokens.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Icon Upload Dialog */}
      <Dialog open={iconDialogOpen} onClose={() => setIconDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir Ícono Personalizado para Sam</DialogTitle>
        <DialogContent>
          {iconPreview && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <img
                src={iconPreview}
                alt="Preview"
                style={{ maxWidth: 128, maxHeight: 128, borderRadius: 8 }}
              />
              <Typography variant="body2" color="text.secondary">
                Vista previa del ícono
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIconDialogOpen(false)}>Cancelar</Button>
          <Button onClick={saveCustomIcon} variant="contained" disabled={!customIcon}>
            Guardar Ícono
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SamAdminPage;