import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import BarChartIcon from '@mui/icons-material/BarChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(1),
    textAlign: 'left',
    height: '100%',
}));

const kpiData = [
  {
    icon: <QuestionAnswerIcon fontSize="large" sx={{ opacity: 0.3 }} />,
    value: '97',
    label: 'Consultas Cualificadas',
    change: '+5% vs mes anterior',
  },
  {
    icon: <VisibilityIcon fontSize="large" sx={{ opacity: 0.3 }} />,
    value: '1,240',
    label: 'Visualizaciones Totales',
    change: '+12% vs mes anterior',
  },
  {
    icon: <BarChartIcon fontSize="large" sx={{ opacity: 0.3 }} />,
    value: '7.8%',
    label: 'Tasa de Conversión',
    change: '-0.2% vs mes anterior',
  },
  {
    icon: <TrendingUpIcon fontSize="large" sx={{ opacity: 0.3 }} />,
    value: 'Posición #3',
    label: 'Ranking en Búsquedas',
    change: 'Estable',
  },
];

const KpiCard = ({ kpi }) => (
  <GlassCard variant="outlined">
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {kpi.value}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {kpi.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {kpi.change}
          </Typography>
        </Box>
        <Box>
            {kpi.icon}
        </Box>
      </Box>
    </CardContent>
  </GlassCard>
);

const PerformanceKPIs = () => {
  return (
    <Grid container spacing={2}>
      {kpiData.map((kpi, index) => (
        <Grid item xs={12} key={index}>
          <KpiCard kpi={kpi} />
        </Grid>
      ))}
    </Grid>
  );
};

export default PerformanceKPIs; 