import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Container, CircularProgress, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useLocation, useNavigate } from 'react-router-dom';
import CelebrationIcon from '@mui/icons-material/Celebration';
import paymentsService from '../../services/paymentsService';
import { authService } from '../../services/api';

const PENDING_PLAN_STORAGE_KEY = 'skyterra.pendingPlan';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const [activationDetails, setActivationDetails] = useState(null);

  useEffect(() => {
    let activation = location.state?.planActivation || null;
    if (!activation) {
      const stored = localStorage.getItem(PENDING_PLAN_STORAGE_KEY);
      if (stored) {
        try {
          activation = JSON.parse(stored);
        } catch (err) {
          console.warn('No se pudo leer la activación pendiente. Limpiando estado.', err);
          localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
        }
      }
    }

    if (!activation) {
      setStatus('idle');
      return;
    }

    const sessionId = new URLSearchParams(location.search).get('session_id');
    const payload = {
      ...activation,
      sessionId,
    };
    setActivationDetails(payload);

    const confirmActivation = async () => {
      try {
        await paymentsService.activatePlan(payload);
        try {
          await authService.getCurrentUser();
        } catch (refreshError) {
          console.warn('No se pudo refrescar el usuario después de activar el plan.', refreshError);
        }
        localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
        setStatus('success');
      } catch (err) {
        console.error('Error confirming plan activation', err);
        const message = err?.response?.data?.error || err?.message || 'No pudimos confirmar la activación del plan.';
        setError(message);
        setStatus('error');
      }
    };

    confirmActivation();
  }, [location]);

  const renderContent = () => {
    if (status === 'processing') {
      return (
        <>
          <CircularProgress sx={{ mb: 3 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Confirmando activación del plan…
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Espera unos segundos mientras sincronizamos tu suscripción.
          </Typography>
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Si el cargo se realizó correctamente, contáctanos para ayudarte a habilitar el plan en tu cuenta.
          </Typography>
        </>
      );
    }

    const planName = activationDetails?.planTitle || 'Plan SkyTerra';
    const isSuccess = status === 'success';

    return (
      <>
        <CheckCircleOutlineIcon sx={{ fontSize: 60, color: isSuccess ? 'success.main' : 'primary.main', mb: 1 }} />
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
          {isSuccess ? '¡Plan activado!' : 'Pago registrado'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {isSuccess
            ? `${planName} ya está disponible en tu panel. Estamos listos para publicar tu siguiente terreno.`
            : 'Tu pago fue recibido. Actualizaremos tu plan en breve; si no ves los cambios, contáctanos.'}
        </Typography>
      </>
    );
  };

  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          {status === 'success' && <CelebrationIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />}
          {renderContent()}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => navigate('/dashboard')} disabled={status === 'processing'}>
              Ir al Dashboard
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')} disabled={status === 'processing'}>
              Volver al mapa
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PaymentSuccess;
