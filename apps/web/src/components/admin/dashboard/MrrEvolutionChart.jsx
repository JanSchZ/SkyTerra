import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
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
import { propertyService } from '../../../services/api';

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

import { glassCard } from '../adminV2Theme';

const MrrEvolutionChart = () => {
    const [dataset, setDataset] = useState({ labels: [], datasets: [] });
    useEffect(() => {
      (async () => {
        try {
          const summary = await propertyService.getAdminSummary();
          const byDay = (summary.properties_by_day || []).map(x => ({
            date: x.day || x.date,
            count: x.count || x.total || 0,
          }));
          const labels = byDay.map(d => new Date(d.date).toLocaleDateString());
          const data = byDay.map(d => d.count);
          setDataset({
            labels,
            datasets: [{
              label: 'Nuevas Propiedades',
              data,
              borderColor: '#111111',
              backgroundColor: (ctx) => {
                const { chart } = ctx; const { ctx: c } = chart;
                const gradient = c.createLinearGradient(0, 0, 0, chart.height);
                gradient.addColorStop(0, 'rgba(0,0,0,0.25)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.0)');
                return gradient;
              },
              fill: true,
              tension: 0.4,
            }]
          });
        } catch {
          setDataset({ labels: [], datasets: [] });
        }
      })();
    }, []);
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
    
    const data = dataset;

    return (
      <Box sx={{ ...glassCard({ height: '100%' }), color: '#f8fbff' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Nuevas Propiedades (últimos días)
        </Typography>
        <Line options={options} data={data} />
      </Box>
    );
};

export default MrrEvolutionChart; 
