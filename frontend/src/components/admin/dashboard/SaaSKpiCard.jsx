import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Line } from 'react-chartjs-2';

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

const SaaSKpiCard = ({ kpi }) => {
    const lineOptions = {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { point: { radius: 0 } },
      };
      
    const lineData = {
        labels: Array(kpi.trend?.data.length || 0).fill(''),
        datasets: [{
            data: kpi.trend?.data,
            borderColor: kpi.trend?.borderColor,
            borderWidth: 2,
            tension: 0.4,
        }]
    };

    return (
        <GlassCard>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" color="text.secondary">{kpi.title}</Typography>
                    {kpi.icon}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }} color="text.primary">{kpi.value}</Typography>
                {kpi.trend && <Box sx={{height: '50px'}}><Line options={lineOptions} data={lineData} /></Box>}
                {kpi.note && <Typography variant="caption" sx={{color: kpi.note.color}}>{kpi.note.text}</Typography>}
            </CardContent>
        </GlassCard>
    );
};

export default SaaSKpiCard; 