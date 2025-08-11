import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, CircularProgress, Switch } from '@mui/material';
import { api } from '../../services/api';
import { aiService } from '../../services/aiService'; // Ajusta la ruta si es necesario

const AIModelManager = () => {
  const [models, setModels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await aiService.getModels();
        // API returns a plain list from /api/ai/models/
        setModels(Array.isArray(data) ? data : (data.models || [])); 
      } catch (error) {
        console.error('Error fetching AI models:', error);
        setError('No se pudieron cargar los modelos de IA.');
      }
      setIsLoading(false);
    };

    const fetchLogs = async () => {
      try {
        const data = await aiService.getLogs();
        // API returns a plain list from /api/ai/logs/
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      } catch (error) {
        console.error('Error fetching AI logs:', error);
        setError('No se pudieron cargar los logs de IA.');
      }
      setIsLoading(false);
    };

    fetchModels();
    fetchLogs();
  }, []);

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
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Gestionar Modelos de IA</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
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
              <TableRow key={model.id}>
                <TableCell>{model.name}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={model.price_per_1k_tokens_input}
                    onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_input')}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={model.price_per_1k_tokens_output}
                    onChange={(e) => handleInputChange(e, model.id, 'price_per_1k_tokens_output')}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    multiline
                    rows={4}
                    value={model.system_prompt}
                    onChange={(e) => handleInputChange(e, model.id, 'system_prompt')}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={model.is_active}
                    onChange={(e) => handleUpdate(model.id, { is_active: e.target.checked })}
                  />
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleUpdate(model.id, model)}>Guardar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h4" sx={{ mb: 2, mt: 4 }}>Logs de IA</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Entrada</TableCell>
              <TableCell>Salida</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
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
