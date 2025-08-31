import React, { useMemo, useState } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Paper, Typography, TextField, Slider, Grid, Card, Snackbar, Alert, MenuItem, Chip, IconButton } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { liquidGlassTheme } from '../../theme/liquidGlassTheme';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../map/MapView';
import { propertyService, tourService } from '../../services/api';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const steps = ['Información básica', 'Ubicación y límites', 'Medios', 'Revisar'];

const propertyTypes = [
  { value: 'farm', label: 'Parcela / Granja', icon: '🌿' },
  { value: 'ranch', label: 'Rancho', icon: '🐄' },
  { value: 'forest', label: 'Bosque', icon: '🌲' },
  { value: 'lake', label: 'Terreno con Lago/Río', icon: '💧' },
];

const terrainOptions = [
  { value: 'flat', label: 'Plano' },
  { value: 'hills', label: 'Colinas' },
  { value: 'mountains', label: 'Montañoso' },
  { value: 'mixed', label: 'Mixto' },
];

const accessOptions = [
  { value: 'paved', label: 'Pavimentado' },
  { value: 'unpaved', label: 'No pavimentado' },
];

const legalStatusOptions = [
  { value: 'clear', label: 'Saneado' },
  { value: 'mortgaged', label: 'Con hipoteca' },
];

const utilitiesList = [
  { key: 'water', label: 'Agua Potable' },
  { key: 'electricity', label: 'Electricidad' },
  { key: 'internet', label: 'Internet' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'septic_tank', label: 'Fosa Séptica' },
  { key: 'well_water', label: 'Agua de Pozo' },
];

