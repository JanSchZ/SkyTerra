import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Stack,
  Button,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Skeleton,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import paymentsService from '../../services/paymentsService';
import marketplaceService from '../../services/marketplaceService';

const SubscriptionManagementPage = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [subData, plansData] = await Promise.all([
          paymentsService.getMySubscription(),
          marketplaceService.fetchPlans(),
        ]);
        setSubscriptionData(subData);
        setAvailablePlans(plansData || []);
      } catch (err) {
        console.error('Error loading subscription data', err);
        setError('No pudimos cargar la información de tu suscripción. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const currentPlan = useMemo(() => {
    return subscriptionData?.active_plan || user?.active_plan;
  }, [subscriptionData, user]);

  const subscription = useMemo(() => {
    return subscriptionData?.subscription || user?.subscription;
  }, [subscriptionData, user]);

  const hasActiveSubscription = useMemo(() => {
    return subscriptionData?.has_active_subscription || (user?.subscription?.is_active && user?.active_plan);
  }, [subscriptionData, user]);

  const renderSubscriptionDetails = () => {
    if (!hasActiveSubscription) {
      return (
        <Alert severity="info" sx={{ mb: 3 }}>
          No tienes una suscripción activa. Selecciona un plan para comenzar.
        </Alert>
      );
    }

    const statusColor = {
      active: 'success',
      trialing: 'info',
      past_due: 'warning',
      canceled: 'error',
      unpaid: 'error',
    }[subscription?.status] || 'default';

    const statusLabel = {
      active: 'Activo',
      trialing: 'Período de prueba',
      past_due: 'Pago pendiente',
      canceled: 'Cancelado',
      unpaid: 'Sin pagar',
    }[subscription?.status] || subscription?.status;

    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {currentPlan?.name || 'Plan Actual'}
            </Typography>
            <Chip label={statusLabel} color={statusColor} />
          </Stack>

          {currentPlan?.description && (
            <Typography variant="body2" color="text.secondary">
              {currentPlan.description}
            </Typography>
          )}

          <Divider />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Precio
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {currentPlan?.price ? `${currentPlan.price} UF` : 'N/A'}
              </Typography>
            </Grid>

            {subscription?.current_period_end && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Siguiente renovación
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {new Date(subscription.current_period_end).toLocaleDateString('es-CL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
                {subscription?.days_until_renewal !== null && subscription.days_until_renewal >= 0 && (
                  <Typography variant="body2" color="text.secondary">
                    En {subscription.days_until_renewal} día{subscription.days_until_renewal !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>
        </Stack>
      </Paper>
    );
  };

  const renderAvailablePlans = () => {
    if (!availablePlans.length) return null;

    const currentPlanKey = currentPlan?.key;
    const otherPlans = availablePlans.filter((plan) => plan.key !== currentPlanKey);

    if (!otherPlans.length) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Ya tienes el mejor plan disponible. ¡Gracias por tu confianza!
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {otherPlans.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {plan.name}
                </Typography>
                {plan.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {plan.description}
                  </Typography>
                )}
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                  {plan.price} UF
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() =>
                    navigate('/pricing', {
                      state: {
                        from: 'subscription-management',
                        highlightPlan: plan.key,
                      },
                    })
                  }
                >
                  Cambiar a este plan
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="lg">
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
          <Skeleton variant="rectangular" height={400} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Volver" sx={{ color: 'text.primary' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Mi Suscripción
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Gestiona tu plan actual y explora opciones de upgrade para desbloquear más beneficios.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderSubscriptionDetails()}

        {hasActiveSubscription && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
              Otros planes disponibles
            </Typography>
            {renderAvailablePlans()}
          </>
        )}

        {!hasActiveSubscription && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button variant="contained" size="large" onClick={() => navigate('/pricing')}>
              Ver planes disponibles
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default SubscriptionManagementPage;

