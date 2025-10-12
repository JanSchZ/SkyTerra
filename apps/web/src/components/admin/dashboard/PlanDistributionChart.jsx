import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { propertyService } from "../../../services/api";
import { glassCard } from '../adminV2Theme';

const COLORS = ['#6ba8ff', '#84fab0', '#ffa6e7', '#ffd48a', '#a5b6ff', '#ff9a9e'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          background: 'rgba(15,27,42,0.72)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#f8fbff',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{payload[0].name}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>{`Usuarios: ${payload[0].value}`}</Typography>
      </Box>
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
      <Box sx={{ ...glassCard({ height: '100%' }), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ ...glassCard({ height: '100%' }), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...glassCard({ height: '100%' }), color: '#f8fbff' }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
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
            <Legend
              wrapperStyle={{ color: '#f8fbff' }}
              formatter={(value) => <span style={{ color: 'rgba(248,251,255,0.78)' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default PlanDistributionChart; 
