import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { api } from '../../services/api';
import { Bar, Line, Pie } from 'react-chartjs-2';  // Import Chart.js components
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

// Set global default font for Chart.js
ChartJS.defaults.font.family = "'Source Code Pro', monospace";
ChartJS.defaults.color = '#E5E8F0'; // Default text color for charts

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
  const [propertyData, setPropertyData] = useState([]); // State for general property data

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch dashboard summary metrics
        const metricsRes = await api.get('/admin/dashboard-summary/');
        setMetrics(metricsRes.data);

        // Fetch property status statistics
        const propertyStatusRes = await api.get('/admin/dashboard/stats/');
        setPropertyStatusStats(propertyStatusRes.data);

        // Fetch general property data for charts
        const propertiesRes = await api.get('/properties/');
        // The API /api/properties/ returns paginated results. We need the 'results' array.
        setPropertyData(propertiesRes.data.results || []); // Assuming the data is in a 'results' field due to pagination

      } catch (err) {
        setError('Error al cargar datos del dashboard.');
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // Empty dependency array means this effect runs once on mount

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
        {/* Main content Paper is now transparent, elevation for shadow if desired, or remove if not needed */}
        <Paper 
          elevation={0} // No shadow, or a subtle one e.g., 1
          sx={{
            p: 3,
            backgroundColor: 'transparent', // Make main Paper transparent
            // color: '#E5E8F0', // Color inherited or set on children
            // borderRadius: '12px', // Not needed if transparent
          }}
        >
          <Typography variant="h4" component="h1" sx={{ /*fontFamily: 'Code Pro, sans-serif',*/ fontWeight: 'bold', mb: 3, color: '#E5E8F0' }}> {/* Updated font */}
            SkyTerra Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ /*fontFamily: 'Clear Sans, sans-serif',*/ color: '#8faacc' }}> {/* Updated font */}
            Bienvenido al panel de administración de SkyTerra. Desde aquí podrás gestionar propiedades, usuarios y más.
          </Typography>
          {/* Aquí se añadirán las métricas y otros componentes del dashboard */}
          
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="info" /></Box>}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

          {metrics && (
            <Grid container spacing={3} sx={{ mt: 4 }}>
              {metricCards.map(card => (
                <Grid item xs={12} sm={6} md={3} key={card.key}>
                  <Paper elevation={2} sx={{ p: 2, backgroundColor: '#182534', color: '#E5E8F0', borderRadius: '12px', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" sx={{ /*fontFamily: 'Clear Sans, sans-serif',*/ color: '#8faacc', mb: 1, textAlign: 'center' }}> {/* Updated font */}
                      {card.label}
                    </Typography>
                    <Typography variant="h3" sx={{ /*fontFamily: 'Code Pro, sans-serif',*/ fontWeight: 'bold', color: '#E5E8F0' }}> {/* Updated font */}
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

          {/* Combined Grid for all charts */}
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {/* Property Type Distribution Chart */}
            {propertyData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, backgroundColor: '#182534', color: '#E5E8F0', borderRadius: '12px', height: '400px' /* Fixed height */ }}>
                  <Typography variant="h6" sx={{ /*fontFamily: 'Clear Sans, sans-serif',*/ color: '#8faacc', mb: 2 }}>Distribución de Propiedades por Tipo</Typography> {/* Updated font */}
                  <Box sx={{ height: 'calc(100% - 48px)' }}> {/* Adjust height for chart, considering title */}
                    <Bar
                      data={{
                        labels: [...new Set(propertyData.map(item => item.type || 'N/A'))],
                        datasets: [{
                          label: 'Cantidad de Propiedades',
                          data: [...new Set(propertyData.map(item => item.type || 'N/A'))].map(type =>
                            propertyData.filter(item => (item.type || 'N/A') === type).length
                          ),
                          backgroundColor: '#8faacc',
                          borderColor: '#8faacc',
                          borderWidth: 1,
                          borderRadius: 4, // Rounded bars
                          barThickness: 'flex',
                          maxBarThickness: 50,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          }
                        },
                        scales: {
                          x: {
                            grid: {
                              color: 'rgba(229, 232, 240, 0.2)', // Lighter grid lines
                              borderColor: 'rgba(229, 232, 240, 0.2)'
                            },
                            ticks: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          },
                          y: {
                            grid: {
                              color: 'rgba(229, 232, 240, 0.2)', // Lighter grid lines
                              borderColor: 'rgba(229, 232, 240, 0.2)'
                            },
                            ticks: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Price Distribution Chart */}
            {propertyData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, backgroundColor: '#182534', color: '#E5E8F0', borderRadius: '12px', height: '400px' /* Fixed height */ }}>
                  <Typography variant="h6" sx={{ /*fontFamily: 'Clear Sans, sans-serif',*/ color: '#8faacc', mb: 2 }}>Distribución de Precios</Typography>
                  <Box sx={{ height: 'calc(100% - 48px)' }}> {/* Adjust height for chart, considering title */}
                    <Line
                      data={{
                        labels: propertyData.map(item => `ID ${item.id}`),
                        datasets: [{
                          label: 'Precio (USD)',
                          data: propertyData.map(item => item.price),
                          borderColor: '#8faacc',
                          backgroundColor: 'rgba(143, 170, 204, 0.2)', // Optional fill
                          fill: true, // Optional fill
                          tension: 0.1, // Smoother lines
                          pointBackgroundColor: '#E5E8F0',
                          pointBorderColor: '#8faacc',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: '#8faacc',
                          pointRadius: 4,
                          pointHoverRadius: 6
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          },
                          tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(context.parsed.y);
                                    }
                                    return label;
                                }
                            }
                          }
                        },
                        scales: {
                          x: {
                            title: { display: false, text: 'Propiedad ID' },
                            grid: {
                              color: 'rgba(229, 232, 240, 0.2)',
                              borderColor: 'rgba(229, 232, 240, 0.2)'
                            },
                            ticks: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          },
                          y: {
                            title: { display: false, text: 'Precio (USD)' },
                            grid: {
                              color: 'rgba(229, 232, 240, 0.2)',
                              borderColor: 'rgba(229, 232, 240, 0.2)'
                            },
                            ticks: {
                              color: '#E5E8F0',
                              font: { family: "'Source Code Pro', monospace" },
                              callback: function(value) { // Format Y-axis as currency
                                return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
                              }
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Property Status Chart */}
            {propertyStatusChartData && (
              <Grid item xs={12} md={6}> {/* Displayed below, taking half width or full if desired */}
                <Paper elevation={2} sx={{ p: 2, backgroundColor: '#182534', color: '#E5E8F0', borderRadius: '12px', height: '400px' /* Fixed height */ }}>
                  <Typography variant="h6" sx={{ /*fontFamily: 'Clear Sans, sans-serif',*/ color: '#8faacc', mb: 2 }}>Estado de Propiedades</Typography>
                  <Box sx={{ height: 'calc(100% - 48px)' }}> {/* Adjust height for chart, considering title */}
                    <Pie
                      data={propertyStatusChartData} // propertyStatusChartData already defines labels and datasets
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top', // Or 'bottom', 'left', 'right'
                            labels: {
                              color: '#E5E8F0', // Color for legend text
                              font: { family: "'Source Code Pro', monospace" } // Updated font
                            }
                          }
                        },
                        elements: {
                          arc: {
                            borderColor: '#182534', // Border color for pie slices, matching Paper background
                            borderWidth: 2
                          }
                        }
                      }}
                    />
                  </Box>
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