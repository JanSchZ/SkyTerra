import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const SectionCard = styled(Paper)(({ theme }) => ({
  borderRadius: 18,
  border: '1px solid rgba(0,0,0,0.08)',
  background: '#ffffff',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%',
  minWidth: 0,
}));

const AdminSettingsPage = () => {
  const [platformName, setPlatformName] = useState('SkyTerra');
  const [contactEmail, setContactEmail] = useState('contacto@skyterra.dev');
  const [allowProVendors, setAllowProVendors] = useState(true);
  const [allowHomeOwners, setAllowHomeOwners] = useState(true);
  const [notifyNewSignups, setNotifyNewSignups] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [notifyTickets, setNotifyTickets] = useState(true);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const handleCloseFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  const handleSubmit = async () => {
    setSaving(true);
    setFeedback({ open: false, message: '', severity: 'success' });
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setFeedback({ open: true, message: 'Cambios guardados correctamente.', severity: 'success' });
    } catch (error) {
      console.error('Error saving settings', error);
      setFeedback({ open: true, message: 'No se pudieron guardar los cambios. Intenta nuevamente.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>
            Ajustes de la Plataforma
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Actualiza la información de contacto, disponibilidad de planes y configuración de notificaciones.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SectionCard>
              <Typography variant="h6">General</Typography>
              <TextField
                fullWidth
                label="Nombre de la Plataforma"
                value={platformName}
                onChange={(event) => setPlatformName(event.target.value)}
                autoComplete="off"
              />
              <TextField
                fullWidth
                label="Email de contacto principal"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                autoComplete="off"
              />
            </SectionCard>
            <SectionCard>
              <Typography variant="h6">Planes y suscripciones</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowProVendors}
                    onChange={(event) => setAllowProVendors(event.target.checked)}
                  />
                }
                label="Permitir registro de nuevos Vendedores Profesionales"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={allowHomeOwners}
                    onChange={(event) => setAllowHomeOwners(event.target.checked)}
                  />
                }
                label="Permitir registro de nuevos Dueños Particulares"
              />
            </SectionCard>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SectionCard>
              <Typography variant="h6">Notificaciones</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyNewSignups}
                    onChange={(event) => setNotifyNewSignups(event.target.checked)}
                  />
                }
                label="Notificar por email sobre nuevos registros"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={dailyDigest}
                    onChange={(event) => setDailyDigest(event.target.checked)}
                  />
                }
                label="Enviar resumen diario de actividad"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyTickets}
                    onChange={(event) => setNotifyTickets(event.target.checked)}
                  />
                }
                label="Notificar sobre nuevos tickets de soporte"
              />
              <Alert icon={false} severity="info" sx={{ mt: 1 }}>
                Estas notificaciones se envían al equipo operativo y a los usuarios configurados como administradores.
              </Alert>
            </SectionCard>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={handleCloseFeedback}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminSettingsPage;
