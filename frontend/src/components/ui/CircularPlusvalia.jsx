import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../theme/tokens';

/**
 * CircularPlusvalia
 * - Circular gauge 0–100 with value centered (no decimals)
 * - Thick stroke and SkyTerra green color
 */
const CircularPlusvalia = ({ value = 0, size = 56, strokeWidth = 6, color }) => {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));
  const display = Math.round(safeValue);
  const strokeColor = color || tokens?.colors?.accent || '#1E8578';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeValue / 100);

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <Typography
        component="div"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: Math.max(12, Math.round(size * 0.34)),
          fontWeight: 600,
          color: '#ffffff',
        }}
      >
        {display}
      </Typography>
    </Box>
  );
};

export default CircularPlusvalia;


