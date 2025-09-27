import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import DnsIcon from '@mui/icons-material/Dns';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

const GlassCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  borderRadius: '15px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  padding: theme.spacing(2),
}));

const StatusPill = styled(Chip)(({ theme, status }) => ({
  color: '#fff',
  fontWeight: 'bold',
  ...(status === 'completed' && {
    backgroundColor: theme.palette.success.main,
  }),
  ...(status === 'in-progress' && {
    backgroundColor: theme.palette.warning.main,
  }),
  ...(status === 'active' && {
    backgroundColor: theme.palette.info.main,
  }),
}));

const planData = {
  name: 'Advanced',
  benefits: [
    {
      name: 'Tour 360° (5 Vistas Dron)',
      icon: <DnsIcon sx={{ mr: 1 }} />,
      status: 'completed',
      statusText: 'Completado',
    },
    {
      name: 'Video Skyterra',
      icon: <VideocamIcon sx={{ mr: 1 }} />,
      status: 'in-progress',
      statusText: 'En Post-Producción',
    },
    {
      name: 'Publicación de Loteos',
      icon: <PhotoLibraryIcon sx={{ mr: 1 }} />,
      status: 'active',
      statusText: 'Activado',
    },
  ],
};

const PlanStatus = () => {
  return (
    <GlassCard>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Estás en el Plan {planData.name}
          </Typography>
          <Box>
            {planData.benefits.map((benefit, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {benefit.icon}
                <Typography variant="body1" sx={{ flexGrow: 1 }}>{benefit.name}</Typography>
                <StatusPill label={benefit.statusText} status={benefit.status} />
              </Box>
            ))}
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px dashed grey',
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>
              ¿Quieres más alcance?
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Sube al Plan PRO y promocionaremos tu propiedad en nuestras Redes Sociales y Newsletter.
            </Typography>
            <Button variant="contained" color="primary" sx={{backgroundColor: '#192a56'}}>
              Ver Beneficios del Plan PRO
            </Button>
          </Box>
        </Grid>
      </Grid>
    </GlassCard>
  );
};

export default PlanStatus; 