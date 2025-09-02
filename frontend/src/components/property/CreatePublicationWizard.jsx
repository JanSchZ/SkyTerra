import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Paper, Typography, TextField, Slider, Grid, Card, Snackbar, Alert, MenuItem, Chip, IconButton, CircularProgress, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { liquidGlassTheme } from '../../theme/liquidGlassTheme';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../map/MapView';
import BoundaryEditor from '../map/BoundaryEditor';
import { propertyService, tourService } from '../../services/api';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

const steps = ['Información básica', 'Ubicación y límites', 'Medios', 'Revisar'];

// Tipos predefinidos eliminados: Sam infiere categorías automáticamente

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
  const boundaryEditorRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchAbortRef = useRef(null);

  const [propertyData, setPropertyData] = useState({
    name: '',
    description: '',
    type: '',
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
  });
  // Geocoding for step 2 search bar (outside map)
  useEffect(() => {
    if (activeStep !== 1) return;
    const q = (searchQuery || '').trim();
    if (q.length < 3) { setSearchResults([]); if (searchAbortRef.current) { try { searchAbortRef.current.abort(); } catch (_) {} } return; }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&language=es&limit=6`;
        const resp = await fetch(endpoint, { signal: controller.signal });
        const data = await resp.json();
        const feats = Array.isArray(data?.features) ? data.features : [];
        setSearchResults(feats.map(f => ({ id: f.id, place_name: f.place_name_es || f.place_name, center: f.center })));
      } catch (e) {
        if (e?.name !== 'AbortError') console.error('Geocoding error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); try { controller.abort(); } catch (_) {} };
  }, [searchQuery, activeStep]);

  const handlePickSearchResult = (res) => {
    if (!res || !Array.isArray(res.center) || res.center.length < 2) return;
    const [lon, lat] = res.center;
    // Center map via BoundaryEditor ref when mounted
    try {
      boundaryEditorRef.current?.flyTo?.({ center: [lon, lat], zoom: 13.5, duration: 1200 });
    } catch (_) {}
    setPropertyData(prev => ({ ...prev, longitude: lon, latitude: lat }));
    setSearchResults([]);
  };

  const [imagePreviews, setImagePreviews] = useState([]); // {url, file}
  const [documentPreviews, setDocumentPreviews] = useState([]); // {name, file}
  // Tour 360° se gestiona exclusivamente en Admin > Propiedades

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

  // Sin manejador de Tour 360° aquí; flujo unificado en gestión de propiedades

  const validateBasic = () => {
    if (!propertyData.name.trim()) return 'El nombre es obligatorio';
    if (!propertyData.description.trim()) return 'La descripción es obligatoria';
    if (!propertyData.price || Number(propertyData.price) <= 0) return 'Precio inválido';
    if (!propertyData.size || Number(propertyData.size) <= 0) return 'Tamaño inválido';
    if (propertyData.listingType !== 'sale') {
      if (!propertyData.rentPrice || Number(propertyData.rentPrice) <= 0) return 'Precio de arriendo requerido (>0)';
    }
    return null;
  };

  const validate = () => {
    const basic = validateBasic();
    if (basic) return basic;
    if (!propertyData.boundary_polygon) return 'Dibuja el polígono de la propiedad en el mapa';
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
        // Tour 360° se gestiona desde Admin > Propiedades
        listing_type: propertyData.listingType,
        rent_price: propertyData.listingType !== 'sale' ? Number(propertyData.rentPrice) : undefined,
      };
      const created = await propertyService.createProperty(payload);
      setSnackbar({ open: true, message: 'Propiedad creada con éxito', severity: 'success' });
      // Nota: la carga de Tour 360° se realiza en Admin > Propiedades

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
              <TextField fullWidth label="Nombre de la propiedad" value={propertyData.name} onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })} autoComplete="off" />
            </Grid>
            {/* Eliminado: no pedimos 'Tipo' fijo */}
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
              <TextField fullWidth type="number" value={propertyData.price} onChange={(e) => setPropertyData({ ...propertyData, price: e.target.value })} autoComplete="off" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tamaño (hectáreas)</Typography>
              <Slider value={Number(propertyData.size) || 0} min={0.1} max={1000} step={0.1} onChange={(e, v) => setPropertyData({ ...propertyData, size: v })} valueLabelDisplay="auto" valueLabelFormat={(v) => `${v} ha`} />
              <TextField fullWidth type="number" value={propertyData.size} onChange={(e) => setPropertyData({ ...propertyData, size: e.target.value })} autoComplete="off" />
            </Grid>

            {(propertyData.listingType === 'rent' || propertyData.listingType === 'both') && (
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="number" label="Precio Arriendo (CLP)" value={propertyData.rentPrice} onChange={(e) => setPropertyData({ ...propertyData, rentPrice: e.target.value })} autoComplete="off" />
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
              <TextField fullWidth multiline minRows={4} label="Descripción" value={propertyData.description} onChange={(e) => setPropertyData({ ...propertyData, description: e.target.value })} autoComplete="off" />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              Dibuja el polígono del terreno. Calcularemos ubicación central y área automáticamente.
            </Typography>
            {/* Search bar outside the map */}
            <Box sx={{ mb: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar dirección, ciudad o lugar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="outlined"
                InputProps={{ endAdornment: searchLoading ? <CircularProgress size={16} /> : null }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.98)',
                    '& fieldset': { borderColor: 'rgba(0,0,0,0.18)' },
                    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.28)' },
                    '&.Mui-focused fieldset': { borderColor: '#1976d2' }
                  }
                }}
              />
              {searchResults.length > 0 && (
                <Paper elevation={2} sx={{ mt: 0.5, borderRadius: 2, maxHeight: 260, overflowY: 'auto' }}>
                  <List dense>
                    {searchResults.map((r) => (
                      <ListItem key={r.id} disableGutters>
                        <ListItemButton onClick={() => handlePickSearchResult(r)}>
                          <ListItemText primary={r.place_name} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
            <BoundaryEditor
              ref={boundaryEditorRef}
              initialViewState={{ longitude: -70.6693, latitude: -33.4489, zoom: 5 }}
              height={560}
              square
              existingFeature={propertyData.boundary_polygon}
              overlaySearch={false}
              onChange={(res) => {
                if (!res) {
                  setPropertyData((prev) => ({ ...prev, boundary_polygon: null }));
                  return;
                }
                const { feature, centroid, areaHectares } = res;
                setPropertyData((prev) => ({
                  ...prev,
                  boundary_polygon: feature,
                  latitude: centroid[1],
                  longitude: centroid[0],
                  size: areaHectares || prev.size
                }));
              }}
            />
            {/* Área removida del UI del mapa para mayor limpieza */}
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
              <Typography variant="body2" color="text.secondary">
                La carga de tours se realiza en Admin &gt; Propiedades.
              </Typography>
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
                {/* Sin tipo fijo en el resumen */}
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
                  <MapView
                    embedded
                    height={160}
                    suppressData
                    disableIntroAnimation
                    initialGeoJsonBoundary={propertyData.boundary_polygon}
                    initialViewState={{
                      longitude: propertyData.longitude ?? -70.6693,
                      latitude: propertyData.latitude ?? -33.4489,
                      zoom: propertyData.longitude != null && propertyData.latitude != null ? 12 : 4
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="glass" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Medios</Typography>
                <Typography variant="body2">Imágenes: {imagePreviews.length}</Typography>
                <Typography variant="body2">Tour: gestión en Admin &gt; Propiedades</Typography>
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
      <Box className="wizard-scope" sx={{ bgcolor: '#fff', minHeight: '100vh', py: { xs: 2, md: 4 } }}>
        <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>Nueva Propiedad</Typography>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.2 }}
              onAnimationComplete={() => {
                if (activeStep === 1) {
                  requestAnimationFrame(() => {
                    boundaryEditorRef.current?.resizeMap();
                    setTimeout(() => boundaryEditorRef.current?.resizeMap(), 120);
                  });
                }
              }}
            >
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
                    const msg = validateBasic();
                    if (msg) { setSnackbar({ open: true, message: msg, severity: 'error' }); return; }
                  }
                  if (activeStep === 1) {
                    if (!propertyData.boundary_polygon) {
                      setSnackbar({ open: true, message: 'Dibuja el polígono de la propiedad en el mapa', severity: 'error' });
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
