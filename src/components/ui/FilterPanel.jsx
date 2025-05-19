import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  FormControlLabel,
  Checkbox,
  Button,
  Divider
} from '@mui/material';

const FilterPanel = ({ onApplyFilters }) => {
  // Estados para los filtros
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [sizeRange, setSizeRange] = useState([0, 200]);
  const [hasWater, setHasWater] = useState(false);
  const [hasViews, setHasViews] = useState(false);

  // Formato para precio
  const formatPrice = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Formato para tamaño
  const formatSize = (value) => {
    return `${value} ha`;
  };

  // Manejar cambio en el rango de precios
  const handlePriceChange = (event, newValue) => {
    setPriceRange(newValue);
  };

  // Manejar cambio en el rango de tamaños
  const handleSizeChange = (event, newValue) => {
    setSizeRange(newValue);
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    // Enviar los filtros al componente padre
    onApplyFilters({
      min_price: priceRange[0] > 0 ? priceRange[0] : null,
      max_price: priceRange[1] < 500000 ? priceRange[1] : null,
      min_size: sizeRange[0] > 0 ? sizeRange[0] : null,
      max_size: sizeRange[1] < 200 ? sizeRange[1] : null,
      has_water: hasWater || null,
      has_views: hasViews || null
    });
  };

  // Limpiar filtros
  const handleResetFilters = () => {
    setPriceRange([0, 500000]);
    setSizeRange([0, 200]);
    setHasWater(false);
    setHasViews(false);

    // Aplicar los filtros reseteados
    onApplyFilters({});
  };

  return (
    <Paper sx={{ p: 3, maxWidth: '100%', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>Filtros</Typography>
      <Divider sx={{ mb: 3 }} />
      
      {/* Filtro de precio */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Precio
        </Typography>
        <Slider
          value={priceRange}
          onChange={handlePriceChange}
          valueLabelDisplay="auto"
          valueLabelFormat={formatPrice}
          min={0}
          max={500000}
          step={5000}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2">{formatPrice(priceRange[0])}</Typography>
          <Typography variant="body2">{formatPrice(priceRange[1])}</Typography>
        </Box>
      </Box>

      {/* Filtro de tamaño */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Tamaño (hectáreas)
        </Typography>
        <Slider
          value={sizeRange}
          onChange={handleSizeChange}
          valueLabelDisplay="auto"
          valueLabelFormat={formatSize}
          min={0}
          max={200}
          step={5}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2">{formatSize(sizeRange[0])}</Typography>
          <Typography variant="body2">{formatSize(sizeRange[1])}</Typography>
        </Box>
      </Box>

      {/* Filtros booleanos */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Características
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={hasWater}
              onChange={(e) => setHasWater(e.target.checked)}
            />
          }
          label="Acceso a agua"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={hasViews}
              onChange={(e) => setHasViews(e.target.checked)}
            />
          }
          label="Vistas panorámicas"
        />
      </Box>

      {/* Botones de acción */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleApplyFilters}
        >
          Aplicar
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={handleResetFilters}
        >
          Limpiar
        </Button>
      </Box>
    </Paper>
  );
};

export default FilterPanel; 