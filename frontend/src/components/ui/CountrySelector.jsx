import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import Flag from 'react-world-flags';

const countries = [
  { code: 'US', name: 'USA' },
  { code: 'MX', name: 'México' },
  { code: 'CL', name: 'Chile' },
];

const CountrySelector = ({ selectedCountry, onCountryChange }) => {
  const handleCountryChange = (event, newCountry) => {
    if (newCountry !== null) {
      onCountryChange(newCountry);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
      <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>País:</Typography>
      <ToggleButtonGroup
        value={selectedCountry}
        exclusive
        onChange={handleCountryChange}
        aria-label="country selector"
        size="small"
      >
        <ToggleButton value="GLOBAL" aria-label="global" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}}>
          <PublicIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          Global
        </ToggleButton>
        {countries.map((country) => (
          <ToggleButton key={country.code} value={country.code} aria-label={country.name} sx={{ color: 'white', '&.Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}}>
            <Flag code={country.code} height="12" style={{ marginRight: '4px' }} />
            {country.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default CountrySelector;
