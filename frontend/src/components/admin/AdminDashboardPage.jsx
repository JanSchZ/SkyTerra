import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { Bar, Line, Pie } from 'react-chartjs-2';  // Import Chart.js components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// Importar el layout del panel de admin si ya existe uno, o crear uno básico aquí.
// Por ahora, será un layout simple.

const metricCards = [
  { key: 'pending_properties', label: 'Propiedades Pendientes' },
  { key: 'published_today', label: 'Publicadas Hoy' },
  { key: 'open_tickets', label: 'Tickets Abiertos' },
  { key: 'new_users', label: 'Nuevos Usuarios (7 días)' },
  { key: 'properties_last_week', label: 'Propiedades (Últ. Semana)' },
  { key: 'properties_last_month', label: 'Propiedades (Últ. Mes)' },
  { key: 'average_property_size', label: 'Tamaño Prom. Propiedad' },
];

const AdminDashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [propertyStatusStats, setPropertyStatusStats] = useState(null);
  const [loading, setLoading] = useState(true); // Combined loading state for simplicity
  const [error, setError] = useState(null); // Combined error state
  const [propertyData, setPropertyData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const metricsRes = await axios.get('/api/admin/dashboard-summary/', {
          headers: {
            Authorization: `Token ${localStorage.getItem('auth_token')}`
          }
        });
        setMetrics(metricsRes.data);

        const propertyStatusRes = await axios.get('/api/admin/dashboard/stats/', {
          headers: {
            Authorization: `Token ${localStorage.getItem('auth_token')}`
          }
        });
        setPropertyStatusStats(propertyStatusRes.data);

        // Assuming get_southern_chile_properties is still needed for other charts
        const propertyDataRes = await axios.get('/api/get_southern_chile_properties/', {
          headers: {
            Authorization: `Token ${localStorage.getItem('auth_token')}`
          }
        });
        setPropertyData(propertyDataRes.data);

      } catch (err) {
        setError('Error al cargar datos del dashboard.');
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // This useEffect is now part of the combined fetchDashboardData effect
  // useEffect(() => {
  //   setLoading(true);
  //   axios.get('/api/get_southern_chile_properties/', {
  //     headers: {
  //       Authorization: `Token ${localStorage.getItem('auth_token')}`
  //     }
  //   })
  //     .then(res => {
  //       setPropertyData(res.data);  // New state for property data
  //       setLoading(false);
  //     })
  //     .catch(err => {
  //       setError('Error al cargar datos de propiedades.');
  //       setLoading(false);
  //     });
  // }, []);

  // Chart data for property statuses
  const propertyStatusChartData = propertyStatusStats ? {
    labels: ['Pendientes', 'Aprobadas', 'Rechazadas'],
    datasets: [{
      data: [
        propertyStatusStats.pending_properties,
        propertyStatusStats.approved_properties,
        propertyStatusStats.rejected_properties
      ],
      backgroundColor: ['#FFC107', '#4CAF50', '#F44336'],
      hoverBackgroundColor: ['#FFCA28', '#66BB6A', '#EF5350'],
    }]
  } : null;


  return (
    // El fondo principal (#101923) ya lo da AdminLayout, solo necesitamos un contenedor para el contenido del dashboard.
    <Box sx={{ flexGrow: 1 }}> 
      <Container maxWidth="xl">
        {/* Puedes añadir un Paper aquí si quieres un contenedor visual para el contenido */}
        <Paper 
          elevation={3}
          sx={{
            p: 3,
            backgroundColor: '#182534', // Fondo del Paper/Contenedor
            color: '#E5E8F0', // Color de texto principal
            borderRadius: '12px',
            // margin top si no estás usando el Toolbar spacer
            // mt: 2 
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontFamily: 'Code Pro, sans-serif', fontWeight: 'bold', mb: 3, color: '#E5E8F0' }}>
            SkyTerra Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: 'Clear Sans, sans-serif', color: '#8faacc' }}> {/* Texto secundario/acento */}
            Bienvenido al panel de administración de SkyTerra. Desde aquí podrás gestionar propiedades, usuarios y más.
          </Typography>
          {/* Aquí se añadirán las métricas y otros componentes del dashboard */}
          
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="info" /></Box>}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

          {metrics && (
            <Grid container spacing={3} sx={{ mt: 4 }}>
              {metricCards.map(card => (
                <Grid item xs={12} sm={6} md={3} key={card.key}>
                  <Paper elevation={2} sx={{ p: 2, backgroundColor: '#223449', color: '#E5E8F0', borderRadius: '8px', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Clear Sans, sans-serif', color: '#8faacc', mb: 1 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h3" sx={{ fontFamily: 'Code Pro, sans-serif', fontWeight: 'bold', color: '#E5E8F0' }}>
                      {card.key === 'average_property_size' && metrics[card.key] !== null ?
                        Math.round(metrics[card.key]) + ' ha' :
                        metrics[card.key] !== null ? metrics[card.key] : 'N/A'
                      }
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          <Grid container spacing={3} sx={{ mt: 4 }}>
            {propertyData.length > 0 && (
              <>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2, backgroundColor: '#223449', color: '#E5E8F0' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Clear Sans, sans-serif', color: '#8faacc', mb: 2 }}>Propiedades por Región</Typography>
                    <Bar
                      data={{
                        labels: propertyData.map(item => item.region),  // Assuming region data from API
                        datasets: [{
                          label: 'Cantidad de Propiedades',
                          data: propertyData.map(item => item.count || 1),  // Example aggregation, adjust based on API response
                          backgroundColor: '#8faacc',
                        }]
                      }}
                      options={{ responsive: true }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 2, backgroundColor: '#223449', color: '#E5E8F0' }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Clear Sans, sans-serif', color: '#8faacc', mb: 2 }}>Distribución de Precios</Typography>
                    <Line
                      data={{
                        labels: propertyData.map((item, index) => `Propiedad ${index + 1}`),
                        datasets: [{
                          label: 'Precio (USD)',
                          data: propertyData.map(item => item.price),
                          borderColor: '#E5E8F0',
                          fill: false,
                        }]
                      }}
                      options={{ responsive: true }}
                    />
                  </Paper>
                </Grid>
              </>
            )}
            {propertyStatusChartData && (
              <Grid item xs={12} md={6}> {/* Adjust md size as needed */}
                <Paper elevation={2} sx={{ p: 2, backgroundColor: '#223449', color: '#E5E8F0' }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Clear Sans, sans-serif', color: '#8faacc', mb: 2 }}>Estado de Propiedades</Typography>
                  <Pie data={propertyStatusChartData} options={{ responsive: true }} />
                </Paper>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboardPage; 