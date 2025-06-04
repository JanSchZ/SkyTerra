import React, { useState } from 'react';
import { Typography, Paper, Grid, TextField, Button, Divider, Box } from '@mui/material';

const AdminSettingsPage = () => {
  // Local state for settings (to be replaced with backend integration)
  const [settings, setSettings] = useState({
    platformName: 'SkyTerra',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    adminNotificationEmail: '',
    terms: '',
    privacy: '',
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    // Aquí se conectará con el backend cuando haya endpoint
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: '#182534', color: '#E5E8F0', borderRadius: '12px' }}>
      <Typography variant="h4" sx={{ color: '#E5E8F0', fontFamily: 'Code Pro, sans-serif', mb: 3 }}>
        Configuración de la Plataforma
      </Typography>
      <form onSubmit={handleSave}>
        <Grid container spacing={4}>
          {/* Sección: Datos de la Plataforma */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ color: '#8faacc', mb: 1, fontFamily: 'Clear Sans, sans-serif' }}>
              Datos de la Plataforma
            </Typography>
            <TextField
              fullWidth
              label="Nombre de la Plataforma"
              name="platformName"
              value={settings.platformName}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
          </Grid>

          <Grid item xs={12}><Divider sx={{ background: '#223449' }} /></Grid>

          {/* Sección: Datos de Contacto */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#8faacc', mb: 1, fontFamily: 'Clear Sans, sans-serif' }}>
              Datos de Contacto
            </Typography>
            <TextField
              fullWidth
              label="Email de Contacto"
              name="contactEmail"
              value={settings.contactEmail}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
            <TextField
              fullWidth
              label="Teléfono de Contacto"
              name="contactPhone"
              value={settings.contactPhone}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
            <TextField
              fullWidth
              label="Dirección Física"
              name="contactAddress"
              value={settings.contactAddress}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
          </Grid>

          {/* Sección: Notificaciones Administrativas */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#8faacc', mb: 1, fontFamily: 'Clear Sans, sans-serif' }}>
              Notificaciones Administrativas
            </Typography>
            <TextField
              fullWidth
              label="Email para Notificaciones"
              name="adminNotificationEmail"
              value={settings.adminNotificationEmail}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
          </Grid>

          {/* Sección: Textos Legales */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ color: '#8faacc', mb: 1, fontFamily: 'Clear Sans, sans-serif' }}>
              Textos Legales
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Términos y Condiciones"
              name="terms"
              value={settings.terms}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, textarea: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Política de Privacidad"
              name="privacy"
              value={settings.privacy}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, textarea: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#8faacc' }, '&:hover fieldset': { borderColor: '#E5E8F0' } } }}
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" sx={{ backgroundColor: '#8faacc', color: '#101923', '&:hover': { backgroundColor: '#E5E8F0' } }}>
              Guardar Cambios
            </Button>
          </Grid>
          {saved && (
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ color: '#8faacc', mt: 2 }}>
                Cambios guardados localmente (falta integración con backend).
              </Typography>
            </Grid>
          )}
        </Grid>
      </form>
    </Paper>
  );
};

export default AdminSettingsPage; 