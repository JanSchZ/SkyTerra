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
  Chip,
  useMediaQuery
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyService } from '../../services/api';
import MapView from '../map/MapView';
import PropertyBoundaryDraw from '../map/PropertyBoundaryDraw';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
import * as turf from '@turf/turf';

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
    price: 50000000,
    size: 10, // Este 'size' se actualizará con el área dibujada si es posible
    propertyType: 'farm',
    hasWater: false,
    hasViews: false,
    latitude: null, // Se actualizará con el centro del polígono
    longitude: null, // Se actualizará con el centro del polígono
    boundary_polygon: null, // Almacenará el GeoJSON Feature del polígono
    propertyFeatures: [],
    terrain: 'flat',
    access: 'paved',
    utilities: [],
    legalStatus: 'clear'
  };
  const [propertyData, setPropertyData] = useState(initialPropertyData);

  // Estados para el mapa y dibujo
  const mapInstanceRef = useRef(null); // Para la instancia del mapa de MapView
  const boundaryDrawRef = useRef(null); // Ref para PropertyBoundaryDraw
  const [drawAreaInHectares, setDrawAreaInHectares] = useState(0);
  const [isDrawingOrEditingMap, setIsDrawingOrEditingMap] = useState(false);
  const [hasDefinedPolygon, setHasDefinedPolygon] = useState(false);
  const [limitsConfirmed, setLimitsConfirmed] = useState(false);


  useEffect(() => {
    if (propertyId) {
      setPageLoading(true);
      setError(null);
      propertyService.getPropertyDetails(propertyId)
        .then(data => {
          const initialPolygon = typeof data.boundary_polygon === 'string'
                               ? JSON.parse(data.boundary_polygon)
                               : data.boundary_polygon;
          setPropertyData({
            ...initialPropertyData,
            ...data,
            propertyType: data.type || 'farm',
            boundary_polygon: initialPolygon, // Debe ser un GeoJSON Feature
            price: data.price || 50000000,
            size: data.size || 10,
          });
          if (initialPolygon && initialPolygon.geometry) {
            setHasDefinedPolygon(true);
            // Si hay polígono inicial, se asume que los límites están "confirmados" para edición.
            // O podrías requerir una nueva confirmación. Por ahora, lo marcamos como confirmado.
            setLimitsConfirmed(true); 
            // Calcular área inicial si existe polígono
            if (turf && initialPolygon.geometry.type === 'Polygon') {
                try {
                    const areaM2 = turf.area(initialPolygon);
                    setDrawAreaInHectares(areaM2 / 10000);
                } catch(e) {
                    console.error("Error calculating initial area with turf:", e);
                }
            }
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

  const steps = ['Información Básica', 'Ubicación y Límites', 'Características', 'Revisar'];

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
    // Este slider de tamaño podría ser menos relevante si el área se toma del mapa.
    // O podría ser un valor de referencia si no se dibuja el polígono.
    setPropertyData(prev => ({ ...prev, size: newValue }));
  };

  // Callback para cuando MapView carga el mapa
  const handleMapLoad = (map) => {
    mapInstanceRef.current = map;
    console.log("Mapa cargado en modo editable:", map);
    
    // Si tenemos límites existentes pero no confirmados, confirmarlos automáticamente
    // solo para propiedades existentes en modo edición
    if (map && propertyId && propertyData.boundary_polygon && !limitsConfirmed) {
      setTimeout(() => setLimitsConfirmed(true), 500);
    }
  };
  
  // Callback para actualizaciones desde PropertyBoundaryDraw
  const handleDrawingUpdate = (data) => {
    // data = { area, center, geojsonFeature, mode, isDrawingOrEditing, hasExistingPolygon }
    setDrawAreaInHectares(data.area || 0);
    setIsDrawingOrEditingMap(data.isDrawingOrEditing || false);
    setHasDefinedPolygon(data.hasExistingPolygon || false);
    setLimitsConfirmed(false); // Requiere nueva confirmación tras cualquier cambio

    if (data.geojsonFeature) {
      setPropertyData(prev => ({
        ...prev,
        boundary_polygon: data.geojsonFeature, // Guardar la Feature completa
        latitude: data.center?.[1] ?? prev.latitude,
        longitude: data.center?.[0] ?? prev.longitude,
        size: data.area ? parseFloat(data.area.toFixed(2)) : prev.size, // Actualizar tamaño
      }));
    } else {
      setPropertyData(prev => ({
        ...prev,
        boundary_polygon: null,
        // No resetear lat/lng aquí, podrían venir de una búsqueda previa
      }));
    }
  };

  const handleStartOrModifyDrawing = () => {
    if (boundaryDrawRef.current) {
      boundaryDrawRef.current.startDrawing();
      setIsDrawingOrEditingMap(true); // Asumir que entra en modo de edición
      setLimitsConfirmed(false);
    }
  };

  const handleDeleteDrawing = () => {
    if (boundaryDrawRef.current) {
      boundaryDrawRef.current.deleteAll();
      setLimitsConfirmed(false);
      // PropertyBoundaryDraw llamará a onBoundariesUpdate, que actualizará los estados.
    }
  };

  const handleConfirmLimits = () => {
    if (hasDefinedPolygon) {
      setLimitsConfirmed(true);
      setIsDrawingOrEditingMap(false); // Salir del modo de edición explícitamente
      // Opcional: cambiar modo de mapbox-gl-draw a simple_select
      if (mapInstanceRef.current && boundaryDrawRef.current) {
        // Esta es una forma de acceder al control de dibujo si PropertyBoundaryDraw no expone changeMode
         const drawControl = mapInstanceRef.current._controls.find(ctrl => ctrl instanceof MapboxDraw);
         if (drawControl) {
            drawControl.changeMode('simple_select');
         }
      }
      setSnackbar({ open: true, message: 'Límites confirmados. Puedes continuar.', severity: 'success' });
    } else {
      setSnackbar({ open: true, message: 'No hay un polígono definido para confirmar.', severity: 'warning' });
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
        setSnackbar({ open: true, message: 'Por favor, dibuja y confirma los límites de la propiedad en el mapa.', severity: 'error' });
        return;
      }
      if (!limitsConfirmed) {
        setSnackbar({ open: true, message: 'Debes confirmar los límites del terreno antes de continuar.', severity: 'warning' });
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
      backgroundColor: theme.palette.background.default,
      py: 4,
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, flexShrink: 0 }}>
          <IconButton 
            onClick={() => navigate(editMode ? `/property/${propertyId}` : '/dashboard')}
            sx={{ 
              mr: 2, 
              color: theme.palette.text.primary,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: theme.palette.text.primary, fontWeight: 300 }}>
            {editMode ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 3,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            overflow: 'hidden' // Important: Parent handles overflow, children define their scroll behavior
          }}
        >
          <Stepper activeStep={activeStep} sx={{ mb: 4, flexShrink: 0 }} alternativeLabel={useMediaQuery(theme.breakpoints.down('sm'))}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  '& .MuiStepLabel-label': { color: theme.palette.text.secondary },
                  '& .MuiStepLabel-label.Mui-active': { color: theme.palette.primary.main },
                  '& .MuiStepLabel-label.Mui-completed': { color: theme.palette.success.main }
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content Area - This Box will manage its own scrolling if content overflows */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Step 0: Información Básica */}
            {activeStep === 0 && (
              <Stack spacing={3} sx={{ width: '100%' }}> {/* Ensure Stack takes full width */}
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, mb: 2 }}>
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
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField 
                      fullWidth 
                      select 
                      label="Tipo de propiedad" 
                      value={propertyData.propertyType} 
                      onChange={handleInputChange('propertyType')}
                    >
                      <MenuItem value="farm">Parcela/Granja</MenuItem>
                      <MenuItem value="ranch">Rancho</MenuItem>
                      <MenuItem value="forest">Bosque</MenuItem>
                      <MenuItem value="lake">Terreno con Lago</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 1 }}>
                    Precio (CLP)
                  </Typography>
                  <Card sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h4" sx={{ color: theme.palette.primary.main, mb: 2, textAlign: 'center', fontWeight: 'medium' }}>
                      {formatPrice(propertyData.price)}
                    </Typography>
                    <Slider
                      value={propertyData.price}
                      onChange={handlePriceChange}
                      min={10000000} max={1000000000} step={5000000}
                      sx={{ color: theme.palette.primary.main }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>$10M</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>$1B</Typography>
                    </Box>
                  </Card>
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 1 }}>
                    Tamaño de Referencia (Hectáreas)
                  </Typography>
                   <Card sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h4" sx={{ color: theme.palette.primary.main, mb: 2, textAlign: 'center', fontWeight: 'medium' }}>
                      {propertyData.size.toFixed(1)} ha
                    </Typography>
                    <Slider
                      value={propertyData.size}
                      onChange={handleSizeChange}
                      min={0.1} max={1000} step={0.1}
                      sx={{ color: theme.palette.primary.main }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>0.1 ha</Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>1,000 ha</Typography>
                    </Box>
                  </Card>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display:'block', mt:1 }}>
                    El tamaño final se calculará del polígono dibujado en el mapa si se define uno.
                  </Typography>
                </Box>

                <TextField 
                  fullWidth 
                  multiline 
                  rows={4}
                  label="Descripción de la propiedad" 
                  value={propertyData.description} 
                  onChange={handleInputChange('description')} 
                  required
                />
              </Stack>
            )}

            {/* Step 1: Ubicación y Límites */}
            {activeStep === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 /* Allow this step to grow */ }}>
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, mb: 2, flexShrink: 0 }}>
                  Ubicación y Límites del Terreno
                </Typography>
                
                {/* Map Container - Allow it to take available space but not push controls out */}
                <Box sx={{ 
                  height: 'clamp(300px, 45vh, 550px)', // Adjusted height range
                  width: '100%', 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  border: `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                  mb: 2,
                  flexShrink: 0 // Prevent map from shrinking too much, but allow some flex
                }}>
                  <MapView
                    editable={true}
                    onLoad={handleMapLoad}
                    initialViewState={{
                      longitude: parseFloat(propertyData.longitude) || -70.6693, 
                      latitude: parseFloat(propertyData.latitude) || -33.4489,
                      zoom: propertyData.boundary_polygon ? 15 : 5, 
                      pitch: 0 
                    }}
                  />
                  {mapInstanceRef.current && (
                    <PropertyBoundaryDraw 
                      ref={boundaryDrawRef}
                      map={mapInstanceRef.current} 
                      onBoundariesUpdate={handleDrawingUpdate}
                      existingBoundaries={propertyData.boundary_polygon}
                    />
                  )}
                </Box>

                {/* Controls Panel */}
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    width: '100%',
                    flexShrink: 0 // Panel should not shrink
                }}>
                  <Grid container spacing={3} alignItems="flex-start">
                    <Grid item xs={12} md={7}>
                      <Typography variant="h6" fontWeight="medium" sx={{color: theme.palette.text.primary, mb: 0.5 }}>
                        Definición de Límites
                      </Typography>
                      <Typography variant="body1" sx={{ color: theme.palette.text.primary, mt: 1, display: 'flex', alignItems: 'center' }}>
                        <StraightenIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                        Área seleccionada: 
                        <Typography component="span" fontWeight="bold" color="primary" sx={{ fontSize: '1.25rem', ml: 0.5 }}>
                          {drawAreaInHectares.toFixed(2)}
                        </Typography>
                        <Typography component="span" sx={{ ml: 0.5, color: theme.palette.text.secondary }}>
                          hectáreas
                        </Typography>
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: theme.palette.text.secondary, minHeight: '3.5em' }}>
                        {isDrawingOrEditingMap 
                          ? 'Modo dibujo/edición: Haz clic en el mapa para añadir puntos. Une el último punto con el primero o haz doble clic para finalizar el polígono.'
                          : hasDefinedPolygon 
                            ? limitsConfirmed 
                              ? 'Límites confirmados y listos para el siguiente paso.' 
                              : 'Polígono definido en el mapa. Por favor, revisa y confirma los límites para continuar.' 
                            : 'Utiliza los botones para dibujar o definir el área de la propiedad en el mapa.'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <Stack spacing={1.5}>
                        <Button
                          variant="outlined"
                          color="primary"
                          startIcon={<EditIcon />}
                          onClick={handleStartOrModifyDrawing}
                          disabled={isDrawingOrEditingMap && !hasDefinedPolygon}
                          fullWidth
                          sx={{ height: '48px' }}
                        >
                          {hasDefinedPolygon ? 'Modificar Límite' : 'Dibujar Límite'}
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          startIcon={<DeleteIcon />}
                          onClick={handleDeleteDrawing}
                          disabled={!hasDefinedPolygon || isDrawingOrEditingMap}
                          fullWidth
                          sx={{ height: '48px' }}
                        >
                          Borrar Límite
                        </Button>
                        <Button 
                          variant="contained" 
                          color={limitsConfirmed && !isDrawingOrEditingMap ? "success" : "primary"}
                          onClick={handleConfirmLimits}
                          disabled={!hasDefinedPolygon || isDrawingOrEditingMap || (limitsConfirmed && !isDrawingOrEditingMap && !editMode)}
                          fullWidth
                          sx={{ height: '48px', fontWeight: 'bold' }}
                        >
                          {limitsConfirmed && !isDrawingOrEditingMap ? '✓ Límites Confirmados' : 'Confirmar Límites'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}

            {/* Step 2: Características */}
            {activeStep === 2 && (
              <Stack spacing={4} sx={{ width: '100%' }}> {/* Ensure Stack takes full width */}
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                  Características
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      p: 3, 
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`, 
                      borderRadius: 2
                    }}>
                      <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                        Recursos Naturales
                      </Typography>
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={<Checkbox 
                            checked={propertyData.hasWater} 
                            onChange={handleCheckboxChange('hasWater')} 
                            color="primary"
                          />}
                          label="Acceso a agua"
                          sx={{ '& .MuiFormControlLabel-label': { color: theme.palette.text.primary } }}
                        />
                        <FormControlLabel
                          control={<Checkbox 
                            checked={propertyData.hasViews} 
                            onChange={handleCheckboxChange('hasViews')} 
                            color="primary"
                          />}
                          label="Vistas panorámicas"
                          sx={{ '& .MuiFormControlLabel-label': { color: theme.palette.text.primary } }}
                        />
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      p: 3, 
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2
                    }}>
                      <Typography variant="h6" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                        Tipo de Terreno
                      </Typography>
                      <TextField 
                        fullWidth 
                        select 
                        value={propertyData.terrain} 
                        onChange={handleInputChange('terrain')}
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

            {/* Step 3: Revisar */}
            {activeStep === 3 && (
              <Stack spacing={4} sx={{ width: '100%' }}> {/* Ensure Stack takes full width */}
                <Typography variant="h5" sx={{ color: theme.palette.text.primary, mb: 2 }}>
                  Revisar Información
                </Typography>

                <Card sx={{ 
                  p: 3, 
                  backgroundColor: theme.palette.background.paper, 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2
                }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h5" sx={{ color: theme.palette.primary.main, mb: 2, fontWeight: 500 }}>
                        {propertyData.name}
                      </Typography>
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
                        {propertyData.description}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
                        <Chip 
                          label={propertyData.propertyType === 'farm' ? 'Parcela/Granja' : 
                                 propertyData.propertyType === 'ranch' ? 'Rancho' :
                                 propertyData.propertyType === 'forest' ? 'Bosque' : 
                                 propertyData.propertyType === 'lake' ? 'Terreno con Lago' : 
                                 propertyData.propertyType}
                          size="small"
                          variant="outlined"
                        />
                        {propertyData.hasWater && <Chip label="Con agua" size="small" color="primary" />}
                        {propertyData.hasViews && <Chip label="Con vistas" size="small" color="secondary" />}
                        <Chip 
                          label={propertyData.terrain === 'flat' ? 'Terreno plano' :
                                 propertyData.terrain === 'hills' ? 'Colinas' :
                                 propertyData.terrain === 'mountains' ? 'Montañoso' :
                                 propertyData.terrain === 'mixed' ? 'Terreno mixto' :
                                 propertyData.terrain}
                          size="small" 
                          variant="outlined" 
                          color="default" 
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 1,
                        mb: 2
                      }}>
                        <Typography variant="overline" sx={{ color: theme.palette.text.secondary }}>
                          Precio
                        </Typography>
                        <Typography variant="h3" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                          {formatPrice(propertyData.price)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderRadius: 1
                      }}>
                        <Typography variant="overline" sx={{ color: theme.palette.text.secondary }}>
                          Tamaño
                        </Typography>
                        <Typography variant="h4" sx={{ color: theme.palette.success.main, fontWeight: 500 }}>
                          {propertyData.size.toFixed(1)} hectáreas
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Mini mapa de previsualización */}
                  {propertyData.boundary_polygon && (
                    <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, color: theme.palette.text.primary, fontWeight: 500 }}>
                        Vista previa de límites
                      </Typography>
                      <Box sx={{ 
                        height: '200px',
                        borderRadius: 1,
                        overflow: 'hidden',
                        border: `1px solid ${theme.palette.divider}`
                      }}>
                        <MapView
                          editable={false}
                          initialViewState={{
                            longitude: parseFloat(propertyData.longitude) || -70.6693,
                            latitude: parseFloat(propertyData.latitude) || -33.4489,
                            zoom: 13,
                            pitch: 45
                          }}
                          initialGeoJsonBoundary={propertyData.boundary_polygon}
                        />
                      </Box>
                    </Box>
                  )}
                </Card>
              </Stack>
            )}

          </Box> {/* Closing the Step Content Area Box */}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, flexShrink: 0 }}>
            <Button 
              disabled={activeStep === 0} 
              onClick={handleBack}
              sx={{ color: theme.palette.text.secondary }}
            >
              Atrás
            </Button>
            {activeStep < steps.length - 1 && (
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={(activeStep === 1 && (!hasDefinedPolygon || !limitsConfirmed))} // Deshabilitar si no se han confirmado límites en el paso 1
                sx={{ 
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': { backgroundColor: theme.palette.primary.dark }
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
          autoHideDuration={4000} // Reducir un poco el tiempo
          onClose={() => setSnackbar(prev => ({...prev, open: false}))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Centrar snackbar
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({...prev, open: false}))} 
            severity={snackbar.severity}
            elevation={6}
            variant="filled" // Estilo más prominente
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CreateProperty;