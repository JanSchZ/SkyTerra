import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Switch, Alert, Box } from '@mui/material';
import { savedSearchService } from '../../services/api';

const SaveSearchDialog = ({ open, onClose, defaultFilters, defaultName }) => {
  const [name, setName] = useState(defaultName || 'Mi búsqueda');
  const [emailAlert, setEmailAlert] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (defaultName) setName(defaultName);
    }
  }, [open, defaultName]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: name && name.trim() ? name.trim() : 'Búsqueda',
        filters: defaultFilters || {},
        email_alert: emailAlert,
      };
      await savedSearchService.create(payload);
      if (onClose) onClose(true);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'No se pudo guardar la búsqueda.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose && onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Guardar búsqueda</DialogTitle>
      <DialogContent>
        {error && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        <TextField
          fullWidth
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
        />
        <FormControlLabel
          control={<Switch checked={emailAlert} onChange={(e) => setEmailAlert(e.target.checked)} />}
          label="Recibir alertas por email cuando haya nuevas coincidencias"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose(false)} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveSearchDialog;


