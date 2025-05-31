import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Grid,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Slider,
  Card,
  CardContent,
  IconButton,
  Divider,
  Stack,
  Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyService } from '../../services/api';
import MapView from '../map/MapView';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StraightenIcon from '@mui/icons-material/Straighten';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DescriptionIcon from '@mui/icons-material/Description';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TerrainIcon from '@mui/icons-material/Terrain';
import EditIcon from '@mui/icons-material/Edit';
import { useTheme } from '@mui/material/styles';

const CreateProperty = ({ editMode = false }) => {
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const initialPropertyData = {
    name: '',
    description: '',
    price: 50000000, // 50M CLP inicial
    size: 10, // 10 hectáreas inicial
    propertyType: 'farm',
    hasWater: false,
    hasViews: false,
    latitude: null,
    longitude: null,
    boundary_polygon: null,
    // Campos adicionales para mejor estructura
    propertyFeatures: [],
    terrain: 'flat',
    access: 'paved',
    utilities: [],
    legalStatus: 'clear',
    publication_status: 'pending'
  };
  const [propertyData, setPropertyData] = useState(initialPropertyData);

  useEffect(() => {
    if (propertyId) {
      setPageLoading(true);
      setError(null);
      propertyService.getPropertyDetails(propertyId)
        .then(data => {
          setPropertyData({
            ...initialPropertyData,
            ...data,
            propertyType: data.type || 'farm',
            boundary_polygon: typeof data.boundary_polygon === 'string' 
                              ? JSON.parse(data.boundary_polygon) 
                              : data.boundary_polygon,
            price: data.price || 50000000,
            size: data.size || 10,
          });
          setPageLoading(false);
        })
        .catch(err => {
          console.error("Error fetching property details:", err);
          setError("No se pudo cargar la información de la propiedad para editar.");
          setSnackbar({ open: true, message: 'Error al cargar datos para editar.', severity: 'error' });
          setPageLoading(false);
        });
    }
  }, [propertyId]);

  const steps = ['Información Básica', 'Ubicación', 'Características', 'Revisar'];

  const handleInputChange = (field) => (e) => {
    setPropertyData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setPropertyData(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const handlePriceChange = (event, newValue) => {
    setPropertyData(prev => ({ ...prev, price: newValue }));
  };

  const handleSizeChange = (event, newValue) => {
    setPropertyData(prev => ({ ...prev, size: newValue }));
  };

  const handleBoundariesUpdate = (boundaries) => {
    if (boundaries && boundaries.geojson && boundaries.geojson.geometry) {
      setPropertyData(prev => ({
        ...prev,
        latitude: boundaries.center?.[1] ?? prev.latitude,
        longitude: boundaries.center?.[0] ?? prev.longitude,
        size: boundaries.area ? parseFloat(boundaries.area.toFixed(2)) : prev.size,
        boundary_polygon: boundaries.geojson,
      }));
      setSnackbar({
        open: true,
        message: `Área delimitada: ${boundaries.area?.toFixed(2) || 0} hectáreas`,
        severity: 'success'
      });
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!propertyData.name || !propertyData.description) {
        setSnackbar({ open: true, message: 'Por favor complete el nombre y descripción.', severity: 'error' });
        return;
      }
    } else if (activeStep === 1) {
      if (!propertyData.latitude || !propertyData.longitude) {
        setSnackbar({ open: true, message: 'Por favor ingresa la latitud y longitud.', severity: 'error' });
        return;
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const payload = { ...propertyData };
    
    // Mapear propertyType a type para el backend
    if (payload.propertyType) {
      payload.type = payload.propertyType;
      delete payload.propertyType;
    }
    
    if (payload.boundary_polygon && typeof payload.boundary_polygon !== 'string') {
      payload.boundary_polygon = JSON.stringify(payload.boundary_polygon);
    }

    // Asegurar publication_status
    if (!payload.publication_status) {
      payload.publication_status = 'pending';
    }

    try {
      let result;
      if (propertyId) {
        result = await propertyService.updateProperty(propertyId, payload);
        setSnackbar({ open: true, message: 'Propiedad actualizada exitosamente', severity: 'success' });
      } else {
        result = await propertyService.createProperty(payload);
        setSnackbar({ open: true, message: 'Propiedad creada exitosamente', severity: 'success' });
      }
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Error guardando la propiedad:', err.response?.data || err.message);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Error al guardar. Intente nuevamente.';
      setError(errorMsg);
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value?.toLocaleString()}`;
  };

  if (pageLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default // Theme
      }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
        <Typography sx={{ ml: 2, color: theme.palette.text.primary }}>Cargando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: theme.palette.background.default, // Theme
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mr: 2, 
              color: theme.palette.text.primary, // Theme
              backgroundColor: theme.palette.action.hover, // Theme
              '&:hover': { backgroundColor: theme.palette.action.selected } // Theme
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 300 }}> {/* Theme */}
            {propertyId ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 3, // Keep custom, or use theme.shape.borderRadius * N
            backgroundColor: theme.palette.background.paper, // Updated from rgba
            backdropFilter: 'blur(20px)', // Keep if desired
            border: `1px solid ${theme.palette.divider}`, // Updated from rgba
          }}
        >
          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  '& .MuiStepLabel-label': { color: theme.palette.text.secondary },
                  '& .MuiStepLabel-label.Mui-active': { color: theme.palette.primary.main },
                  '& .MuiStepLabel-label.Mui-completed': { color: theme.palette.success.main },
                  '& .MuiStepIcon-root.Mui-active': { color: theme.palette.primary.main },
                  '& .MuiStepIcon-root.Mui-completed': { color: theme.palette.success.main }
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          {activeStep === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 400, mb: 3 }}>Información Principal</Typography>
              <Grid container spacing={3}>
                <Grid xs={12}>
                  <TextField
                    label="Nombre de la Propiedad"
                    fullWidth
                    value={propertyData.name}
                    onChange={handleInputChange('name')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HomeWorkIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                    }}
                    // sx removed to use global MuiTextField theme
                  />
                </Grid>
                <Grid xs={12}>
                  <TextField
                    label="Descripción"
                    fullWidth
                    multiline
                    rows={4}
                    value={propertyData.description}
                    onChange={handleInputChange('description')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DescriptionIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                    }}
                    // sx removed
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography gutterBottom sx={{ color: theme.palette.text.secondary }}>Precio (CLP)</Typography>
                  <Slider
                    value={propertyData.price}
                    onChange={handlePriceChange}
                    min={10000000}
                    max={1000000000}
                    step={5000000}
                    color="primary" // Use theme color
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>$10M</Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>$1B</Typography>
                  </Box>
                </Grid>
                <Grid xs={12} md={6}>
                  <Typography gutterBottom sx={{ color: theme.palette.text.secondary }}>Tamaño (Hectáreas)</Typography>
                  <Slider
                    value={propertyData.size}
                    onChange={handleSizeChange}
                    min={0.1}
                    max={1000}
                    step={0.1}
                    sx={{ color: theme.palette.success.main }} // Use theme success color
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>0.1 ha</Typography>
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>1,000 ha</Typography>
                  </Box>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    fullWidth // Added for consistency
                    label="Tipo de propiedad"
                    value={propertyData.propertyType}
                    onChange={handleInputChange('propertyType')}
                    // sx removed
                  >
                    <MenuItem value="farm">Parcela/Granja</MenuItem>
                    <MenuItem value="ranch">Rancho</MenuItem>
                    <MenuItem value="forest">Bosque</MenuItem>
                    <MenuItem value="lake">Terreno con Lago</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Checkbox checked={propertyData.hasWater} onChange={handleCheckboxChange('hasWater')} color="primary" />} // Theme color
                    label="Acceso a agua"
                    sx={{ '& .MuiFormControlLabel-label': { color: theme.palette.text.primary } }} // Theme
                  />
                </Grid>
                <Grid xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={<Checkbox checked={propertyData.hasViews} onChange={handleCheckboxChange('hasViews')} color="primary" />} // Theme color
                    label="Vistas panorámicas"
                    sx={{ '& .MuiFormControlLabel-label': { color: theme.palette.text.primary } }} // Theme
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 400, mb: 2 }}>
                Ubicación de la Propiedad
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                Ingresa la latitud y longitud de la propiedad. Puedes obtener tu ubicación actual automáticamente.
              </Typography>
              <Grid container spacing={3} sx={{ mb: 3, maxWidth: 600 }}>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Latitud"
                    fullWidth
                    value={propertyData.latitude || ''}
                    onChange={handleInputChange('latitude')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                    }}
                    // sx removed
                  />
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    label="Longitud"
                    fullWidth
                    value={propertyData.longitude || ''}
                    onChange={handleInputChange('longitude')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                    }}
                    // sx removed
                  />
                </Grid>
                <Grid xs={12}>
                  <Button
                    variant="outlined"
                    color="primary" // Theme color
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setPropertyData(prev => ({
                              ...prev,
                              latitude: position.coords.latitude.toFixed(6),
                              longitude: position.coords.longitude.toFixed(6)
                            }));
                            setSnackbar({ open: true, message: 'Ubicación obtenida correctamente.', severity: 'success' });
                          },
                          () => setSnackbar({ open: true, message: 'No se pudo obtener la ubicación.', severity: 'error' })
                        );
                      } else {
                        setSnackbar({ open: true, message: 'Geolocalización no soportada.', severity: 'warning' });
                      }
                    }}
                    sx={{ mt: 1 }} // Keep margin
                  >
                    Obtener mi ubicación
                  </Button>
                </Grid>
              </Grid>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Podrás ajustar la ubicación y límites exactos más adelante desde el panel de administración.
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 400, mb: 3 }}>Detalles Adicionales y Características</Typography>
              <Grid container spacing={3}>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    fullWidth // Added
                    label="Estado Legal (ej: saneado, con hipoteca)"
                    value={propertyData.legalStatus}
                    onChange={handleInputChange('legalStatus')}
                    // sx removed
                  >
                    <MenuItem value="clear">Saneado</MenuItem>
                    <MenuItem value="mortgaged">Con hipoteca</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    fullWidth // Added
                    label="Acceso"
                    value={propertyData.access}
                    onChange={handleInputChange('access')}
                    // sx removed
                  >
                    <MenuItem value="paved">Pavimentado</MenuItem>
                    <MenuItem value="unpaved">No pavimentado</MenuItem>
                  </TextField>
                </Grid>
                <Grid xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary, mt: 2, mb: 1, fontWeight: 300 }}>Servicios Disponibles</Typography>
                  <Grid container spacing={1}>
                    {['water', 'electricity', 'internet', 'phone', 'septic_tank', 'well_water'].map(utility => (
                      <Grid xs={6} sm={4} md={3} key={utility}>
                        <FormControlLabel
                          control={<Checkbox
                            color="primary" // Theme
                            checked={propertyData.utilities?.includes(utility)}
                            onChange={() => {
                              const currentUtilities = propertyData.utilities || [];
                              if (currentUtilities.includes(utility)) {
                                setPropertyData(prev => ({
                                  ...prev,
                                  utilities: currentUtilities.filter((u) => u !== utility)
                                }));
                              } else {
                                setPropertyData(prev => ({
                                  ...prev,
                                  utilities: [...currentUtilities, utility]
                                }));
                              }
                            }}
                          />}
                          label={utility.charAt(0).toUpperCase() + utility.slice(1).replace('_', ' ')}
                          sx={{ '& .MuiFormControlLabel-label': { color: theme.palette.text.primary, fontSize: '0.9rem' } }} // Theme
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
                <Grid xs={12} md={6}>
                  <TextField
                    select
                    fullWidth // Added
                    label="Terreno"
                    value={propertyData.terrain}
                    onChange={handleInputChange('terrain')}
                    // sx removed
                  >
                    <MenuItem value="flat">Plano</MenuItem>
                    <MenuItem value="hills">Colinas</MenuItem>
                    <MenuItem value="mountains">Montañoso</MenuItem>
                    <MenuItem value="mixed">Mixto</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: theme.palette.text.primary, fontWeight: 400, mb: 3 }}>Revisar y Guardar</Typography>
              
              {/* Información Principal Card */}
              <Card sx={{ mb: 3, backgroundColor: alpha(theme.palette.background.paper, 0.7), p: 2.5, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.light }}>Información Principal</Typography>
                    <IconButton size="small" onClick={() => setActiveStep(0)} sx={{ color: theme.palette.text.secondary }} aria-label="Editar Información Principal">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={1.5} sx={{ color: theme.palette.text.primary }}>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Nombre:</strong> {propertyData.name || 'No especificado'}</Typography></Grid>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Tipo:</strong> {propertyData.propertyType ? propertyData.propertyType.charAt(0).toUpperCase() + propertyData.propertyType.slice(1) : 'No especificado'}</Typography></Grid>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Precio:</strong> {formatPrice(propertyData.price)}</Typography></Grid>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Tamaño:</strong> {propertyData.size || '0'} ha</Typography></Grid>
                    <Grid xs={12} sx={{mt: 1}}><Typography variant="body2" sx={{wordBreak: 'break-word'}}><strong>Descripción:</strong> {propertyData.description || 'No especificada'}</Typography></Grid>
                    <Grid xs={12} sm={6} sx={{mt: 1}}><Typography variant="body2"><strong>Acceso a Agua:</strong> {propertyData.hasWater ? 'Sí' : 'No'}</Typography></Grid>
                    <Grid xs={12} sm={6} sx={{mt: 1}}><Typography variant="body2"><strong>Vistas Panorámicas:</strong> {propertyData.hasViews ? 'Sí' : 'No'}</Typography></Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Ubicación Card */}
              <Card sx={{ mb: 3, backgroundColor: alpha(theme.palette.background.paper, 0.7), p: 2.5, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.light }}>Ubicación</Typography>
                    <IconButton size="small" onClick={() => setActiveStep(1)} sx={{ color: theme.palette.text.secondary }} aria-label="Editar Ubicación">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={1.5} sx={{ color: theme.palette.text.primary }}>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Latitud:</strong> {propertyData.latitude || 'No especificada'}</Typography></Grid>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Longitud:</strong> {propertyData.longitude || 'No especificada'}</Typography></Grid>
                    <Grid xs={12} sx={{mt: 1}}><Typography variant="body2"><strong>Límites (GeoJSON):</strong> {propertyData.boundary_polygon ? 'Definidos' : 'No definidos'}</Typography></Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Características Adicionales Card */}
              <Card sx={{ backgroundColor: alpha(theme.palette.background.paper, 0.7), p: 2.5, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: theme.palette.primary.light }}>Características Adicionales</Typography>
                    <IconButton size="small" onClick={() => setActiveStep(2)} sx={{ color: theme.palette.text.secondary }} aria-label="Editar Características Adicionales">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={1.5} sx={{ color: theme.palette.text.primary }}>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Terreno:</strong> {propertyData.terrain ? propertyData.terrain.charAt(0).toUpperCase() + propertyData.terrain.slice(1) : 'No especificado'}</Typography></Grid>
                    <Grid xs={12} sm={6}><Typography variant="body2"><strong>Acceso:</strong> {propertyData.access ? propertyData.access.charAt(0).toUpperCase() + propertyData.access.slice(1) : 'No especificado'}</Typography></Grid>
                    <Grid xs={12} sx={{mt: 1}}><Typography variant="body2"><strong>Servicios:</strong> {propertyData.utilities && propertyData.utilities.length > 0 ? propertyData.utilities.map(u => u.charAt(0).toUpperCase() + u.slice(1).replace('_', ' ')).join(', ') : 'Ninguno especificado'}</Typography></Grid>
                    <Grid xs={12} sm={6} sx={{mt: 1}}><Typography variant="body2"><strong>Estado Legal:</strong> {propertyData.legalStatus ? propertyData.legalStatus.charAt(0).toUpperCase() + propertyData.legalStatus.slice(1) : 'No especificado'}</Typography></Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button 
              disabled={activeStep === 0} 
              onClick={handleBack}
              sx={{ color: theme.palette.text.secondary }} // Theme
            >
              Atrás
            </Button>
            {activeStep < steps.length - 1 && (
              <Button 
                variant="contained" 
                color="primary" // Theme
                onClick={handleNext}
                // sx removed for primary contained button
              >
                Siguiente
              </Button>
            )}
            {activeStep === steps.length - 1 && (
              <Button 
                variant="contained" 
                onClick={handleSubmit} 
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                sx={{  // Using success colors directly
                  backgroundColor: theme.palette.success.main,
                  '&:hover': { backgroundColor: theme.palette.success.dark }
                }}
              >
                {loading ? 'Guardando...' : (propertyId ? 'Actualizar' : 'Crear Propiedad')}
              </Button>
            )}
          </Box>
        </Paper>
        
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={() => setSnackbar(prev => ({...prev, open: false}))}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({...prev, open: false}))} 
            severity={snackbar.severity}
            // MuiAlert is already styled by theme overrides
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CreateProperty; 