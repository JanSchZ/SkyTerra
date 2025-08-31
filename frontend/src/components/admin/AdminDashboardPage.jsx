import React, { useEffect, useState } from 'react';
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
import { propertyService } from '../../services/api';

const defaultKpis = [
  { title: 'Propiedades pendientes', value: '0' },
  { title: 'Publicadas hoy', value: '0' },
  { title: 'Tickets abiertos', value: '0' },
];


const AdminDashboardPage = () => {
  const [kpis, setKpis] = useState(defaultKpis);

  useEffect(() => {
    (async () => {
      try {
        const summary = await propertyService.getAdminSummary();
        setKpis([
          { title: 'Propiedades pendientes', value: String(summary.pending_properties || 0) },
          { title: 'Publicadas hoy', value: String(summary.published_today || 0) },
          { title: 'Tickets abiertos', value: String(summary.open_tickets || 0) },
        ]);
      } catch (_) {
        setKpis(defaultKpis);
      }
    })();
  }, []);

  return (
        <Box sx={{ p: 3, minHeight: '100vh' }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#111111', mb: 3 }}>
                Dashboard del Administrador
          </Typography>
            <Grid container spacing={3}>
                {/* First Row */}
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpis[0]} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpis[1]} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SaaSKpiCard kpi={kpis[2]} />
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