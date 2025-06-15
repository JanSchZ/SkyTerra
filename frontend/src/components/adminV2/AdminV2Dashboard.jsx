import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { propertyService } from '../../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

function StatsCard({ label, value, subtitle, color }) {
  return (
    <Paper elevation={3} sx={{ p: 2, borderLeft: `6px solid ${color}` }}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>{label}</Typography>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
      {subtitle && <Typography variant="body2" color="textSecondary">{subtitle}</Typography>}
    </Paper>
  );
}

function AdminV2Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch first 1000 properties (for stats). Could be replaced with dedicated endpoint later.
        const data = await propertyService.getProperties({ page_size: 1000 });
        const all = data.results || data; // depending on backend pagination
        const total = all.length;
        const pending = all.filter((p) => p.publication_status === 'pending').length;
        const approved = all.filter((p) => p.publication_status === 'approved').length;

        setStats({ total, pending, approved });

        // Create simple monthly dataset based on created_at months
        const monthMap = {};
        all.forEach((p) => {
          const dateStr = p.created_at || p.createdAt;
          if (dateStr) {
            const date = new Date(dateStr);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            monthMap[key] = (monthMap[key] || 0) + 1;
          }
        });
        const labels = Object.keys(monthMap).sort();
        const counts = labels.map((l) => monthMap[l]);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Nuevas Propiedades',
              data: counts,
              fill: false,
              borderColor: '#1976d2',
              tension: 0.4,
            },
          ],
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Admin Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <StatsCard label="Total Propiedades" value={stats.total} color="#1976d2" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard label="Pendientes" value={stats.pending} color="#ffa726" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatsCard label="Aprobadas" value={stats.approved} color="#66bb6a" />
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Publicaciones por Mes</Typography>
            {chartData ? <Line data={chartData} /> : <Typography>Cargando datos...</Typography>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminV2Dashboard; 