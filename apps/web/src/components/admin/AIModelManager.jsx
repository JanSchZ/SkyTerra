import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, CircularProgress, Switch } from '@mui/material';
import { api } from '../../services/api';
import { aiService } from '../../services/aiService'; // Ajusta la ruta si es necesario
import { glassCard } from './adminV2Theme';

const AIModelManager = () => {
  const [models, setModels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Deshabilitado fetch automático para evitar bucles 401 si no hay sesión de staff
  useEffect(() => {
    // No-op on mount. Usa botones explícitos para cargar si corresponde.
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const data = await aiService.getModels();
      setModels(Array.isArray(data) ? data : (data.models || []));
    } catch (error) {
      console.error('Error fetching AI models:', error);
      setError('No se pudieron cargar los modelos de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await aiService.getLogs();
      setLogs(Array.isArray(data) ? data : (data.logs || []));
    } catch (error) {
      console.error('Error fetching AI logs:', error);
      setError('No se pudieron cargar los logs de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (modelId, modelPayload) => {
    try {
      await api.put(`/ai/models/${modelId}/`, modelPayload || models.find(m => m.id === modelId));
    } catch (e) {
      console.error('Error updating model:', e);
    }
  };

  const handleInputChange = (e, modelId, field) => {
    const newModels = models.map(m => {
      if (m.id === modelId) {
        return { ...m, [field]: e.target.value };
      }
      return m;
    });
    setModels(newModels);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ color: '#f8fbff' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Gestión de Modelos de IA</Typography>
      <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
        Ejecuta cargas manuales mientras definimos la integración automática.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Button variant="contained" color="primary" onClick={fetchModels} sx={{ borderRadius: 999 }}>
          Cargar Modelos
        </Button>
        <Button variant="outlined" color="inherit" onClick={fetchLogs} sx={{ borderRadius: 999, borderColor: 'rgba(248,251,255,0.4)', color: '#f8fbff' }}>
          Cargar Logs
        </Button>
      </Box>
      {error && <Typography color="#ff9a9e" sx={{ mb: 2 }}>{error}</Typography>}
      <TableContainer component={Box} sx={{ ...glassCard({ px: 0, py: 0 }) }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { color: 'rgba(248,251,255,0.72)', fontWeight: 600 } }}>
              <TableCell>Modelo</TableCell>
              <TableCell>Precio Entrada (x1k tokens)</TableCell>
              <TableCell>Precio Salida (x1k tokens)</TableCell>
              <TableCell>Prompt del Sistema</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id} sx={{ '& td': { borderColor: 'rgba(248,251,255,0.08)', color: '#f8fbff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{model.name}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={model.price_per_1k_tokens_input}
                    onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_input')}
                    sx={{
                      width: 120,
                      '& input': { color: '#f8fbff' },
                      '& fieldset': { borderColor: 'rgba(248,251,255,0.2)' },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={model.price_per_1k_tokens_output}
                    onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_output')}
                    sx={{
                      width: 120,
                      '& input': { color: '#f8fbff' },
                      '& fieldset': { borderColor: 'rgba(248,251,255,0.2)' },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    multiline
                    rows={3}
                    value={model.system_prompt}
                    onChange={(e) => handleInputChange(e, model.id, 'system_prompt')}
                    fullWidth
                    sx={{
                      '& textarea': { color: '#f8fbff' },
                      '& fieldset': { borderColor: 'rgba(248,251,255,0.2)' },
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={model.is_active}
                    onChange={(e) => handleUpdate(model.id, { is_active: e.target.checked })}
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" color="inherit" onClick={() => handleUpdate(model.id, model)} sx={{ borderRadius: 999, borderColor: 'rgba(248,251,255,0.4)', color: '#f8fbff' }}>
                    Guardar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 600 }}>Logs de IA</Typography>
      <TableContainer component={Box} sx={{ ...glassCard({ px: 0, py: 0 }) }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { color: 'rgba(248,251,255,0.72)', fontWeight: 600 } }}>
              <TableCell>Fecha</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Entrada</TableCell>
              <TableCell>Salida</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} sx={{ '& td': { borderColor: 'rgba(248,251,255,0.08)', color: '#f8fbff' } }}>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell>{log.modelName}</TableCell>
                <TableCell>{log.input}</TableCell>
                <TableCell>{log.output}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AIModelManager;
