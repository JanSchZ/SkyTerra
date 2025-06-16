import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
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

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

const ProfitabilityChart = () => {
    const options = {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
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
        scales: {
            x: {
                ticks: {
                    color: '#555555',
                    font: {
                        weight: 'normal',
                    }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#555555',
                    font: {
                        weight: 'normal',
                    }
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
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: 'CAC',
            data: [450, 500, 480, 420],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          },
        ],
    };

    return (
        <GlassCard>
            <CardContent>
                <Typography variant="h6" gutterBottom>Salud de Rentabilidad (LTV vs. CAC)</Typography>
                <Bar options={options} data={data} />
            </CardContent>
        </GlassCard>
    );
};

export default ProfitabilityChart; 