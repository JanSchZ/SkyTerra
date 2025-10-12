import React from 'react';
import { Box, Typography } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

import { glassCard } from '../adminV2Theme';

const ProfitabilityChart = () => {
    const options = {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
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
        scales: {
            x: {
                ticks: {
                    color: 'rgba(248,251,255,0.6)',
                    font: {
                        weight: 'normal',
                    }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'rgba(248,251,255,0.6)',
                    font: {
                        weight: 'normal',
                    }
                },
                grid: {
                    color: 'rgba(248,251,255,0.08)',
                }
            }
        }
    };
      
    const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
      
    const data = {
        labels,
        datasets: [
          {
            label: 'LTV',
            data: [2800, 3200, 3100, 3400],
            backgroundColor: 'rgba(132, 212, 255, 0.6)',
            borderRadius: 12,
          },
          {
            label: 'CAC',
            data: [450, 500, 480, 420],
            backgroundColor: 'rgba(255, 167, 196, 0.55)',
            borderRadius: 12,
          },
        ],
    };

    return (
        <Box sx={{ ...glassCard({ height: '100%' }), color: '#f8fbff' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Salud de Rentabilidad (LTV vs. CAC)</Typography>
            <Bar options={options} data={data} />
        </Box>
    );
};

export default ProfitabilityChart; 
