import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import SaaSKpiCard from './dashboard/SaaSKpiCard';
import ProductionQueue from './dashboard/ProductionQueue';
import MrrBreakdownChart from './dashboard/MrrBreakdownChart';
import ProfitabilityChart from './dashboard/ProfitabilityChart';
import MrrEvolutionChart from './dashboard/MrrEvolutionChart';
import PlanDistributionChart from './dashboard/PlanDistributionChart';
// Removed colorful icons to keep a professional grayscale look
import AIModelManager from './AIModelManager';
import AIUsageChart from './AIUsageChart';

const kpiData = [
  {
    title: 'Ingreso Mensual Recurrente (MRR)',
    value: '$12,450',
    trend: {
      data: [10, 20, 15, 30, 25, 40, 35],
      borderColor: '#111111',
    },
  },
  {
    title: 'Tasa de Abandono (Churn Rate)',
    value: '2.5%',
    note: {
      text: '+0.5% vs objetivo',
      color: '#6B7280',
    },
  },
  {
    title: 'Valor de Vida del Cliente (LTV)',
    value: '$3,200',
  },
  {
    title: 'Costo de Adquisición (CAC)',
    value: '$450',
  },
];


const AdminDashboardPage = () => {
  return (
        <Box sx={{ p: 3, minHeight: '100vh' }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#111111', mb: 3 }}>
                Dashboard del Administrador
          </Typography>
            <Grid container spacing={3}>
                {/* First Row */}
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpiData[0]} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpiData[1]} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpiData[2]} />
                </Grid>

                {/* Second Row */}
                <Grid item xs={12} lg={8}>
                    <MrrEvolutionChart />
                </Grid>
                <Grid item xs={12} lg={4}>
                    <PlanDistributionChart />
                </Grid>

                {/* Third Row */}
                <Grid item xs={12} lg={4}>
                    <MrrBreakdownChart />
                </Grid>
                <Grid item xs={12} lg={8}>
                    <ProfitabilityChart />
                </Grid>

                {/* Fourth row */}
                <Grid item xs={12}>
                    <ProductionQueue />
                </Grid>

                {/* AI Management Section */}
                <Grid item xs={12}>
                    <AIModelManager />
                </Grid>
                <Grid item xs={12}>
                    <AIUsageChart />
                </Grid>
            </Grid>
    </Box>
  );
};

export default AdminDashboardPage; 