export default function CreatePublicationWizard() {
  const navigate = useNavigate();
  const theme = useMemo(() => liquidGlassTheme('light'), []);

  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);

  const [propertyData, setPropertyData] = useState({
    name: '',
    description: '',
    type: 'farm',
    listingType: 'sale',
    price: 50000000,
    rentPrice: '',
    size: 10,
    utilities: [],
    terrain: 'flat',
    access: 'paved',
    legalStatus: 'clear',
    latitude: null,
    longitude: null,
    boundary_polygon: null,
    images: [],
    documents: [],
    tour360: null,
  });

  const [imagePreviews, setImagePreviews] = useState([]); // {url, file}
  const [documentPreviews, setDocumentPreviews] = useState([]); // {name, file}
  const [tourName, setTourName] = useState('');

  const handleToggleUtility = (key) => {
    setPropertyData((prev) => ({
      ...prev,
      utilities: prev.utilities.includes(key)
        ? prev.utilities.filter((u) => u !== key)
        : [...prev.utilities, key],
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const max = 10 - imagePreviews.length;
    const selected = files.slice(0, Math.max(0, max));
    const newPreviews = selected.map((file) => ({ url: URL.createObjectURL(file), file }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setPropertyData((prev) => ({ ...prev, images: [...prev.images, ...selected] }));
    e.target.value = null;
  };

  const handleRemoveImage = (idx) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
    setPropertyData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map((file) => ({ name: file.name, file }));
    setDocumentPreviews((prev) => [...prev, ...newDocs]);
    setPropertyData((prev) => ({ ...prev, documents: [...prev.documents, ...files] }));
    e.target.value = null;
  };

  const handleRemoveDocument = (idx) => {
    setDocumentPreviews((prev) => prev.filter((_, i) => i !== idx));
    setPropertyData((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }));
  };

  const handleTourUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPropertyData((prev) => ({ ...prev, tour360: file }));
    setTourName(file.name);
    e.target.value = null;
  };

  const validate = () => {
    if (!propertyData.name.trim()) return 'El nombre es obligatorio';
    if (!propertyData.description.trim()) return 'La descripción es obligatoria';
    if (!propertyData.price || Number(propertyData.price) <= 0) return 'Precio inválido';
    if (!propertyData.size || Number(propertyData.size) <= 0) return 'Tamaño inválido';
    if (propertyData.listingType !== 'sale') {
      if (!propertyData.rentPrice || Number(propertyData.rentPrice) <= 0) return 'Precio de arriendo requerido (>0)';
    }
    if (!propertyData.latitude || !propertyData.longitude) return 'Define la ubicación en el mapa';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setSnackbar({ open: true, message: err, severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: propertyData.name,
        description: propertyData.description,
        type: propertyData.type,
        price: Math.round(Number(propertyData.price)),
        size: parseFloat(propertyData.size),
        utilities: propertyData.utilities,
        terrain: propertyData.terrain,
        access: propertyData.access,
        legalStatus: propertyData.legalStatus,
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        boundary_polygon: propertyData.boundary_polygon,
        images: propertyData.images,
        documents: propertyData.documents,
        // Tour se sube por endpoint de tours, no aquí
        tour360: null,
        listing_type: propertyData.listingType,
        rent_price: propertyData.listingType !== 'sale' ? Number(propertyData.rentPrice) : undefined,
      };
      const created = await propertyService.createProperty(payload);
      setSnackbar({ open: true, message: 'Propiedad creada con éxito', severity: 'success' });
      // Subir Tour 360 si fue seleccionado, antes de navegar
      if (propertyData.tour360 && created && created.id) {
        try {
          const form = new FormData();
          form.append('property', created.id);
          form.append('package_file', propertyData.tour360);
          if (tourName) form.append('name', tourName);
          await tourService.uploadTour(form);
        } catch (tourErr) {
          console.error('Error al subir el tour:', tourErr);
          setSnackbar({ open: true, message: 'Propiedad creada, pero falló la subida del tour', severity: 'warning' });
          setTimeout(() => navigate('/dashboard'), 1500);
          return;
        }
      }

      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (e) {
      const msg = e?.message || 'Error al crear la propiedad';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre de la propiedad" value={propertyData.name} onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Tipo" value={propertyData.type} onChange={(e) => setPropertyData({ ...propertyData, type: e.target.value })}>
                {propertyTypes.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.icon} {t.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Modalidad" value={propertyData.listingType} onChange={(e) => setPropertyData({ ...propertyData, listingType: e.target.value })}>
                <MenuItem value="sale">Venta</MenuItem>
                <MenuItem value="rent">Arriendo</MenuItem>
                <MenuItem value="both">Venta y Arriendo</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Precio (CLP)</Typography>
              <Slider value={Number(propertyData.price) || 0} min={1000000} max={1000000000} step={1000000} onChange={(e, v) => setPropertyData({ ...propertyData, price: v })} valueLabelDisplay="auto" valueLabelFormat={(v) => `$${Number(v).toLocaleString()}`} />
              <TextField fullWidth type="number" value={propertyData.price} onChange={(e) => setPropertyData({ ...propertyData, price: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tamaño (hectáreas)</Typography>
              <Slider value={Number(propertyData.size) || 0} min={0.1} max={1000} step={0.1} onChange={(e, v) => setPropertyData({ ...propertyData, size: v })} valueLabelDisplay="auto" valueLabelFormat={(v) => `${v} ha`} />
              <TextField fullWidth type="number" value={propertyData.size} onChange={(e) => setPropertyData({ ...propertyData, size: e.target.value })} />
            </Grid>

            {(propertyData.listingType === 'rent' || propertyData.listingType === 'both') && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="number" label="Precio Arriendo (CLP)" value={propertyData.rentPrice} onChange={(e) => setPropertyData({ ...propertyData, rentPrice: e.target.value })} />
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Terreno" value={propertyData.terrain} onChange={(e) => setPropertyData({ ...propertyData, terrain: e.target.value })}>
                {terrainOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Acceso" value={propertyData.access} onChange={(e) => setPropertyData({ ...propertyData, access: e.target.value })}>
                {accessOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Estado Legal" value={propertyData.legalStatus} onChange={(e) => setPropertyData({ ...propertyData, legalStatus: e.target.value })}>
                {legalStatusOptions.map((o) => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Servicios</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {utilitiesList.map((u) => (
                  <Chip key={u.key} label={u.label} color={propertyData.utilities.includes(u.key) ? 'primary' : 'default'} onClick={() => handleToggleUtility(u.key)} />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={4} label="Descripción" value={propertyData.description} onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Haz clic en el mapa para fijar ubicación. Opcionalmente activa “Dibujar” y traza el polígono del terreno.
            </Typography>
            <MapView
              editable
              embedded
              suppressData
              height={420}
              disableIntroAnimation
              filters={{}}
              appliedFilters={{}}
              initialViewState={{ longitude: -70.6693, latitude: -33.4489, zoom: 5 }}
              onBoundariesUpdate={(b) => {
                if (!b) {
                  setPropertyData((prev) => ({ ...prev, boundary_polygon: null }));
                  return;
                }
                setPropertyData((prev) => ({ ...prev, boundary_polygon: b.geojson, latitude: b.center[1], longitude: b.center[0], size: b.area || prev.size }));
              }}
              onLocationSelect={({ longitude, latitude }) => {
                setPropertyData((prev) => ({ ...prev, latitude, longitude }));
              }}
              selectedPoint={propertyData.latitude && propertyData.longitude ? { latitude: propertyData.latitude, longitude: propertyData.longitude } : null}
            />
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Latitud" value={propertyData.latitude ?? ''} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Longitud" value={propertyData.longitude ?? ''} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Área (ha)" value={propertyData.boundary_polygon ? (Number(propertyData.size || 0).toFixed(2)) : ''} placeholder="—" InputProps={{ readOnly: true }} />
              </Grid>
            </Grid>
          </Box>
        );
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>Imágenes ({imagePreviews.length}/10)</Typography>
              <Grid container spacing={2}>
                {imagePreviews.map((img, idx) => (
                  <Grid item xs={6} sm={4} md={3} key={idx}>
                    <Card variant="glass" sx={{ p: 1, position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                      <img src={img.url} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => handleRemoveImage(idx)} sx={{ position: 'absolute', top: 6, right: 6 }}><DeleteIcon fontSize="small" /></IconButton>
                    </Card>
                  </Grid>
                ))}
                {imagePreviews.length < 10 && (
                  <Grid item xs={6} sm={4} md={3}>
                    <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ width: '100%', height: '100%', minHeight: 120 }}>
                      Subir imágenes
                      <input hidden type="file" accept="image/*" multiple onChange={handleImageUpload} />
                    </Button>
                  </Grid>
                )}
              </Grid>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>Recomendación: sube al menos 5 fotos en horizontal.</Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>Tour 360°</Typography>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}> 
                {tourName || 'Subir paquete .zip (Pano2VR)'}
                <input hidden type="file" accept=".zip" onChange={handleTourUpload} />
              </Button>
              {tourName && (
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>{tourName}</Typography>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>Documentos</Typography>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>Subir documentos
                <input hidden type="file" accept=".pdf,.doc,.docx,image/*" multiple onChange={handleDocumentUpload} />
              </Button>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {documentPreviews.map((doc, idx) => (
                  <Paper key={idx} variant="glass" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{doc.name}</Typography>
                    <IconButton size="small" onClick={() => handleRemoveDocument(idx)}><DeleteIcon fontSize="small" /></IconButton>
                  </Paper>
                ))}
              </Box>
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="glass" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Información básica</Typography>
                <Typography><b>Nombre:</b> {propertyData.name}</Typography>
                <Typography><b>Tipo:</b> {propertyTypes.find((t) => t.value === propertyData.type)?.label}</Typography>
                <Typography><b>Modalidad:</b> {propertyData.listingType === 'sale' ? 'Venta' : propertyData.listingType === 'rent' ? 'Arriendo' : 'Venta y Arriendo'}</Typography>
                <Typography><b>Precio:</b> ${Number(propertyData.price).toLocaleString()}</Typography>
                {propertyData.listingType !== 'sale' && (
                  <Typography><b>Arriendo:</b> ${Number(propertyData.rentPrice || 0).toLocaleString()}</Typography>
                )}
                <Typography><b>Tamaño:</b> {propertyData.size} ha</Typography>
                <Typography><b>Terreno:</b> {terrainOptions.find(o=>o.value===propertyData.terrain)?.label}</Typography>
                <Typography><b>Acceso:</b> {accessOptions.find(o=>o.value===propertyData.access)?.label}</Typography>
                <Typography><b>Estado Legal:</b> {legalStatusOptions.find(o=>o.value===propertyData.legalStatus)?.label}</Typography>
                <Typography sx={{ mt: 1 }}><b>Servicios:</b> {propertyData.utilities.map(u => utilitiesList.find(x=>x.key===u)?.label).filter(Boolean).join(', ') || 'N/D'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="glass" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Ubicación</Typography>
                <Typography><b>Lat/Lon:</b> {propertyData.latitude}, {propertyData.longitude}</Typography>
                <Box sx={{ mt: 1, height: 160 }}>
                  <MapView staticView filters={{}} appliedFilters={{}} initialViewState={{ longitude: propertyData.longitude, latitude: propertyData.latitude, zoom: 12 }} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="glass" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Medios</Typography>
                <Typography variant="body2">Imágenes: {imagePreviews.length}</Typography>
                <Typography variant="body2">Tour: {tourName || 'N/D'}</Typography>
                <Typography variant="body2">Documentos: {documentPreviews.length}</Typography>
              </Paper>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: '#fff', minHeight: '100vh', py: { xs: 2, md: 4 } }}>
        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Nueva Propiedad</Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          <AnimatePresence mode="wait">
            <motion.div key={activeStep} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}>
              <Paper variant="glass" sx={{ p: { xs: 2, md: 3 }, minHeight: 320 }}>
                {renderStepContent()}
              </Paper>
            </motion.div>
          </AnimatePresence>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={activeStep === 0 || submitting} onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>Atrás</Button>
            {activeStep < steps.length - 1 ? (
              <Button 
                variant="contained" 
                onClick={() => {
                  // Validación mínima por paso
                  if (activeStep === 0) {
                    const msg = validate();
                    if (msg && !msg.toLowerCase().includes('define la ubicación')) {
                      setSnackbar({ open: true, message: msg, severity: 'error' });
                      return;
                    }
                  }
                  if (activeStep === 1) {
                    if (!propertyData.latitude || !propertyData.longitude) {
                      setSnackbar({ open: true, message: 'Selecciona la ubicación o dibuja los límites', severity: 'error' });
                      return;
                    }
                  }
                  setActiveStep((s) => Math.min(steps.length - 1, s + 1));
                }}
              >
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Publicando…' : 'Publicar'}</Button>
            )}
          </Box>
        </Box>

        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
