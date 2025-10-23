import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Stack,
  Divider,
  Chip,
  IconButton,
  Skeleton,
  Alert,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService.js';
import StatusBar from '../seller/StatusBar.jsx';
import WorkflowTimeline from '../ui/WorkflowTimeline.jsx';

const SellerDashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, refreshing: false, properties: [], plans: [] });
  const goToPricing = useCallback(
    (extraState = {}) => {
      const primaryPropertyId = state.properties?.[0]?.id ?? null;
      const { from = 'seller-dashboard', listingId = primaryPropertyId, ...rest } = extraState || {};
      navigate('/pricing', {
        state: {
          from,
          listingId,
          ...rest,
        },
      });
    },
    [navigate, state.properties]
  );

  const currentPlanName = useMemo(() => {
    if (state.properties.length) {
      const firstPlan = state.properties[0]?.plan_details?.name;
      if (firstPlan) return firstPlan;
    }
    if (state.plans.length && user?.groups?.length) {
      return state.plans.find((plan) => plan.key === user.groups[0])?.name || user.groups[0];
    }
    return user?.groups?.[0] || 'Sin plan activo';
  }, [state.properties, state.plans, user]);

  const loadData = async (refreshOnly = false) => {
    setState((prev) => ({ ...prev, loading: refreshOnly ? prev.loading : true, refreshing: refreshOnly }));
    try {
      const [plansResponse, propertiesResponse] = await Promise.all([
        marketplaceService.fetchPlans(),
        marketplaceService.listMyProperties(),
      ]);
      setState({
        loading: false,
        refreshing: false,
        plans: plansResponse,
        properties: propertiesResponse.items,
      });
    } catch (error) {
      console.error('Error loading seller dashboard', error);
      setState((prev) => ({ ...prev, loading: false, refreshing: false }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderProperties = () => {
    if (state.loading) {
      return (
        <Stack spacing={2}>
          {[1, 2].map((item) => (
            <Paper key={item} variant="outlined" sx={{ p: 3 }}>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="rectangular" height={90} sx={{ mt: 2, borderRadius: 2 }} />
            </Paper>
          ))}
        </Stack>
      );
    }

    if (!state.properties.length) {
      return (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6">Aún no tienes publicaciones</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Crea tu primera publicación para coordinar el vuelo y activar la propiedad en el marketplace.
          </Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/seller/listings/new')}>
            Crear publicación
          </Button>
        </Paper>
      );
    }

    return (
      <Stack spacing={2}>
        {state.properties.map((property) => (
          <Paper key={property.id} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h6">{property.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {property.type || 'Tipo no especificado'} · {property.size ? `${property.size} ha` : 'Tamaño por confirmar'}
                </Typography>
                {property.plan_details?.name && (
                  <Chip label={property.plan_details.name} size="small" sx={{ mt: 1 }} />
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => navigate(`/seller/listings/${property.id}`)}
                >
                  Abrir flujo
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <StatusBar status={property.status_bar} />
            <WorkflowTimeline timeline={property.workflow_timeline} dense />
            {(property.workflow_alerts || []).map((alert, index) => (
              <Alert
                key={`${property.id}-alert-${index}`}
                severity={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                sx={{ mt: 2 }}
              >
                {alert.message}
              </Alert>
            ))}
          </Paper>
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 5 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Panel de vendedor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestiona tus publicaciones, revisa el progreso operativo y mantente al tanto de cada etapa.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={() => loadData(true)} disabled={state.refreshing}>
                <RefreshIcon />
              </IconButton>
              <Button variant="contained" onClick={() => navigate('/seller/listings/new')}>
                Nueva publicación
              </Button>
            </Stack>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Plan activo
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {currentPlanName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Actualiza tu plan para acceder a entregables adicionales, tiempos de entrega priorizados y coordinación preferente.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => goToPricing()}>
                Ver planes
              </Button>
            </Stack>
          </Paper>

          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Tus publicaciones
            </Typography>
            {renderProperties()}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default SellerDashboardPage;
