import React from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useLocation, useNavigate } from 'react-router-dom';
import PricingCard from './PricingCard';
import PlanDetailDialog from './PlanDetailDialog';
import marketplaceService from '../../services/marketplaceService';

const UF_FORMAT = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const PROPERTY_TYPES = [
  { key: 'basic', label: 'Publicación Básica', unitPrice: 1.5, description: 'Cobertura esencial: fotos aéreas y ficha optimizada.' },
  { key: 'advanced', label: 'Publicación Avanzada', unitPrice: 3, description: 'Video 4K y storytelling listo para redes sociales.' },
  { key: 'pro', label: 'Publicación Pro', unitPrice: 9, description: 'Asset kit completo para campañas, brokers y presentaciones.' },
];

const computeRanges = ({ maxListings, discountMultiplier = 1, platformFee = 0 }) => {
  if (!maxListings) return null;
  const baseMin = PROPERTY_TYPES[0].unitPrice * maxListings;
  const baseMax = PROPERTY_TYPES[PROPERTY_TYPES.length - 1].unitPrice * maxListings;

  return {
    original: {
      min: baseMin + platformFee,
      max: baseMax + platformFee,
    },
    discounted: {
      min: baseMin * discountMultiplier + platformFee,
      max: baseMax * discountMultiplier + platformFee,
    },
  };
};

const mapPlansWithRange = (plans) =>
  plans.map((plan) => {
    if (!plan.maxListings) return plan;
    const ranges = computeRanges(plan);
    return { ...plan, ranges };
  });

const particularPlans = [
  {
    id: 'basic',
    tier: 'particular',
    title: 'Básico',
    priceLabel: '1.5 UF',
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_BASIC || null,
    features: [
      'Tour 360 + 2 vistas aéreas',
      'Publicación destacada en SkyTerra',
      'Seguimiento de leads por correo',
    ],
    audience: 'Dueños particulares que dan su primer paso digital.',
    summary: 'Contenido esencial para validar el terreno y compartirlo con tu red.',
    story: 'Incluye producción aérea básica y ficha optimizada para captar los primeros interesados.',
  },
  {
    id: 'advanced',
    tier: 'particular',
    title: 'Avanzado',
    priceLabel: '3 UF',
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ADVANCED || null,
    features: [
      'Tour virtual con 5 vistas aéreas',
      'Video aéreo 4K editado',
      'Destacado premium dentro del marketplace',
    ],
    isFeatured: true,
    audience: 'Dueños que buscan acelerar la venta con storytelling completo.',
    summary: 'Mejor posicionamiento en SkyTerra y contenido listo para redes sociales.',
    story: 'Creamos un video highlight y guiamos la promoción para captar visitas calificadas.',
  },
  {
    id: 'pro',
    tier: 'particular',
    title: 'Pro',
    priceLabel: '9 UF',
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PRO || null,
    features: [
      '7 vistas aéreas + 10 terrestres',
      'Pack de contenido para marketing digital',
      'Remarketing y newsletter a la comunidad SkyTerra',
    ],
    audience: 'Propietarios con terrenos premium o proyectos estratégicos.',
    summary: 'Cobertura total del terreno y distribución omnicanal.',
    story: 'Recibes un asset kit completo listo para campañas, brokers y presentaciones.',
  },
];

