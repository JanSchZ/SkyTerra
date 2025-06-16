import React from 'react';
import { Box, Typography, Button, Container, Paper, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PlanStatus from '../seller/PlanStatus';
import PerformanceChart from '../seller/PerformanceChart';
import PerformanceKPIs from '../seller/PerformanceKPIs';
import PropertiesTable from '../seller/PropertiesTable';

const SellerDashboardPage = ({ user }) => {
    const navigate = useNavigate();
    const currentPlan = user?.groups?.length > 0 ? user.groups[0] : 'No tienes un plan activo';

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 5, color: 'text.primary' }}>
            <Container maxWidth="lg">
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Mi Panel de Vendedor
                </Typography>
                
                <Paper 
                    sx={{ 
                        p: 3, 
                        mb: 4, 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'grey.800',
                        borderRadius: 3,
                    }}
                >
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Typography variant="h6" color="text.primary">Tu Plan Actual</Typography>
                            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                                {currentPlan}
                            </Typography>
                            <Typography variant="body2" color="text.primary">
                                Gestiona tus publicaciones y aprovecha al máximo las herramientas de SkyTerra.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                            <Button 
                                variant="contained" 
                                color="primary"
                                onClick={() => navigate('/pricing')}
                            >
                                Ver o Cambiar de Plan
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                    Tus Propiedades
                </Typography>
                {/* Aquí iría la lista de propiedades del usuario */}
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography color="text.primary">
                        Aún no has publicado ninguna propiedad.
                    </Typography>
                    <Button 
                        variant="outlined" 
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/wizard-create')}
                    >
                        Crear mi primera publicación
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
};

export default SellerDashboardPage; 