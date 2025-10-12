import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { propertyService } from '../../../services/api';
import { glassCard } from '../adminV2Theme';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#6ba8ff', '#b78bff', '#ffd48a'];

  const options = {
    responsive: true,
    plugins: {
        legend: {
        position: 'bottom',
        labels: {
            color: 'rgba(248,251,255,0.78)',
            font: {
              weight: 'normal',
            }
        }
      },
      title: {
        display: false,
      },
    },
  };

const MrrBreakdownChart = () => {
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const stats = await propertyService.getDashboardStats();
                if (!mounted) return;
                const labels = ['Pendiente', 'Aprobada', 'Rechazada'];
                const values = [
                    stats.pending_properties || 0,
                    stats.approved_properties || 0,
                    stats.rejected_properties || 0,
                ];
                setChartData({
                    labels,
                    datasets: [{
                        label: 'Propiedades',
                        data: values,
                        backgroundColor: COLORS,
                        borderColor: COLORS.map(c => c.replace('0.', '0.9')),
                        borderWidth: 1,
                    }]
                });
            } catch (e) {
                setChartData({ labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['rgba(0,0,0,0.2)'] }] });
            }
        })();
        return () => { mounted = false; };
    }, []);

    return (
        <Box sx={{ ...glassCard({ height: '100%' }), color: '#f8fbff' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Estado de Publicaciones</Typography>
            <Doughnut data={chartData} options={options} />
        </Box>
    );
};

export default MrrBreakdownChart; 
