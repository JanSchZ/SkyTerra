import React, { useState } from 'react';
import {
  Box, Stepper, Step, StepLabel, Button, Paper, Typography, TextField, MenuItem, Slider, Grid, Card, CardActionArea, CardContent, Snackbar, Alert
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { liquidGlassTheme } from '../../theme/liquidGlassTheme';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../map/MapView';
import { propertyService } from '../../services/api';

const steps = ['Información básica', 'Ubicación', 'Plan de publicación', 'Revisar'];

const planOptions = [
  { key: 'basic', title: 'Normal', price: 0, description: 'Tour 360° estándar + 25 fotos HD' },
  { key: 'pro', title: 'Pro', price: 79990, description: 'Tour extendido, 50 fotos Pro, video aéreo' },
  { key: 'premium', title: 'Premium', price: 149990, description: 'Todo lo anterior + Plusvalía Score' }
];

const propertyTypes = [
  { value: 'farm', label: 'Parcela / Granja', icon: '🌿' },
  { value: 'lot', label: 'Sitio urbano', icon: '🏙️' },
  { value: 'house', label: 'Casa', icon: '🏠' }
];

const theme = liquidGlassTheme('light');

export default function CreatePublicationWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [propertyData, setPropertyData] = useState({
    name: '',
    description: '',
    type: 'farm',
    price: 50000000,
    size: 10,
    latitude: null,
    longitude: null,
    boundary_polygon: null,
    plan: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      // Validación simple
      if (!propertyData.name || !propertyData.description || !propertyData.latitude) {
        setSnackbar({ open: true, message: 'Completa todos los campos requeridos', severity: 'error' });
        return;
      }
      setSubmitting(true);
      try {
        await propertyService.createProperty({
          ...propertyData,
          price: Math.round(propertyData.price),
          size: parseFloat(propertyData.size),
          listing_type: 'sale',
          boundary_polygon: propertyData.boundary_polygon
        });
        setSnackbar({ open: true, message: 'Propiedad creada con éxito', severity: 'success' });
        setSubmitting(false);
        // TODO: redirect to dashboard
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Error al crear la propiedad', severity: 'error' });
        setSubmitting(false);
      }
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Nombre de la propiedad" 
                value={propertyData.name} 
                onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                variant="outlined"
                sx={{ mb: 3 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Tipo de propiedad</Typography>
              <Grid container spacing={2}>
                {propertyTypes.map((type) => (
                  <Grid item xs={4} key={type.value}>
                    <Card 
                      variant={propertyData.type === type.value ? 'outlined' : 'elevation'}
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: propertyData.type === type.value ? '2px solid ' + theme.palette.primary.main : '1px solid #ddd',
                        backgroundColor: propertyData.type === type.value ? 'rgba(25, 118, 210, 0.08)' : '#fff'
                      }}
                      onClick={() => setPropertyData({ ...propertyData, type: type.value })}
                    >
                      <Typography variant="h4" sx={{ mb: 1 }}>{type.icon}</Typography>
                      <Typography variant="body1">{type.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                multiline 
                minRows={4} 
                label="Descripción" 
                value={propertyData.description} 
                onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} 
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Precio (CLP)</Typography>
              <Slider 
                value={propertyData.price} 
                min={10000000} 
                max={1000000000} 
                step={1000000} 
                onChange={(e, v) => setPropertyData({ ...propertyData, price: v })} 
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `$${value.toLocaleString()}`}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Valor: ${propertyData.price.toLocaleString()}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Tamaño (hectáreas)</Typography>
              <Slider 
                value={propertyData.size} 
                min={0.1} 
                max={1000} 
                step={0.1} 
                onChange={(e, v) => setPropertyData({ ...propertyData, size: v })} 
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} ha`}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Tamaño: {propertyData.size} hectáreas
              </Typography>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box sx={{ height: 400 }}>
            <MapView
              editable
              filters={{}}
              appliedFilters={{}}
              initialViewState={{ longitude: -71.5, latitude: -35.6, zoom: 4 }}
              onBoundariesUpdate={(b) => {
                setPropertyData({ ...propertyData, boundary_polygon: b.geojson, latitude: b.center[1], longitude: b.center[0], size: b.area });
              }}
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>Elige tu plan de publicación</Typography>
            <Grid container spacing={3} justifyContent="center">
              {planOptions.map((plan) => (
                <Grid item xs={12} md={4} key={plan.key}>
                  <Card 
                    variant="glass"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: propertyData.plan === plan.key ? '2px solid ' + theme.palette.primary.main : '1px solid rgba(255,255,255,0.3)',
                      backgroundColor: propertyData.plan === plan.key ? 'rgba(25, 118, 210, 0.15)' : undefined,
                      position: 'relative',
                      overflow: 'visible',
                      minHeight: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => setPropertyData({ ...propertyData, plan: plan.key })}
                  >
                    {propertyData.plan === plan.key && (
                      <Box sx={{
                        position: 'absolute',
                        top: -12,
                        right: -12,
                        backgroundColor: theme.palette.primary.main,
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        zIndex: 1
                      }}>
                        ✓
                      </Box>
                    )}
                    <Box>
                      <Typography variant="h3" sx={{ mb: 2, fontSize: '3rem' }}>
                        {plan.key === 'basic' && '📷'}
                        {plan.key === 'pro' && '📹'}
                        {plan.key === 'premium' && '📈'}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>{plan.title}</Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>{plan.description}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString()}`}
                      </Typography>
                      {plan.price > 0 && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Pago único
                        </Typography>
                      )}
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>Resumen de publicación</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="glass" sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid rgba(0,0,0,0.12)', pb: 1 }}>Información básica</Typography>
                  <Typography><strong>Nombre:</strong> {propertyData.name}</Typography>
                  <Typography><strong>Tipo:</strong> {propertyTypes.find(t => t.value === propertyData.type)?.label}</Typography>
                  <Typography><strong>Descripción:</strong> {propertyData.description}</Typography>
                  <Typography><strong>Precio:</strong> ${propertyData.price.toLocaleString()} CLP</Typography>
                  <Typography><strong>Tamaño:</strong> {propertyData.size} hectáreas</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="glass" sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid rgba(0,0,0,0.12)', pb: 1 }}>Ubicación</Typography>
                  <Typography><strong>Latitud:</strong> {propertyData.latitude}</Typography>
                  <Typography><strong>Longitud:</strong> {propertyData.longitude}</Typography>
                  <Box sx={{ mt: 2, height: 150 }}>
                    <MapView
                      staticView
                      filters={{}}
                      appliedFilters={{}}
                      initialViewState={{
                        longitude: propertyData.longitude,
                        latitude: propertyData.latitude,
                        zoom: 12
                      }}
                    />
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card variant="glass" sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid rgba(0,0,0,0.12)', pb: 1 }}>Plan de publicación</Typography>
                  {propertyData.plan ? (
                    <>
                      <Typography><strong>Plan:</strong> {planOptions.find(p => p.key === propertyData.plan)?.title}</Typography>
                      <Typography><strong>Descripción:</strong> {planOptions.find(p => p.key === propertyData.plan)?.description}</Typography>
                      <Typography><strong>Precio:</strong> {planOptions.find(p => p.key === propertyData.plan)?.price === 0 ? 'Gratis' : `$${planOptions.find(p => p.key === propertyData.plan)?.price.toLocaleString()} CLP`}</Typography>
                    </>
                  ) : (
                    <Typography>No se ha seleccionado ningún plan</Typography>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <AnimatePresence mode="wait">
        <motion.div key={activeStep} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          <Paper variant="glass" sx={{ p: 4, minHeight: 300 }}>
            {renderStepContent()}
          </Paper>
        </motion.div>
      </AnimatePresence>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Atrás
        </Button>
        <Button variant="contained" onClick={handleNext} disabled={submitting}>
          {activeStep === steps.length - 1 ? (submitting ? 'Enviando…' : 'Enviar') : 'Siguiente'}
        </Button>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open:false})}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open:false})}>{snackbar.message}</Alert>
      </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
