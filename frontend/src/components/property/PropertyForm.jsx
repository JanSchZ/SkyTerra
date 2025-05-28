import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Tab,
  Tabs,
  Stack,
  Chip
} from '@mui/material';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import ImageIcon from '@mui/icons-material/Image';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MapIcon from '@mui/icons-material/Map';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import TerrainIcon from '@mui/icons-material/Terrain';
import { propertyService } from '../../services/api';
import MapView from '../map/MapView';
import PropertyBoundaryDraw from '../map/PropertyBoundaryDraw';

// Componente para el Panel de Tabs
function TabPanel(props) {
  const { children, value, index, sx, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3, ...sx, backgroundColor: sx?.backgroundColor || 'transparent' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PropertyForm = ({ property, onSave, onCancel, isLoading = false, error = null }) => {
  const initialFormState = {
    name: '',
    description: '',
    price: '',
    size: '',
    latitude: '',
    longitude: '',
    boundary_polygon: null,
    hasWater: false,
    hasViews: false,
    propertyType: 'farm',
    images: [],
    existingImageUrls: property?.imageUrls || [],
    imagesToDelete: [],
    tour360: null,
    existingTourUrl: property?.tourUrl || null,
    tourToDelete: false,
    ...property,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState(property?.imageUrls?.map(url => ({ url, isExisting: true, file: null })) || []);
  const [tourPreviewName, setTourPreviewName] = useState(property?.tourUrl ? 'Tour existente' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const mapViewRef = useRef(null);
  const [mapboxMapInstance, setMapboxMapInstance] = useState(null);

  useEffect(() => {
    if (property) {
      const existingImages = property.images?.map(img => ({ url: img.url, isExisting: true, file: null, id: img.id })) || [];
      setImagePreviews(existingImages);
      setFormData(prev => ({
        ...prev,
        ...property,
        latitude: property.latitude || '',
        longitude: property.longitude || '',
        boundary_polygon: property.boundary_polygon || null,
        existingImageUrls: property.images?.map(img => img.url) || [],
        images: [],
        imagesToDelete: [],
        tour360: null,
        existingTourUrl: property.tours && property.tours.length > 0 ? property.tours[0].url : null,
        tourToDelete: false
      }));
      setTourPreviewName(property.tours && property.tours.length > 0 ? 'Tour existente' : '');
    } else {
      setFormData(initialFormState);
      setImagePreviews([]);
      setTourPreviewName('');
    }
  }, [property]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1) {
      setTimeout(() => {
        if (mapViewRef.current && typeof mapViewRef.current.getMap === 'function') {
          const mapInstance = mapViewRef.current.getMap();
          if (mapInstance) {
            setMapboxMapInstance(mapInstance);
            if (formData.latitude && formData.longitude) {
              mapViewRef.current.flyTo({
                center: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
                zoom: 14,
                duration: 1500
              });
            }
          } else {
            console.warn("PropertyForm: No se pudo obtener la instancia del mapa de MapView.")
          }
        } else {
            console.warn("PropertyForm: mapViewRef.current no está disponible o getMap no es una función.")
        }
      }, 100); 
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'price' || name === 'size' || name === 'latitude' || name === 'longitude') {
      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleBoundariesUpdate = (boundaries) => {
    setFormData(prev => ({
      ...prev,
      boundary_polygon: boundaries,
      latitude: boundaries?.center?.[1] ?? prev.latitude,
      longitude: boundaries?.center?.[0] ?? prev.longitude,
      size: boundaries?.area?.toFixed(2) ?? prev.size,
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentImageCount = imagePreviews.length;
    const availableSlots = 5 - currentImageCount;
    const filesToUpload = files.slice(0, availableSlots);

    const newImageObjects = filesToUpload.map(file => ({ 
      url: URL.createObjectURL(file),
      isExisting: false,
      file: file
    }));

    setImagePreviews(prev => [...prev, ...newImageObjects]);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...filesToUpload]
    }));
    e.target.value = null;
  };

  const handleRemoveImage = (indexToRemove) => {
    const previewToRemove = imagePreviews[indexToRemove];
    if (previewToRemove.isExisting && previewToRemove.id) {
      setFormData(prev => ({
        ...prev,
        imagesToDelete: [...prev.imagesToDelete, previewToRemove.id]
      }));
    }
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    if (!previewToRemove.isExisting && previewToRemove.file) {
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(f => f !== previewToRemove.file)
      }));
    }
  };
  
  const handleTourUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, tour360: file, tourToDelete: false }));
      setTourPreviewName(file.name);
    }
    e.target.value = null;
  };

  const handleRemoveTour = () => {
    setFormData(prev => ({ ...prev, tour360: null, tourToDelete: !!prev.existingTourUrl }));
    setTourPreviewName('');
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'El nombre es obligatorio.';
    if (!formData.price) errors.price = 'El precio es obligatorio.';
    else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) errors.price = 'Precio inválido.';
    if (!formData.size) errors.size = 'El tamaño es obligatorio.';
    else if (isNaN(parseFloat(formData.size)) || parseFloat(formData.size) <= 0) errors.size = 'Tamaño inválido.';
    if (formData.latitude && (isNaN(parseFloat(formData.latitude)) || parseFloat(formData.latitude) < -90 || parseFloat(formData.latitude) > 90)) errors.latitude = 'Latitud inválida.';
    if (formData.longitude && (isNaN(parseFloat(formData.longitude)) || parseFloat(formData.longitude) < -180 || parseFloat(formData.longitude) > 180)) errors.longitude = 'Longitud inválida.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSubmitting(true);
    const dataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'images' || key === 'imagesToDelete' || key === 'boundary_polygon' || key === 'tour360') {
      } else if (formData[key] !== null && formData[key] !== undefined) {
        dataToSend.append(key, formData[key]);
      }
    });
    if (formData.boundary_polygon) {
      dataToSend.append('boundary_polygon', JSON.stringify(formData.boundary_polygon.geojson || formData.boundary_polygon));
    }
    formData.images.forEach(file => dataToSend.append('new_images', file));
    if (formData.imagesToDelete.length > 0) {
        dataToSend.append('images_to_delete_ids', JSON.stringify(formData.imagesToDelete));
    }
    if (formData.tour360) {
      dataToSend.append('new_tour_file', formData.tour360);
    }
    if (formData.tourToDelete && property?.tours?.[0]?.id) {
      dataToSend.append('tour_to_delete_id', property.tours[0].id);
    }

    try {
      let savedProperty;
      if (formData.id) {
        savedProperty = await propertyService.updateProperty(formData.id, dataToSend);
      } else {
        savedProperty = await propertyService.createProperty(dataToSend);
      }
      if (onSave) onSave(savedProperty);
    } catch (err) {
      console.error('Error guardando propiedad:', err, err.response);
      let displayError = 'Error al guardar. Intente nuevamente.';
      if (err.response && err.response.data) {
        if (err.response.data.error && err.response.data.details) {
          displayError = `${err.response.data.error}: ${err.response.data.details}`;
        } else if (typeof err.response.data === 'string') {
          displayError = err.response.data;
        } else if (err.response.data.detail) { 
          displayError = err.response.data.detail;
        } else if (err.response.data.message) { // Some custom errors might use "message"
          displayError = err.response.data.message;
        } else {
          // Fallback for other DRF validation errors (typically an object with field names as keys)
          const fieldErrorKeys = Object.keys(err.response.data);
          if (fieldErrorKeys.length > 0) {
            // Prioritize common non-field errors or specific file errors if named explicitly
            if (err.response.data.non_field_errors) {
              displayError = err.response.data.non_field_errors.join(' ');
            } else if (err.response.data.new_images) {
              displayError = `Error en imágenes: ${err.response.data.new_images.join(' ')}`;
            } else if (err.response.data.new_tour_file) {
              displayError = `Error en archivo de tour: ${err.response.data.new_tour_file.join(' ')}`;
            } else {
              // Generic message for other field-specific errors
              displayError = `Error de validación. Por favor, revise los campos. (${fieldErrorKeys.join(', ')})`;
              // Or try to concatenate them (can be long)
              // displayError = fieldErrorKeys.map(key => `${key}: ${err.response.data[key].join(' ')}`).join('; ');
            }
          }
        }
      } else if (err.message) {
        displayError = err.message;
      }
      setFormErrors({ submit: displayError });
      // If you had a snackbar:
      // setSnackbar({ open: true, message: displayError, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {property ? 'Editar Propiedad' : 'Publicar Nueva Propiedad'}
      </Typography>
      {isLoading && <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Property form tabs" variant="scrollable" scrollButtons="auto">
          <Tab label="Información General" icon={<TerrainIcon />} iconPosition="start" id="property-tab-0" aria-controls="property-tabpanel-0" />
          <Tab label="Ubicación y Límites" icon={<MapIcon />} iconPosition="start" id="property-tab-1" aria-controls="property-tabpanel-1" />
          <Tab label="Imágenes y Tour" icon={<ImageIcon />} iconPosition="start" id="property-tab-2" aria-controls="property-tabpanel-2" />
          <Tab label="Previsualizar Tour (Si aplica)" icon={<GpsFixedIcon />} iconPosition="start" id="property-tab-3" aria-controls="property-tabpanel-3" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit} noValidate>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Nombre de la propiedad" name="name" value={formData.name} onChange={handleChange} error={!!formErrors.name} helperText={formErrors.name} required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Tipo" name="propertyType" select SelectProps={{ native: true }} value={formData.propertyType} onChange={handleChange}>
                <option value="farm">Parcela/Granja</option>
                <option value="ranch">Rancho</option>
                <option value="forest">Bosque</option>
                <option value="lake">Terreno con Lago/Río</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Precio (CLP)" name="price" type="number" value={formData.price} onChange={handleChange} error={!!formErrors.price} helperText={formErrors.price} required InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField fullWidth label="Tamaño" name="size" type="number" value={formData.size} onChange={handleChange} error={!!formErrors.size} helperText={formErrors.size || 'En hectáreas'} required InputProps={{ endAdornment: <InputAdornment position="end">ha</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} md={4}>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Latitud (Opcional)" name="latitude" type="number" value={formData.latitude} onChange={handleChange} error={!!formErrors.latitude} helperText={formErrors.latitude || 'Ej: -33.4489'} InputProps={{ endAdornment: <IconButton size="small" onClick={() => setTabValue(1)} title="Definir en mapa"><GpsFixedIcon /></IconButton> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Longitud (Opcional)" name="longitude" type="number" value={formData.longitude} onChange={handleChange} error={!!formErrors.longitude} helperText={formErrors.longitude || 'Ej: -70.6693'} InputProps={{ endAdornment: <IconButton size="small" onClick={() => setTabValue(1)} title="Definir en mapa"><GpsFixedIcon /></IconButton> }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Descripción detallada" name="description" value={formData.description} onChange={handleChange} multiline rows={5} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formData.hasWater} onChange={handleChange} name="hasWater" />} label="Acceso a agua" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formData.hasViews} onChange={handleChange} name="hasViews" />} label="Vistas panorámicas" />
            </Grid>
            {formData.boundary_polygon?.area && (
              <Grid item xs={12}>
                <Alert severity="info" icon={<MapIcon fontSize="inherit" />}>
                  Límites definidos en el mapa: {parseFloat(formData.boundary_polygon.area).toFixed(2)} hectáreas.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1} sx={{ minHeight: 500, position: 'relative' }}>
          <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
            <MapView 
              ref={mapViewRef}
              editable={true}
              initialViewState={{
                longitude: parseFloat(formData.longitude) || -70.6693,
                latitude: parseFloat(formData.latitude) || -33.4489,
                zoom: (formData.latitude && formData.longitude) ? 14 : 5,
                pitch: 0,
                bearing: 0
              }}
            />
            {mapboxMapInstance && (
              <PropertyBoundaryDraw 
                map={mapboxMapInstance} 
                onBoundariesUpdate={handleBoundariesUpdate} 
                existingBoundaries={formData.boundary_polygon} 
              />
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Imágenes de la Propiedad (máx. 5)</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {imagePreviews.map((preview, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Paper elevation={1} sx={{ position: 'relative', aspectRatio: '16/9', overflow:'hidden' }}>
                  <img src={preview.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => handleRemoveImage(index)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color:'white', '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'} }}><DeleteIcon fontSize="small" /></IconButton>
                </Paper>
              </Grid>
            ))}
            {imagePreviews.length < 5 && (
              <Grid item xs={6} sm={4} md={3}>
                <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ width:'100%', aspectRatio: '16/9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  Subir Imagen
                  <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                </Button>
              </Grid>
            )}
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Tour Virtual 360°</Typography>
          {tourPreviewName ? (
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb:2}}>
                <Chip label={tourPreviewName} onDelete={handleRemoveTour} />
            </Box>
           ) : null}
          <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
            {formData.existingTourUrl ? 'Cambiar Archivo de Tour' : 'Subir Archivo de Tour (HTML/ZIP)'}
            <input type="file" hidden accept=".html,.htm,.zip" onChange={handleTourUpload} />
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Previsualizar Tour Virtual</Typography>
          {/* 
            The PropertyBoundaryDraw component was incorrectly placed here.
            Tab 2 handles tour uploads. This tab is for viewing if applicable.
          */}
          {formData.existingTourUrl ? (
            <Typography variant="body1">
              Visualización del tour virtual no implementada en este formulario. URL del Tour: {' '}
              <a href={formData.existingTourUrl} target="_blank" rel="noopener noreferrer">
                {formData.existingTourUrl}
              </a>
            </Typography>
          ) : tourPreviewName ? (
            <Typography variant="body1">
              El tour virtual '{tourPreviewName}' está listo para ser subido. La previsualización no está disponible aquí.
            </Typography>
          ) : (
            <Typography variant="body1">
              Sube un archivo de tour virtual en la pestaña 'Imágenes y Tour'.
              Si el tour es un enlace web o puede ser embebido, su previsualización podría aparecer aquí.
            </Typography>
          )}
        </TabPanel>

        <Divider sx={{ my: 4 }} />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" color="inherit" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={isSubmitting || isLoading}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSubmitting ? (property ? 'Guardando Cambios...' : 'Publicando Propiedad...') : (property ? 'Guardar Cambios' : 'Publicar Propiedad')}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};

export default PropertyForm; 