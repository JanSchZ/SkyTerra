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
    legalStatus: 'clear'
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
      if (!propertyData.boundary_polygon) {
        setSnackbar({ open: true, message: 'Por favor marque la ubicación en el mapa.', severity: 'error' });
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
        backgroundColor: '#0d1117'
      }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
        <Typography sx={{ ml: 2, color: 'white' }}>Cargando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0d1117',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mr: 2, 
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 300 }}>
            {propertyId ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(30, 41, 59, 0.3)',
          }}
        >
          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  '& .MuiStepLabel-label': { color: '#8b949e' },
                  '& .MuiStepLabel-label.Mui-active': { color: '#3b82f6' },
                  '& .MuiStepLabel-label.Mui-completed': { color: '#10b981' }
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          {activeStep === 0 && (
            <Stack spacing={4}>
              <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2 }}>
                Información Básica
              </Typography>
              
                             <Grid container spacing={3}>
                 <Grid item xs={12} md={8}>
                  <TextField 
                    fullWidth 
                    label="Nombre de la propiedad" 
                    value={propertyData.name} 
                    onChange={handleInputChange('name')} 
                    required
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  />
                </Grid>
                                 <Grid item xs={12} md={4}>
                  <TextField 
                    fullWidth 
                    select 
                    label="Tipo de propiedad" 
                    value={propertyData.propertyType} 
                    onChange={handleInputChange('propertyType')}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  >
                    <MenuItem value="farm">Parcela/Granja</MenuItem>
                    <MenuItem value="ranch">Rancho</MenuItem>
                    <MenuItem value="forest">Bosque</MenuItem>
                    <MenuItem value="lake">Terreno con Lago</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="h6" sx={{ color: '#c9d1d9', mb: 2 }}>
                  Precio (CLP)
                </Typography>
                <Card sx={{ p: 3, backgroundColor: 'rgba(13, 17, 23, 0.8)', border: '1px solid #30363d' }}>
                  <Typography variant="h4" sx={{ color: '#3b82f6', mb: 2, textAlign: 'center' }}>
                    {formatPrice(propertyData.price)}
                  </Typography>
                  <Slider
                    value={propertyData.price}
                    onChange={handlePriceChange}
                    min={10000000} // 10M
                    max={1000000000} // 1B
                    step={5000000} // 5M
                    sx={{
                      color: '#3b82f6',
                      '& .MuiSlider-track': { backgroundColor: '#3b82f6' },
                      '& .MuiSlider-thumb': { 
                        backgroundColor: '#3b82f6',
                        '&:hover': { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.16)' }
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#8b949e' }}>$10M</Typography>
                    <Typography variant="caption" sx={{ color: '#8b949e' }}>$1B</Typography>
                  </Box>
                </Card>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ color: '#c9d1d9', mb: 2 }}>
                  Tamaño (Hectáreas)
                </Typography>
                <Card sx={{ p: 3, backgroundColor: 'rgba(13, 17, 23, 0.8)', border: '1px solid #30363d' }}>
                  <Typography variant="h4" sx={{ color: '#10b981', mb: 2, textAlign: 'center' }}>
                    {propertyData.size.toFixed(1)} ha
                  </Typography>
                  <Slider
                    value={propertyData.size}
                    onChange={handleSizeChange}
                    min={0.1}
                    max={1000}
                    step={0.1}
                    sx={{
                      color: '#10b981',
                      '& .MuiSlider-track': { backgroundColor: '#10b981' },
                      '& .MuiSlider-thumb': { 
                        backgroundColor: '#10b981',
                        '&:hover': { boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.16)' }
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#8b949e' }}>0.1 ha</Typography>
                    <Typography variant="caption" sx={{ color: '#8b949e' }}>1,000 ha</Typography>
                  </Box>
                </Card>
              </Box>

              <TextField 
                fullWidth 
                multiline 
                rows={4}
                label="Descripción de la propiedad" 
                value={propertyData.description} 
                onChange={handleInputChange('description')} 
                required
                sx={{ 
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiOutlinedInput-root': { 
                    color: '#c9d1d9',
                    '& fieldset': { borderColor: '#30363d' }
                  }
                }}
              />
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={4}>
              <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2 }}>
                Ubicación y Límites
              </Typography>
              
              <Typography variant="body1" sx={{ color: '#8b949e' }}>
                Usa las herramientas del mapa para marcar la ubicación y delimitar tu propiedad.
              </Typography>

              <Box sx={{ 
                height: 500, 
                width: '100%', 
                borderRadius: 2, 
                overflow: 'hidden',
                border: '1px solid #30363d'
              }}>
                <MapView
                  editable={true}
                  onBoundariesUpdate={handleBoundariesUpdate}
                  initialViewState={{
                    longitude: parseFloat(propertyData.longitude) || -70.6693,
                    latitude: parseFloat(propertyData.latitude) || -33.4489,
                    zoom: 10,
                  }}
                  initialGeoJsonBoundary={propertyData.boundary_polygon}
                />
              </Box>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={4}>
              <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2 }}>
                Características
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, backgroundColor: 'rgba(13, 17, 23, 0.8)', border: '1px solid #30363d' }}>
                    <Typography variant="h6" sx={{ color: '#c9d1d9', mb: 2 }}>
                      Recursos Naturales
                    </Typography>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={<Checkbox checked={propertyData.hasWater} onChange={handleCheckboxChange('hasWater')} />}
                        label="Acceso a agua"
                        sx={{ '& .MuiFormControlLabel-label': { color: '#c9d1d9' } }}
                      />
                      <FormControlLabel
                        control={<Checkbox checked={propertyData.hasViews} onChange={handleCheckboxChange('hasViews')} />}
                        label="Vistas panorámicas"
                        sx={{ '& .MuiFormControlLabel-label': { color: '#c9d1d9' } }}
                      />
                    </Stack>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, backgroundColor: 'rgba(13, 17, 23, 0.8)', border: '1px solid #30363d' }}>
                    <Typography variant="h6" sx={{ color: '#c9d1d9', mb: 2 }}>
                      Tipo de Terreno
                    </Typography>
                    <TextField 
                      fullWidth 
                      select 
                      value={propertyData.terrain} 
                      onChange={handleInputChange('terrain')}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          color: '#c9d1d9',
                          '& fieldset': { borderColor: '#30363d' }
                        }
                      }}
                    >
                      <MenuItem value="flat">Plano</MenuItem>
                      <MenuItem value="hills">Colinas</MenuItem>
                      <MenuItem value="mountains">Montañoso</MenuItem>
                      <MenuItem value="mixed">Mixto</MenuItem>
                    </TextField>
                  </Card>
                </Grid>
              </Grid>
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={4}>
              <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2 }}>
                Revisar Información
              </Typography>

              <Card sx={{ p: 3, backgroundColor: 'rgba(13, 17, 23, 0.8)', border: '1px solid #30363d' }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ color: '#3b82f6', mb: 2 }}>
                      {propertyData.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#8b949e', mb: 2 }}>
                      {propertyData.description}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip label={propertyData.propertyType} size="small" />
                      {propertyData.hasWater && <Chip label="Con agua" size="small" color="primary" />}
                      {propertyData.hasViews && <Chip label="Con vistas" size="small" color="secondary" />}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h4" sx={{ color: '#3b82f6', mb: 1 }}>
                      {formatPrice(propertyData.price)}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#10b981' }}>
                      {propertyData.size.toFixed(1)} hectáreas
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Stack>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button 
              disabled={activeStep === 0} 
              onClick={handleBack}
              sx={{ color: '#8b949e' }}
            >
              Atrás
            </Button>
            {activeStep < steps.length - 1 && (
              <Button 
                variant="contained" 
                onClick={handleNext}
                sx={{ 
                  backgroundColor: '#3b82f6',
                  '&:hover': { backgroundColor: '#2563eb' }
                }}
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
                sx={{ 
                  backgroundColor: '#10b981',
                  '&:hover': { backgroundColor: '#059669' }
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
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CreateProperty; 