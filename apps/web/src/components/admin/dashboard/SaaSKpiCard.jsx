import React from 'react';
import { Box, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { glassCard } from '../adminV2Theme';

const ACCENT_GRADIENTS = [
  'linear-gradient(135deg, rgba(94,155,255,0.55), rgba(173,216,230,0.12))',
  'linear-gradient(135deg, rgba(255,148,255,0.55), rgba(204,153,255,0.18))',
  'linear-gradient(135deg, rgba(255,211,105,0.55), rgba(255,176,67,0.16))',
];

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
            borderColor: kpi.trend?.borderColor || '#111111',
            borderWidth: 2,
            tension: 0.4,
        }]
    };

    return (
      <Box
        sx={{
          ...glassCard({ height: '100%', position: 'relative', overflow: 'hidden', px: 3, py: 3 }),
          color: '#f8fbff',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 1,
            borderRadius: 20,
            background: ACCENT_GRADIENTS[kpi.accentIndex || 0] || ACCENT_GRADIENTS[0],
            opacity: 0.55,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ textTransform: 'uppercase', letterSpacing: 1.4, opacity: 0.78 }}>
              {kpi.title}
            </Typography>
            {kpi.badge && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: 12,
                  letterSpacing: 0.6,
                  background: 'rgba(0,0,0,0.25)',
                }}
              >
                {kpi.badge}
              </Box>
            )}
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{kpi.value}</Typography>
          {kpi.trend && (
            <Box sx={{ height: 56 }}>
              <Line options={lineOptions} data={lineData} />
            </Box>
          )}
          {kpi.note && (
            <Typography variant="caption" sx={{ color: 'rgba(248,251,255,0.78)' }}>
              {kpi.note.text}
            </Typography>
          )}
        </Box>
      </Box>
    );
};

export default SaaSKpiCard; 
