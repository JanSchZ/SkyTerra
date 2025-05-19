import React, { useState } from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme, Grid, Typography, Paper } from '@mui/material';
import FilterPanel from './components/ui/FilterPanel';
import MapView from './components/map/MapView';
import './App.css';

// Crear tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32', // Verde oscuro
    },
    secondary: {
      main: '#1565C0', // Azul oscuro
    },
    background: {
      default: '#F5F5F5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [filters, setFilters] = useState({});

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    console.log('Filtros aplicados:', newFilters);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          SkyTerra V1
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FilterPanel onApplyFilters={handleApplyFilters} />
          </Grid>
          <Grid item xs={12} md={8}>
            <MapView filters={filters} />
          </Grid>
        </Grid>
        <Paper elevation={0} sx={{ mt: 4, p: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            SkyTerra V1 - Plataforma de Propiedades © 2025
          </Typography>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App; 