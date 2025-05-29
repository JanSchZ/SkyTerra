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
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#e0e0e0', fontWeight: 400, mb: 3 }}>Información Principal</Typography>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <TextField
                    label="Nombre de la Propiedad"
                    fullWidth
                    value={propertyData.name}
                    onChange={handleInputChange('name')}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HomeWorkIcon sx={{ color: '#8b949e' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  />
                </Grid>
                <Grid size={12}>
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
                          <DescriptionIcon sx={{ color: '#8b949e' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom sx={{ color: '#8b949e' }}>Precio (CLP)</Typography>
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
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom sx={{ color: '#8b949e' }}>Tamaño (Hectáreas)</Typography>
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
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Tipo de propiedad"
                    value={propertyData.propertyType}
                    onChange={handleInputChange('propertyType')}
                    sx={{ 
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Tipo de Terreno"
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
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControlLabel
                    control={<Checkbox checked={propertyData.hasWater} onChange={handleCheckboxChange('hasWater')} sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#10b981' } }} />}
                    label="Acceso a agua"
                    sx={{ '& .MuiFormControlLabel-label': { color: '#c9d1d9' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControlLabel
                    control={<Checkbox checked={propertyData.hasViews} onChange={handleCheckboxChange('hasViews')} sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#10b981' } }} />}
                    label="Vistas panorámicas"
                    sx={{ '& .MuiFormControlLabel-label': { color: '#c9d1d9' } }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#e0e0e0', fontWeight: 400, mb: 2 }}>
                Ubicación de la Propiedad
              </Typography>
              <Typography variant="body2" sx={{ color: '#8b949e', mb: 3 }}>
                Ingresa la latitud y longitud de la propiedad. Puedes obtener tu ubicación actual automáticamente.
              </Typography>
              <Grid container spacing={3} sx={{ mb: 3, maxWidth: 600 }}>
                <Grid size={12}>
                  <TextField
                    label="Latitud"
                    fullWidth
                    value={propertyData.latitude || ''}
                    onChange={handleInputChange('latitude')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon sx={{ color: '#8b949e' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Longitud"
                    fullWidth
                    value={propertyData.longitude || ''}
                    onChange={handleInputChange('longitude')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon sx={{ color: '#8b949e' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      '& .MuiInputLabel-root': { color: '#8b949e' },
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <Button
                    variant="outlined"
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
                    sx={{ mt: 1, color: '#3b82f6', borderColor: '#3b82f6' }}
                  >
                    Obtener mi ubicación
                  </Button>
                </Grid>
              </Grid>
              <Typography variant="caption" sx={{ color: '#8b949e' }}>
                Podrás ajustar la ubicación y límites exactos más adelante desde el panel de administración.
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#c9d1d9' }}>Detalles Adicionales</Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Estado Legal (ej: saneado, con hipoteca)"
                    value={propertyData.legalStatus}
                    onChange={handleInputChange('legalStatus')}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  >
                    <MenuItem value="clear">Saneado</MenuItem>
                    <MenuItem value="mortgaged">Con hipoteca</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Acceso"
                    value={propertyData.access}
                    onChange={handleInputChange('access')}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  >
                    <MenuItem value="paved">Pavimentado</MenuItem>
                    <MenuItem value="unpaved">No pavimentado</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Servicios"
                    SelectProps={{
                      multiple: true,
                      value: propertyData.utilities,
                      onChange: (e) => {
                        const value = e.target.value;
                        setPropertyData(prev => ({ ...prev, utilities: typeof value === 'string' ? value.split(',') : value }));
                      },
                      renderValue: (selected) =>
                        selected.length === 0 ? 'Ninguno' : selected.map(val => {
                          switch(val) {
                            case 'water': return 'Agua';
                            case 'electricity': return 'Electricidad';
                            case 'internet': return 'Internet';
                            case 'phone': return 'Teléfono';
                            default: return val;
                          }
                        }).join(', ')
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#c9d1d9',
                        '& fieldset': { borderColor: '#30363d' }
                      }
                    }}
                  >
                    <MenuItem value="water">Agua</MenuItem>
                    <MenuItem value="electricity">Electricidad</MenuItem>
                    <MenuItem value="internet">Internet</MenuItem>
                    <MenuItem value="phone">Teléfono</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Terreno"
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
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 3 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ color: '#e0e0e0', fontWeight: 400, mb: 3 }}>Revisar y Guardar</Typography>
              <Grid container spacing={2} sx={{ color: '#c9d1d9' }}>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Nombre:</strong> {propertyData.name}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Tipo:</strong> {propertyData.propertyType}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Precio:</strong> {formatPrice(propertyData.price)}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Tamaño:</strong> {propertyData.size} ha</Typography></Grid>
                <Grid size={12}><Typography><strong>Descripción:</strong> {propertyData.description}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Agua:</strong> {propertyData.hasWater ? 'Sí' : 'No'}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Vistas:</strong> {propertyData.hasViews ? 'Sí' : 'No'}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Latitud:</strong> {propertyData.latitude || 'No especificada'}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Longitud:</strong> {propertyData.longitude || 'No especificada'}</Typography></Grid>
                <Grid size={12}><Typography><strong>Límites (GeoJSON):</strong> {propertyData.boundary_polygon ? 'Definidos' : 'No definidos'}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Terreno:</strong> {propertyData.terrain}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Acceso:</strong> {propertyData.access}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Servicios:</strong> {propertyData.utilities?.join(', ') || 'Ninguno'}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography><strong>Estado Legal:</strong> {propertyData.legalStatus}</Typography></Grid>
              </Grid>
            </Box>
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