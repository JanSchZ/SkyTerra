import React from 'react';
import { Box, Typography, Container, Grid, ToggleButton, ToggleButtonGroup, Paper, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import PricingCard from './PricingCard';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate } from 'react-router-dom';

const particularPlans = [
  {
    title: 'Básico',
    price: '1,5 UF',
    price_period: '/ mensual',
    priceId: 'price_xxxxxxxxxxxxxx1',
    features: [
      '1 Aviso activo',
      'Tour 360 con 2 vistas aéreas',
      'Estadísticas de publicación',
      'Alertas E-mail',
    ],
  },
  {
    title: 'Avanzado',
    price: '3 UF',
    price_period: '/ mensual',
    priceId: 'price_xxxxxxxxxxxxxx2',
    features: [
      '1 Aviso activo',
      'Tour virtual con 5 vistas aéreas',
      'Video aéreo 4k',
      'Publicación de loteo',
      'Estadísticas de publicación',
    ],
    isFeatured: true,
  },
  {
    title: 'Pro',
    price: '9 UF',
    price_period: '/ mensual',
    priceId: 'price_xxxxxxxxxxxxxx3',
    features: [
      'Todo lo de Avanzado +',
      '7 vistas aéreas + 10 terrestres',
      'Publicación de loteo sin límites',
      'Marketing en RRSS',
      'Métricas Avanzadas',
      'Publicación en Newsletter',
    ],
  },
];

const profesionalPlans = [
    {
      title: 'Start',
      price: 'Desde 5 UF',
      price_period: '/ mensual',
      priceId: 'price_xxxxxxxxxxxxxx4',
      features: [
        'Hasta 3 avisos activos',
        'Gestión y datos de propiedades',
        'Tarifa de plataforma: 0.5 UF',
        'Publicación Simple/Avanzada/Pro',
      ],
    },
    {
      title: 'Growth',
      price: 'Desde 13 UF',
      price_period: '/ mensual',
      priceId: 'price_xxxxxxxxxxxxxx5',
      features: [
        'Hasta 10 avisos activos',
        'Gestión y datos de propiedades',
        'Reporte comparativo de precios',
        'Precios con 20% de descuento',
        'Tarifa de plataforma: 1 UF'
      ],
      isFeatured: true,
    },
    {
      title: 'Enterprise',
      price: 'Desde 36.5 UF',
      price_period: '/ mensual',
      priceId: 'price_xxxxxxxxxxxxxx6',
      features: [
        'Hasta 30 avisos activos',
        'Función TEAMS para equipos',
        'Reportes de rendimiento',
        'Soporte en tiempo real',
        'Precios con 30% de descuento',
        'Tarifa de plataforma: 5 UF'
      ],
    },
];

const PricingPage = () => {
  const navigate = useNavigate();
  const [planType, setPlanType] = React.useState('particular');

  const handlePlanTypeChange = (event, newPlanType) => {
    if (newPlanType !== null) {
      setPlanType(newPlanType);
    }
  };

  const plans = planType === 'particular' ? particularPlans : profesionalPlans;
  const title = planType === 'particular' ? 'Para Dueños Particulares' : 'Para Vendedores Profesionales';

  return (
<Box sx={{ 
  backgroundColor: 'white',
  minHeight: '100vh', 
  py: 6, 
  color: 'text.primary',
}}>
      <Container maxWidth={false}>
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Volver" sx={{ color: 'text.primary' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
        </Box>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            Planes de Suscripción
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Elige el plan que mejor se adapte a tus necesidades.
          </Typography>
        </motion.div>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
          <ToggleButtonGroup
            value={planType}
            exclusive
            onChange={handlePlanTypeChange}
            aria-label="tipo de plan"
            sx={{
              '& .MuiToggleButton-root': {
                color: 'text.secondary',
                borderColor: 'rgba(255, 255, 255, 0.23)',
                textTransform: 'none',
                fontSize: '1rem',
                px: 3,
                py: 1,
                '&.Mui-selected': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(144, 202, 249, 0.16)',
                  fontWeight: 'bold',
                },
              },
            }}
          >
            <ToggleButton value="particular" aria-label="dueño particular">
              Dueño Particular
            </ToggleButton>
            <ToggleButton value="profesional" aria-label="vendedor profesional">
              Vendedor Profesional
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Typography variant="h4" component="h2" align="center" gutterBottom sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
        </motion.div>

        <Grid container spacing={3} alignItems="stretch" justifyContent="center" sx={{ maxWidth: '1300px', margin: '0 auto', flexWrap: 'nowrap' }}>
          {plans.map((plan, index) => (
            <Grid item key={index} xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', justifyContent: 'center', minWidth: '300px', flex: '1 0 auto' }}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                style={{ width: '100%', height: '100%' }}
              >
                <PricingCard {...plan} />
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default PricingPage;
