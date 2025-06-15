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
    <Paper sx={{ p: 3, backgroundColor: (theme) => theme.palette.background.paper, color: (theme) => theme.palette.text.primary, borderRadius: '12px' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
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
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
            />
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

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
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
            />
            <TextField
              fullWidth
              label="Teléfono de Contacto"
              name="contactPhone"
              value={settings.contactPhone}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
            />
            <TextField
              fullWidth
              label="Dirección Física"
              name="contactAddress"
              value={settings.contactAddress}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2, input: { color: '#E5E8F0' }, label: { color: '#8faacc' },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
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
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
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
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
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
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'lightgrey' }, '&:hover fieldset': { borderColor: 'grey' } } }}
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained">
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