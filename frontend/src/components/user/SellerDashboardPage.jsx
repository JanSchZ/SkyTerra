import React from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import PlanStatus from '../seller/PlanStatus';
import PerformanceChart from '../seller/PerformanceChart';
import PerformanceKPIs from '../seller/PerformanceKPIs';
import PropertiesTable from '../seller/PropertiesTable';

const SellerDashboardPage = () => {
    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56', mb: 3 }}>
                Dashboard del Vendedor
            </Typography>
            <Grid container spacing={3}>
                {/* Franja 1: Plan y Estado */}
                <Grid item xs={12}>
                    <PlanStatus />
                </Grid>

                {/* Franja 2: Rendimiento y KPIs */}
                <Grid item xs={12} md={8}>
                    <PerformanceChart />
                </Grid>
                <Grid item xs={12} md={4}>
                    <PerformanceKPIs />
                </Grid>

                {/* Franja 3: Gestión de Propiedades */}
                <Grid item xs={12}>
                    <PropertiesTable />
                </Grid>
            </Grid>
        </Box>
    );
};

export default SellerDashboardPage; 