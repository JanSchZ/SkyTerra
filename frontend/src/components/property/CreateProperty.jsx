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
  Alert
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyService } from '../../services/api';
import MapView from '../map/MapView';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StraightenIcon from '@mui/icons-material/Straighten';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DescriptionIcon from '@mui/icons-material/Description';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import VisibilityIcon from '@mui/icons-material/Visibility';
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

  const boundariesRef = useRef(null);

  const initialPropertyData = {
    name: '',
    description: '',
    price: 0,
    size: 0,
    propertyType: 'farm',
    hasWater: false,
    hasViews: false,
    address: '',
    city: '',
    state: '',
    country: 'Chile',
    latitude: null,
    longitude: null,
    boundary_polygon: null,
    images: []
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
            boundary_polygon: typeof data.boundary_polygon === 'string' 
                              ? JSON.parse(data.boundary_polygon) 
                              : data.boundary_polygon,
            price: data.price || 0,
            size: data.size || 0,
          });
          if (data.boundary_polygon) {
            const parsedBoundary = typeof data.boundary_polygon === 'string' 
                                   ? JSON.parse(data.boundary_polygon) 
                                   : data.boundary_polygon;
            boundariesRef.current = parsedBoundary;
          }
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

  const steps = ['Información básica', 'Ubicación y límites', 'Revisar y ajustar tamaño', 'Características adicionales', 'Imágenes'];

  const handleInputChange = (field) => (e) => {
    setPropertyData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckboxChange = (field) => (e) => {
    setPropertyData(prev => ({ ...prev, [field]: e.target.checked }));
  };

  const handleNumberChange = (field) => (e) => {
    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
    setPropertyData(prev => ({ ...prev, [field]: value }));
  };

  const handleBoundariesUpdate = (boundaries) => {
    if (boundaries && boundaries.geojson && boundaries.geojson.geometry) {
      setPropertyData(prev => ({
        ...prev,
        latitude: boundaries.center?.[1] ?? prev.latitude,
        longitude: boundaries.center?.[0] ?? prev.longitude,
        size: boundaries.area ? parseFloat(boundaries.area.toFixed(2)) : (prev.size || 0),
        boundary_polygon: boundaries.geojson,
      }));
      setSnackbar({
        open: true,
        message: `Área delimitada: ${boundaries.area?.toFixed(2) || 0} hectáreas`,
        severity: 'success'
      });
    } else if (boundaries === null) {
        setPropertyData(prev => ({
            ...prev,
            latitude: null,
            longitude: null,
            boundary_polygon: null,
        }));
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!propertyData.name || !propertyData.description || propertyData.price <= 0) {
        setSnackbar({ open: true, message: 'Por favor complete todos los campos obligatorios (Nombre, Descripción, Precio).', severity: 'error' });
        return;
      }
    } else if (activeStep === 1) {
      if (!propertyData.boundary_polygon || !propertyData.boundary_polygon.geometry) {
        setSnackbar({ open: true, message: 'Por favor dibuje los límites de la propiedad en el mapa.', severity: 'error' });
        return;
      }
    } else if (activeStep === 2) {
        if (propertyData.size === null || isNaN(propertyData.size) || propertyData.size < 0) {
            setSnackbar({ open: true, message: 'Por favor ingrese un tamaño válido para la propiedad.', severity: 'error' });
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

    if (!propertyData.name || !propertyData.description || !propertyData.boundary_polygon || !propertyData.boundary_polygon.geometry || propertyData.price <= 0 || propertyData.size === null || isNaN(propertyData.size) || propertyData.size < 0) {
      setSnackbar({ open: true, message: 'Faltan datos obligatorios o son inválidos. Revisa todos los pasos.', severity: 'error' });
      setLoading(false);
      return;
    }

    const payload = { ...propertyData };
    if (payload.boundary_polygon && typeof payload.boundary_polygon !== 'string') {
      payload.boundary_polygon = JSON.stringify(payload.boundary_polygon);
    }
    
    if (payload.size === null || isNaN(payload.size)) {
        payload.size = 0;
    }
    payload.size = parseFloat(payload.size);

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
        navigate(`/property/${result.id}`);
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
  
  const handleImageFilesSelected = (selectedFiles) => {
  };

  if (pageLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Cargando datos de la propiedad...</Typography>
      </Container>
    );
  }
  
  if (error && !propertyId) {
      return (
          <Container maxWidth="lg" sx={{ py: 4 }}>
              <Alert severity="error">{error}</Alert>
          </Container>
      );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          borderRadius: 2, 
          backgroundColor: theme.palette.background.paper
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          {propertyId ? 'Editar Propiedad' : 'Crear Nueva Propiedad'}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {propertyId && error && activeStep === 0 && (
             <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {activeStep === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Nombre de la propiedad" name="name" value={propertyData.name} onChange={handleInputChange('name')} variant="outlined" required />
            </Grid>
             <Grid item xs={12} md={4}>
              <TextField fullWidth label="Tipo" name="propertyType" select SelectProps={{ native: true }} value={propertyData.propertyType} onChange={handleInputChange('propertyType')}>
                <option value="farm">Parcela/Granja</option>
                <option value="ranch">Rancho</option>
                <option value="forest">Bosque</option>
                <option value="lake">Terreno con Lago/Río</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Precio (CLP)" name="price" type="number" value={propertyData.price} onChange={handleNumberChange('price')} required InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
             <Grid item xs={12}>
              <TextField fullWidth label="Descripción detallada" name="description" value={propertyData.description} onChange={handleInputChange('description')} multiline rows={4} required />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Box sx={{ height: { xs: 400, md: 500 }, width: '100%', position: 'relative', backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200', mb: 2, borderRadius: 1, overflow: 'hidden' }}>
            <MapView
              editable={true}
              onBoundariesUpdate={handleBoundariesUpdate}
              initialViewState={{
                longitude: parseFloat(propertyData.longitude) || -70.6693,
                latitude: parseFloat(propertyData.latitude) || -33.4489,
                zoom: (propertyData.latitude && propertyData.longitude) ? 14 : 5,
              }}
              initialGeoJsonBoundary={propertyData.boundary_polygon}
            />
          </Box>
        )}
        
        {activeStep === 2 && (
            <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Revisa y ajusta el tamaño calculado.
                </Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                         <TextField
                            fullWidth
                            label="Tamaño (Hectáreas)"
                            name="size"
                            value={propertyData.size}
                            onChange={handleNumberChange('size')}
                            variant="outlined"
                            type="number"
                            required
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ha</InputAdornment>,
                            }}
                            helperText="Este valor se calculó automáticamente a partir del polígono dibujado, pero puedes ajustarlo si es necesario."
                         />
                    </Grid>
                     <Grid item xs={12} sm={6}>
                         <Typography variant="body1">
                             Tamaño calculado: {propertyData.size?.toFixed(2) || '---'} hectáreas
                         </Typography>
                     </Grid>
                </Grid>
            </Box>
        )}

        {activeStep === 3 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Características adicionales
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={propertyData.hasWater} onChange={handleCheckboxChange('hasWater')} name="hasWater" />}
                label="Acceso a agua"
              />
              <FormControlLabel
                control={<Checkbox checked={propertyData.hasViews} onChange={handleCheckboxChange('hasViews')} name="hasViews" />}
                label="Vistas panorámicas"
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 4 && (
          <Box>
            <Typography variant="h6">Imágenes de la Propiedad</Typography>
            <Typography variant="body2" color="textSecondary" sx={{mt:1}}>
                Funcionalidad de carga de imágenes próximamente.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Atrás
          </Button>
          {activeStep < steps.length - 1 && (
            <Button variant="contained" onClick={handleNext}>
              Siguiente
            </Button>
          )}
          {activeStep === steps.length - 1 && (
            <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : (propertyId ? 'Actualizar Propiedad' : 'Guardar Propiedad')}
            </Button>
          )}
        </Box>
        
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(prev => ({...prev, open: false}))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar(prev => ({...prev, open: false}))} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default CreateProperty; 