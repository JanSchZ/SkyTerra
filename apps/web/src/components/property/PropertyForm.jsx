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
import SellIcon from '@mui/icons-material/Sell';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { propertyService } from '../../services/api';
import MapView from '../map/MapView';
import PropertyBoundaryDraw from '../map/PropertyBoundaryDraw';
import VirtualTourEditor from '../map/VirtualTourEditor';

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
    listingType: 'sale',
    rentPrice: '',
    rentalTerms: '',
    documents: [],
    existingDocumentNames: [],
    terrain: 'flat',
    access: 'paved',
    legalStatus: 'clear',
    utilities: [],
    ...property,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState(property?.imageUrls?.map(url => ({ url, isExisting: true, file: null })) || []);
  const [tourPreviewName, setTourPreviewName] = useState(property?.tourUrl ? 'Tour existente' : '');
  const [documentPreviews, setDocumentPreviews] = useState([]);
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
        tourToDelete: false,
        documents: [],
        existingDocumentNames: [],
        terrain: property.terrain || 'flat',
        access: property.access || 'paved',
        legalStatus: property.legal_status || 'clear',
        utilities: property.utilities || [],
      }));
      setTourPreviewName(property.tours && property.tours.length > 0 ? 'Tour existente' : '');
      setDocumentPreviews([]);
    } else {
      setFormData(initialFormState);
      setImagePreviews([]);
      setTourPreviewName('');
      setDocumentPreviews([]);
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
            try { mapInstance.resize(); } catch (_) {}
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
              window.requestAnimationFrame(() => {
                try { mapInstance.resize(); } catch (_) {}
              });
            }
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
    } else if (name === 'utilities') {
      // Special handling for utilities array
      const utilityValue = e.target.value;
      setFormData(prev => ({
        ...prev,
        utilities: prev.utilities.includes(utilityValue)
          ? prev.utilities.filter(u => u !== utilityValue)
          : [...prev.utilities, utilityValue]
      }));
    } else if (name === 'price' || name === 'size' || name === 'latitude' || name === 'longitude') {
      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'rentPrice') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
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

  const handleTourUpdate = (tourData) => {
    setFormData(prev => ({ ...prev, tour360: tourData }));
  };

  const handleRemoveTour = () => {
    setFormData(prev => ({ ...prev, tour360: null, tourToDelete: !!prev.existingTourUrl }));
    setTourPreviewName('');
  };

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map(file => ({ name: file.name, file }));
    setDocumentPreviews(prev => [...prev, ...newDocs]);
    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...files] }));
    e.target.value = null;
  };

  const handleRemoveDocument = (indexToRemove) => {
    setDocumentPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
    setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== indexToRemove) }));
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
    if ((formData.listingType === 'rent' || formData.listingType === 'both') && (!formData.rentPrice || parseFloat(formData.rentPrice) <= 0)) {
      errors.rentPrice = 'Precio de arriendo requerido y debe ser > 0';
    }
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
    try {
      let savedProperty;
      if (formData.id) {
        savedProperty = await propertyService.updateProperty(formData.id, formData);
      } else {
        savedProperty = await propertyService.createProperty(formData);
      }
      if (onSave) onSave(savedProperty);
    } catch (err) {
      console.error('Error guardando propiedad:', err);
      setFormErrors({ submit: err.message || 'Error al guardar.' });
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
          <Tab label="Imágenes" icon={<ImageIcon />} iconPosition="start" id="property-tab-2" aria-controls="property-tabpanel-2" />
          <Tab label="Tour Virtual 360" icon={<GpsFixedIcon />} iconPosition="start" id="property-tab-3" aria-controls="property-tabpanel-3" />
          <Tab label="Documentos" icon={<DescriptionIcon />} iconPosition="start" id="property-tab-4" aria-controls="property-tabpanel-4" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit} noValidate>
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid xs={12} md={8}>
              <TextField fullWidth label="Nombre de la propiedad" name="name" value={formData.name} onChange={handleChange} error={!!formErrors.name} helperText={formErrors.name} autoComplete="off" required />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField fullWidth label="Tipo" name="propertyType" select SelectProps={{ native: true }} value={formData.propertyType} onChange={handleChange}>
                <option value="farm">Parcela/Granja</option>
                <option value="ranch">Rancho</option>
                <option value="forest">Bosque</option>
                <option value="lake">Terreno con Lago/Río</option>
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField fullWidth label="Terreno" name="terrain" select SelectProps={{ native: true }} value={formData.terrain} onChange={handleChange}>
                <option value="flat">Plano</option>
                <option value="hills">Colinas</option>
                <option value="mountains">Montañoso</option>
                <option value="mixed">Mixto</option>
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField fullWidth label="Acceso" name="access" select SelectProps={{ native: true }} value={formData.access} onChange={handleChange}>
                <option value="paved">Pavimentado</option>
                <option value="unpaved">No pavimentado</option>
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField fullWidth label="Estado Legal" name="legalStatus" select SelectProps={{ native: true }} value={formData.legalStatus} onChange={handleChange}>
                <option value="clear">Saneado</option>
                <option value="mortgaged">Con hipoteca</option>
              </TextField>
            </Grid>
            <Grid xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>Servicios Disponibles</Typography>
              <Grid container spacing={1}>
                {[ 'water', 'electricity', 'internet', 'phone', 'septic_tank', 'well_water'].map(utility => (
                  <Grid item xs={6} sm={4} md={3} key={utility}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.utilities.includes(utility)}
                          onChange={() => handleChange({ target: { name: 'utilities', value: utility, type: 'checkbox' } })}
                          name={utility}
                        />
                      }
                      label={{
                        'water': 'Agua Potable',
                        'electricity': 'Electricidad',
                        'internet': 'Internet',
                        'phone': 'Teléfono',
                        'septic_tank': 'Fosa Séptica',
                        'well_water': 'Agua de Pozo',
                      }[utility]}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Typography gutterBottom>Precio (CLP)</Typography>
              <Slider
                value={typeof formData.price === 'number' ? formData.price : 0}
                onChange={(e, newValue) => setFormData(prev => ({ ...prev, price: newValue }))}
                min={10000000} // 10M
                max={1000000000} // 1B
                step={5000000} // 5M
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value.toLocaleString()}`}
                sx={{ color: '#3b82f6' }}
              />
              <TextField
                fullWidth
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                error={!!formErrors.price}
                helperText={formErrors.price || 'En CLP'}
                autoComplete="off"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </Grid>
            <Grid xs={12} sm={6} md={4}>
              <Typography gutterBottom>Tamaño (Hectáreas)</Typography>
              <Slider
                value={typeof formData.size === 'number' ? formData.size : 0}
                onChange={(e, newValue) => setFormData(prev => ({ ...prev, size: newValue }))}
                min={0.1}
                max={1000}
                step={0.1}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} ha`}
                sx={{ color: '#10b981' }}
              />
              <TextField
                fullWidth
                name="size"
                type="number"
                value={formData.size}
                onChange={handleChange}
                error={!!formErrors.size}
                helperText={formErrors.size || 'En hectáreas'}
                autoComplete="off"
                InputProps={{ endAdornment: <InputAdornment position="end">ha</InputAdornment> }}
              />
            </Grid>
            <Grid xs={12} md={4}>
              <TextField fullWidth label="Modalidad" name="listingType" select SelectProps={{ native: true }} value={formData.listingType} onChange={handleChange}>
                <option value="sale">Venta</option>
                <option value="rent">Arriendo</option>
                <option value="both">Venta y Arriendo</option>
              </TextField>
            </Grid>
            {(formData.listingType === 'rent' || formData.listingType === 'both') && (
              <Grid xs={12} sm={6} md={4}>
                <TextField fullWidth label="Precio Arriendo (CLP)" name="rentPrice" type="number" value={formData.rentPrice} onChange={handleChange} error={!!formErrors.rentPrice} helperText={formErrors.rentPrice} autoComplete="off" required InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              </Grid>
            )}
            {(formData.listingType === 'rent' || formData.listingType === 'both') && (
              <Grid xs={12}>
                <TextField fullWidth multiline minRows={3} label="Términos de Arriendo (Opcional)" name="rentalTerms" value={formData.rentalTerms} onChange={handleChange} autoComplete="off" />
              </Grid>
            )}
            <Grid xs={12}>
              <TextField fullWidth label="Descripción detallada" name="description" value={formData.description} onChange={handleChange} multiline rows={5} autoComplete="off" />
            </Grid>
            {formData.boundary_polygon?.area && (
              <Grid xs={12}>
                <Alert severity="info" icon={<MapIcon fontSize="inherit" />}>
                  Límites definidos en el mapa: {parseFloat(formData.boundary_polygon.area).toFixed(2)} hectáreas.
                </Alert>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1} sx={{ minHeight: 500, position: 'relative' }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Haz clic en el mapa para empezar a dibujar el polígono de tu propiedad. Haz doble clic para finalizar el dibujo.
          </Typography>
          <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
            <MapView 
              ref={mapViewRef}
              editable={true}
              onBoundariesUpdate={handleBoundariesUpdate}
              onLocationSelect={({ longitude, latitude }) => {
                setFormData(prev => ({ ...prev, longitude, latitude }));
              }}
              initialGeoJsonBoundary={formData.boundary_polygon}
              initialViewState={{
                longitude: parseFloat(formData.longitude) || -70.6693,
                latitude: parseFloat(formData.latitude) || -33.4489,
                zoom: (formData.latitude && formData.longitude) ? 14 : 5,
                pitch: 0,
                bearing: 0
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Imágenes de la Propiedad ({imagePreviews.length} de 5)</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {imagePreviews.map((preview, index) => (
              <Grid xs={6} sm={4} md={3} key={index}>
                <Paper elevation={1} sx={{ position: 'relative', aspectRatio: '16/9', overflow:'hidden' }}>
                  <img src={preview.url} alt={`Preview ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => handleRemoveImage(index)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color:'white', '&:hover': {bgcolor: 'rgba(0,0,0,0.8)'} }}><DeleteIcon fontSize="small" /></IconButton>
                </Paper>
              </Grid>
            ))}
            {imagePreviews.length < 5 && (
              <Grid xs={6} sm={4} md={3}>
                <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ width:'100%', aspectRatio: '16/9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  Subir Imagen
                  <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                </Button>
              </Grid>
            )}
          </Grid>
          <Divider sx={{ my: 3 }} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Tour Virtual 360°</Typography>
          <Box sx={{ mb: 2 }}>
            <input
              accept=".html,.htm,.zip,.ggpkg"
              style={{ display: 'none' }}
              id="tour-upload-button"
              type="file"
              onChange={handleTourUpload}
            />
            <label htmlFor="tour-upload-button">
              <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                {tourPreviewName ? 'Cambiar Archivo de Tour' : 'Subir Archivo de Tour'}
              </Button>
            </label>
            {tourPreviewName && (
              <Chip
                label={tourPreviewName}
                onDelete={handleRemoveTour}
                sx={{ ml: 2 }}
              />
            )}
          </Box>
          <VirtualTourEditor
            initialTourData={formData.tour360}
            onTourUpdate={handleTourUpdate}
            map={mapboxMapInstance}
            propertyId={property?.id}
            onBoundariesUpdate={handleBoundariesUpdate}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>Documentos de Verificación (PDF, DOC, imágenes)</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {documentPreviews.map((doc, index) => {
              const fileExtension = doc.name.split('.').pop().toLowerCase();
              let IconComponent = InsertDriveFileIcon;
              if (fileExtension === 'pdf') {
                IconComponent = PictureAsPdfIcon;
              } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(fileExtension)) {
                IconComponent = ImageOutlinedIcon;
              }
              return (
                <Grid xs={12} key={index}>
                  <Paper elevation={1} sx={{ p:2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <IconComponent color="action" />
                      <Typography variant="body2" noWrap>{doc.name}</Typography>
                    </Box>
                    <IconButton onClick={() => handleRemoveDocument(index)} size="small"><DeleteIcon fontSize="small" /></IconButton>
                  </Paper>
                </Grid>
              );
            })}
            {documentPreviews.length < 10 && (
              <Grid xs={12}>
                <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                  Subir Documento
                  <input type="file" hidden accept=".pdf,.doc,.docx,image/*" multiple onChange={handleDocumentUpload} />
                </Button>
              </Grid>
            )}
          </Grid>
          <Alert severity="info">
            Estos documentos serán revisados por el equipo de SkyTerra para validar la propiedad (escritura, planos, comprobante de dominio, etc.).
          </Alert>
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