const professionalPlans = [
  {
    id: 'start',
    tier: 'professional',
    title: 'Start',
    maxListings: 3,
    platformFee: 0.5,
    discountMultiplier: 1,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_START || null,
    features: [
      'Hasta 3 terrenos activos',
      'Ficha y métricas centralizadas',
      'Seguimiento simple de clientes y tours',
    ],
    audience: 'Brokers independientes o micro oficinas que digitalizan su cartera.',
    summary: 'Plan flexible para comenzar a escalar tus publicaciones con contenido profesional.',
    story: 'Crea fichas completas y comparte el material con inversionistas desde un único panel.',
  },
  {
    id: 'growth',
    tier: 'professional',
    title: 'Growth',
    maxListings: 10,
    platformFee: 1,
    discountMultiplier: 0.8,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH || null,
    features: [
      'Hasta 10 terrenos activos',
      'Pricing comparativo inteligente',
      'Integración con CRM y equipo colaborativo',
    ],
    isFeatured: true,
    audience: 'Equipos boutique con stock rotativo que necesitan pricing y velocidad comercial.',
    summary: '20% de descuento unitario por publicación + herramientas de análisis comparativo.',
    story: 'Analiza la demanda, optimiza precios y colabora con tu equipo en tiempo real.',
  },
  {
    id: 'enterprise',
    tier: 'professional',
    title: 'Enterprise',
    maxListings: 30,
    platformFee: 5,
    discountMultiplier: 0.7,
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || null,
    features: [
      'Hasta 30 terrenos activos con TEAMS',
      'Forecast y reportes personalizados',
      'Soporte prioritario y workshops de marketing',
    ],
    audience: 'Desarrolladores y captadores corporativos con proyectos complejos.',
    summary: '30% de descuento unitario, soporte dedicado y herramientas de colaboración a escala.',
    story: 'Coordina grandes equipos, controla el performance en tiempo real y mantén tu pipeline abastecido.',
  },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    listingId: incomingListingId = null,
    highlightPlan: highlightPlanKey = null,
    from: origin = null,
  } = location.state || {};
  const [planType, setPlanType] = React.useState('particular');
  const [dialogPlan, setDialogPlan] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [backendPlans, setBackendPlans] = React.useState([]);
  const [loadingPlans, setLoadingPlans] = React.useState(false);

  const handlePlanTypeChange = (event, newPlanType) => {
    if (newPlanType !== null) setPlanType(newPlanType);
  };

  React.useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      setLoadingPlans(true);
      try {
        const plans = await marketplaceService.fetchPlans();
        if (mounted) {
          setBackendPlans(plans);
        }
      } catch (error) {
        console.error('Error fetching available plans', error);
      } finally {
        if (mounted) {
          setLoadingPlans(false);
        }
      }
    };
    loadPlans();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!highlightPlanKey) return;
    if (professionalPlans.some((plan) => plan.id === highlightPlanKey)) {
      setPlanType('professional');
    } else if (particularPlans.some((plan) => plan.id === highlightPlanKey)) {
      setPlanType('particular');
    }
  }, [highlightPlanKey]);

  const plansRaw = planType === 'particular' ? particularPlans : professionalPlans;
  const plans = mapPlansWithRange(plansRaw);
  const title = planType === 'particular' ? 'Para Dueños Particulares' : 'Para Vendedores Profesionales';
  const resolveBackendPlan = React.useCallback(
    (plan) => {
      if (!plan) return null;
      const normalizedCandidates = [
        plan.listingPlanKey,
        plan.key,
        plan.id,
        plan.title,
        plan.name,
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase());
      if (normalizedCandidates.length === 0 && highlightPlanKey) {
        normalizedCandidates.push(highlightPlanKey.toString().toLowerCase());
      }
      const matching = backendPlans.find((backendPlan) => {
        const backendCandidates = [backendPlan.id, backendPlan.key, backendPlan.name]
          .filter(Boolean)
          .map((value) => value.toString().toLowerCase());
        return backendCandidates.some((candidate) => normalizedCandidates.includes(candidate));
      });
      return matching || null;
    },
    [backendPlans, highlightPlanKey]
  );

  const withBackendMetadata = React.useCallback(
    (plan) => {
      if (!plan) return null;
      const backend = resolveBackendPlan(plan);
      return {
        ...plan,
        listingPlanId: backend?.id ?? plan.listingPlanId ?? null,
        listingPlanKey: backend?.key ?? plan.listingPlanKey ?? plan.id ?? plan.key ?? null,
        backendPlanName: backend?.name ?? plan.title ?? plan.name ?? null,
      };
    },
    [resolveBackendPlan]
  );

  const handleSelectPlan = (plan) => {
    if (loadingPlans && !backendPlans.length) return;
    const payload = withBackendMetadata(plan);
    if (plan.tier === 'professional') {
      setDialogPlan(payload);
      setDialogOpen(true);
    } else {
      navigate('/checkout', {
        state: {
          plan: withBackendMetadata(payload || plan),
          listingId: incomingListingId,
          from: origin || 'pricing',
        },
      });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setDialogPlan(null);
  };

  const handleDialogConfirm = (payload) => {
    setDialogOpen(false);
    setDialogPlan(null);
    navigate('/checkout', { state: { plan: withBackendMetadata(payload), listingId: incomingListingId, from: origin || 'pricing' } });
  };

  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Volver" sx={{ color: 'text.primary' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
        </Box>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 1 }}>
            Planes de Suscripción
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4, maxWidth: 720, mx: 'auto' }}>
            Selecciona el plan que mejor se adapte a tu contexto. Calcula cuántos terrenos necesitas publicar y revisa qué incluye cada paquete.
          </Typography>
        </motion.div>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
          <ToggleButtonGroup
            value={planType}
            exclusive
            onChange={handlePlanTypeChange}
            aria-label="tipo de plan"
            sx={{
              backgroundColor: '#f5f7fb',
              borderRadius: 999,
              '& .MuiToggleButton-root': {
                border: 'none',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#0b3d86',
                  backgroundColor: 'white',
                  boxShadow: '0px 8px 20px rgba(13, 60, 133, 0.12)',
                },
              },
            }}
          >
            <ToggleButton value="particular">Dueño Particular</ToggleButton>
            <ToggleButton value="professional">Vendedor Profesional</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Typography variant="h4" align="center" sx={{ fontWeight: 600, mb: 6 }}>
            {title}
          </Typography>
        </motion.div>

        <Grid
          container
          spacing={{ xs: 2, md: 3 }}
          justifyContent="center"
          sx={{
            maxWidth: 1040,
            mx: 'auto',
            alignItems: 'stretch',
          }}
        >
          {plans.map((plan, index) => (
            <Grid
              item
              key={plan.id ?? plan.title}
              xs={12}
              sm={6}
              md={4}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                flex: '1 1 0',
                minWidth: { xs: '100%', sm: 300 },
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', height: '100%' }}
              >
                <PricingCard plan={plan} onSelect={() => handleSelectPlan(plan)} />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      <PlanDetailDialog
        open={dialogOpen}
        plan={dialogPlan}
        propertyTypes={PROPERTY_TYPES}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
      />
    </Box>
  );
};

export default PricingPage;
