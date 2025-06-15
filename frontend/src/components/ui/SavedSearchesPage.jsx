import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, IconButton, CircularProgress, Alert, Switch } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { savedSearchService } from '../../services/api';

export default function SavedSearchesPage() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await savedSearchService.getAll();
      setSaved(data.results || data);
      setError(null);
    } catch (e) {
      console.error('Error loading saved searches', e);
      setError('Error cargando búsquedas guardadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  const toggleEmailAlert = async (search) => {
    try {
      await savedSearchService.update(search.id, { email_alert: !search.email_alert });
      load();
    } catch (e) {
      console.error('Error toggling alert', e);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta búsqueda guardada?')) return;
    try {
      await savedSearchService.delete(id);
      setSaved(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Error deleting saved search', e);
    }
  };

  if (loading) {
    return <Box sx={{ p:4, textAlign:'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Búsquedas Guardadas</Typography>
      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
      {saved.length === 0 ? (
        <Typography variant="body2">Aún no tienes búsquedas guardadas.</Typography>
      ) : (
        <Paper variant="glass" sx={{ p:2 }}>
          <List>
            {saved.map((s)=> (
              <ListItem key={s.id} secondaryAction={
                <>
                  <Switch edge="end" checked={s.email_alert} onChange={()=>toggleEmailAlert(s)} inputProps={{ 'aria-label': 'alert toggle' }} />
                  <IconButton edge="end" color="error" onClick={()=>remove(s.id)}><DeleteIcon /></IconButton>
                </>
              }>
                <ListItemText primary={s.name} secondary={`Filtros: ${JSON.stringify(s.filters)}`} />
              </ListItem>
            ))}
          </List>
          <Typography variant="caption" color="text.secondary">Interruptor: activar/desactivar alertas por email</Typography>
        </Paper>
      )}
    </Box>
  );
} 