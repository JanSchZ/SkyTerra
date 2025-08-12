import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

const MrrEvolutionChart = () => {
    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#212121',
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
          ticks: {
            color: '#555555',
            font: {
              weight: 'normal',
            }
          }
        }
      }
    };
    
    const labels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio'];
    
    const data = {
        labels,
        datasets: [
          {
            label: 'MRR',
            data: [8000, 8500, 9500, 10000, 11000, 11500, 12450],
            borderColor: '#111111',
            backgroundColor: (ctx) => {
              const { chart } = ctx;
              const { ctx: c } = chart;
              const gradient = c.createLinearGradient(0, 0, 0, chart.height);
              gradient.addColorStop(0, 'rgba(0,0,0,0.25)');
              gradient.addColorStop(1, 'rgba(0,0,0,0.0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
          },
        ],
    };

    return (
        <GlassCard>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{color:'text.primary', fontWeight:'bold'}}>Evolución del MRR</Typography>
                <Line options={options} data={data} />
            </CardContent>
        </GlassCard>
    );
};

export default MrrEvolutionChart; 