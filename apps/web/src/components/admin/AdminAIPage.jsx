import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Select, MenuItem, TextField, Button, Grid, CircularProgress } from '@mui/material';
import { api } from '../../services/api'; // Assuming you have an api service

const AdminAIPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for now
  const stats = {
    tokens_used_month: '1,234,567',
    queries_this_month: '8,910',
    average_response_time: '1.2s',
    error_rate: '0.5%',
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Replace with your actual API endpoint to fetch models
        // const response = await api.get('/ai/models');
        // setModels(response.data);
        
        // Using mock data for now
        const mockModels = [
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
          { id: 'claude-3-opus', name: 'Claude 3 Opus' },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        ];
        setModels(mockModels);

      } catch (err) {
        setError('Failed to fetch AI models.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Paper sx={{ p: 3, m: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
      <Typography variant="h4" gutterBottom>
        Gestión de IA (Sam)
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Configuración del Modelo</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Habilitar IA (Sam)"
            />
            <div>
              <Typography variant="subtitle1" gutterBottom>Modelo Principal</Typography>
              <Select defaultValue={models.length > 0 ? models[0].id : ''} fullWidth>
                {Array.isArray(models) && models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>
                ))}
              </Select>
            </div>
            <div>
              <Typography variant="subtitle1" gutterBottom>Tamaño del Contexto (tokens)</Typography>
              <TextField
                type="number"
                defaultValue={8000}
                fullWidth
              />
            </div>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Estadísticas de Uso (Mensual)</Typography>
          <Box sx={{ mt: 2 }}>
            <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <Typography>Tokens usados: {stats.tokens_used_month}</Typography>
              <Typography>Consultas realizadas: {stats.queries_this_month}</Typography>
              <Typography>Tiempo de respuesta promedio: {stats.average_response_time}</Typography>
              <Typography>Tasa de error: {stats.error_rate}</Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary">
          Guardar Cambios
        </Button>
      </Box>
    </Paper>
  );
};

export default AdminAIPage;
