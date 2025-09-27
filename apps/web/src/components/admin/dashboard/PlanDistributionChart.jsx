import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { propertyService } from "../../../services/api";

const COLORS = ['#111111', '#6B7280', '#9CA3AF', '#D1D5DB', '#4B5563', '#E5E7EB'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid #ddd' }}>
        <Typography variant="subtitle1">{`${payload[0].name}`}</Typography>
        <Typography variant="body2" color="text.secondary">{`Usuarios: ${payload[0].value}`}</Typography>
      </Paper>
    );
  }
  return null;
};

const PlanDistributionChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlanMetrics = async () => {
      try {
        setLoading(true);
        const response = await propertyService.getPlanMetrics();
        const formattedData = response.plan_distribution
          .filter(item => item.user_count > 0)
          .map(item => ({
            name: item.name.replace('Vendedor Profesional - ', 'VP ').replace('Dueño Particular - ', 'DP '),
            value: item.user_count,
          }));
        setData(formattedData);
      } catch (err) {
        setError('No se pudieron cargar las métricas de planes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanMetrics();
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Distribución de Usuarios por Plan
      </Typography>
      <Box sx={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PlanDistributionChart; 