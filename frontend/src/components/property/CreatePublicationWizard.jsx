import React, { useState } from 'react';
import {
  Box, Stepper, Step, StepLabel, Button, Paper, Typography, TextField, MenuItem, Slider, Grid, Card, CardActionArea, CardContent, Snackbar, Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../map/MapView';
import { propertyService } from '../../services/api';

const steps = ['Información básica', 'Ubicación', 'Plan de publicación', 'Revisar'];

const planOptions = [
  { key: 'basic', title: 'Normal', price: 0, description: 'Tour 360° estándar + 25 fotos HD' },
  { key: 'pro', title: 'Pro', price: 79990, description: 'Tour extendido, 50 fotos Pro, video aéreo' },
  { key: 'premium', title: 'Premium', price: 149990, description: 'Todo lo anterior + Plusvalía Score' }
];

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
          boundary_polygon: JSON.stringify(propertyData.boundary_polygon)
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
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Nombre" value={propertyData.name} onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Tipo" value={propertyData.type} onChange={(e) => setPropertyData({ ...propertyData, type: e.target.value })}>
                <MenuItem value="farm">Parcela / Granja</MenuItem>
                <MenuItem value="lot">Sitio urbano</MenuItem>
                <MenuItem value="house">Casa</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Descripción" value={propertyData.description} onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Precio (CLP)</Typography>
              <Slider value={propertyData.price} min={10000000} max={1000000000} step={1000000} onChange={(e, v)=> setPropertyData({ ...propertyData, price: v })} valueLabelDisplay="auto" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Tamaño (ha)</Typography>
              <Slider value={propertyData.size} min={0.1} max={1000} step={0.1} onChange={(e, v)=> setPropertyData({ ...propertyData, size: v })} valueLabelDisplay="auto" />
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
          <Grid container spacing={2}>
            {planOptions.map((plan) => (
              <Grid item xs={12} md={4} key={plan.key}>
                <Card variant={propertyData.plan === plan.key ? 'outlined' : undefined}>
                  <CardActionArea onClick={() => setPropertyData({ ...propertyData, plan: plan.key })}>
                    <CardContent>
                      <Typography variant="h6">{plan.title}</Typography>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{plan.description}</Typography>
                      <Typography variant="h5">{plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString()}`}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      case 3:
        return (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Revisión final (placeholder)</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(propertyData, null, 2)}</pre>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
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
  );
} 