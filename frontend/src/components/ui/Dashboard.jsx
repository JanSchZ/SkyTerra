import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Button, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/api';

/**
 * Seller/User Dashboard V2
 * Apple-style Liquid Glass placeholder.
 * TODO: Replace placeholders with real data as endpoints become available.
 */
export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [myProperties, setMyProperties] = useState(null);
  const [loadingProps, setLoadingProps] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await propertyService.getUserProperties();
        setMyProperties(data.results || data);
      } catch (err) {
        console.error('Error cargando propiedades del usuario', err);
        setMyProperties([]);
      } finally {
        setLoadingProps(false);
      }
    };
    fetch();
  }, []);

  const renderDocStatusChip = (property) => {
    if (!property.documents || property.documents.length === 0) {
      return <Chip label="Sin documentos" size="small" color="default" />;
    }
    const statuses = property.documents.map((d) => d.status);
    if (statuses.includes('rejected')) {
      return <Chip label="Rechazados" size="small" color="error" />;
    }
    if (statuses.includes('pending')) {
      return <Chip label="Pendientes" size="small" color="warning" />;
    }
    return <Chip label="Aprobados" size="small" color="success" />;
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Hola{user ? `, ${user.first_name}` : ''} 👋
      </Typography>

      <Grid container spacing={3}>
        {/* Card: Resumen de Publicaciones */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper variant="glass" sx={{ p: 3 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Publicaciones Activas
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              0
            </Typography>
            <Button fullWidth size="small" sx={{ mt: 2 }} disabled>
              Ver detalles próximamente
            </Button>
          </Paper>
        </Grid>

        {/* Card: Analíticas */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper variant="glass" sx={{ p: 3 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Visitas (30 días)
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              0
            </Typography>
            <Button fullWidth size="small" sx={{ mt: 2 }} disabled>
              Gráfico próximamente
            </Button>
          </Paper>
        </Grid>

        {/* Card: Crear nueva publicación */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper variant="glass" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              ¿Nuevo terreno para publicar?
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={()=>navigate('/create-property')}>
              Crear nueva publicación
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Mis Propiedades */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Mis Propiedades
        </Typography>
        {loadingProps ? (
          <Typography variant="body2">Cargando...</Typography>
        ) : myProperties && myProperties.length > 0 ? (
          <Grid container spacing={2}>
            {myProperties.map((prop) => (
              <Grid item xs={12} md={6} lg={4} key={prop.id}>
                <Paper
                  variant="glass"
                  sx={{ p: 2, cursor:'pointer', '&:hover': { boxShadow: 3 } }}
                  onClick={() => navigate(`/property/${prop.id}`)}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {prop.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb:1 }}>
                    {prop.listing_type === 'rent' ? `Arriendo: $${Number(prop.rent_price).toLocaleString()}` : `Venta: $${Number(prop.price).toLocaleString()}`}
                  </Typography>
                  {renderDocStatusChip(prop)}
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2">No tienes propiedades aún.</Typography>
        )}
      </Box>
    </Box>
  );
} 