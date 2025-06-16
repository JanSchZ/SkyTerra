import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

export const data = {
    labels: ['Standard', 'Advanced', 'Pro'],
    datasets: [
      {
        label: 'MRR',
        data: [3500, 6500, 2450],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

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
    return (
        <GlassCard>
            <CardContent>
                <Typography variant="h6" gutterBottom>Desglose de MRR por Plan</Typography>
                <Doughnut data={data} options={options} />
            </CardContent>
        </GlassCard>
    );
};

export default MrrBreakdownChart; 