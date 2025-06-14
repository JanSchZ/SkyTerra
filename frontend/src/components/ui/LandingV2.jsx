import React, { useState } from 'react';
import { Box } from '@mui/material';
import MapView from '../map/MapView';
import AISearchBar from './AISearchBar';

export default function LandingV2() {
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Mapa de fondo a pantalla completa */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <MapView
          filters={filters}
          appliedFilters={appliedFilters}
          disableIntroAnimation={false}
          onLoad={() => console.log('Map loaded')}
        />
      </Box>

      {/* Barra de búsqueda IA sobrepuesta */}
      <Box sx={{ position: 'absolute', top: { xs: 16, md: 24 }, left: '50%', transform: 'translateX(-50%)', width: { xs: '90%', md: 480 }, zIndex: 20 }}>
        <AISearchBar
          onApplyFilters={(aiFilters) => {
            setAppliedFilters(aiFilters);
          }}
          compact
        />
      </Box>
    </Box>
  );
} 