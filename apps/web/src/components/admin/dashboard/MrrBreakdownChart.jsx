import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { propertyService } from '../../../services/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

const COLORS = ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.25)'];

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
            color: '#212121', // Dark text for legends
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
        <GlassCard>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{color:'text.primary', fontWeight:'bold'}}>Estado de Publicaciones</Typography>
                <Doughnut data={chartData} options={options} />
            </CardContent>
        </GlassCard>
    );
};

export default MrrBreakdownChart; 