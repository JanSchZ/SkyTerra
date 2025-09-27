import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, ButtonGroup, Button } from '@mui/material';
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
  padding: theme.spacing(2),
}));

const dayLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
const weekLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];

const options = {
    responsive: true,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    stacked: false,
    plugins: {
        legend: {
            labels: {
                color: '#212121',
                font: { weight: 'normal' }
            }
        },
        title: {
            display: false,
        },
    },
    scales: {
        x: {
            ticks: { color: '#555555', font: { weight: 'normal' } }
        },
        y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
                display: true,
                text: 'Visualizaciones',
                color: '#555555',
            },
            ticks: { color: '#555555', font: { weight: 'normal' } }
        },
        y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
                display: true,
                text: 'Consultas',
                color: '#555555',
            },
            grid: {
                drawOnChartArea: false,
            },
            ticks: { color: '#555555', font: { weight: 'normal' } }
        },
    },
};

const generateData = (canvas, labels) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { labels, datasets: [] };

    const vizGradient = ctx.createLinearGradient(0, 0, 0, 300);
    vizGradient.addColorStop(0, 'rgba(53, 162, 235, 0.5)');
    vizGradient.addColorStop(1, 'rgba(53, 162, 235, 0)');

    const consultGradient = ctx.createLinearGradient(0, 0, 0, 300);
    consultGradient.addColorStop(0, 'rgba(255, 99, 132, 0.5)');
    consultGradient.addColorStop(1, 'rgba(255, 99, 132, 0)');

    return {
        labels,
        datasets: [
            {
                label: 'Visualizaciones',
                data: labels.map(() => Math.floor(Math.random() * 200)),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: vizGradient,
                yAxisID: 'y',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Consultas',
                data: labels.map(() => Math.floor(Math.random() * 30)),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: consultGradient,
                yAxisID: 'y1',
                tension: 0.4,
                fill: true,
            },
        ],
    };
};

const PerformanceChart = () => {
    const [timeframe, setTimeframe] = useState('Mes');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            let labels;
            if (timeframe === 'Día') labels = dayLabels.slice(0,7);
            else if (timeframe === 'Semana') labels = weekLabels;
            else labels = monthLabels;

            const data = generateData(canvas, labels);
            setChartData(data);
        }
    }, [timeframe]);
    
    return (
    <GlassCard>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            Rendimiento a lo Largo del Tiempo
          </Typography>
          <ButtonGroup size="small" aria-label="small button group">
            <Button onClick={() => setTimeframe('Día')} variant={timeframe === 'Día' ? 'contained' : 'outlined'}>Día</Button>
            <Button onClick={() => setTimeframe('Semana')} variant={timeframe === 'Semana' ? 'contained' : 'outlined'}>Semana</Button>
            <Button onClick={() => setTimeframe('Mes')} variant={timeframe === 'Mes' ? 'contained' : 'outlined'}>Mes</Button>
          </ButtonGroup>
        </Box>
        <Box sx={{ height: 300 }}>
            <Line ref={canvasRef} options={options} data={chartData} />
        </Box>
      </CardContent>
    </GlassCard>
  );
};

export default PerformanceChart; 