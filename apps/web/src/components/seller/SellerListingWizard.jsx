import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import Map from 'react-map-gl';
import { NavigationControl } from 'react-map-gl';
import * as turf from '@turf/turf';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService.js';
import StatusBar from './StatusBar.jsx';
import PropertyBoundaryDraw from '../map/PropertyBoundaryDraw.jsx';
import config from '../../config/environment';
import { normalizeBoundary, areBoundaryCoordinatesEqual } from '../../utils/boundary.js';

const steps = [
  { key: 'basic', label: 'Datos de la propiedad' },
  { key: 'documents', label: 'Documentos' },
  { key: 'boundary', label: 'Ubicación y polígono' },
  { key: 'preferences', label: 'Preferencias de visita' },
  { key: 'review', label: 'Revisión y envío' },
];

const DOCUMENT_TYPES = [
  { key: 'deed', label: 'Escritura' },
  { key: 'plan', label: 'Plano/Levantamiento' },
  { key: 'proof', label: 'Certificado de dominio' },
  { key: 'other', label: 'Documento adicional' },
];

const DOCUMENT_LABEL_MAP = DOCUMENT_TYPES.reduce((acc, doc) => {
  acc[doc.key] = doc.label;
  return acc;
}, {});

const DOC_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const DOC_STATUS_COLOR = {
  pending: 'default',
  approved: 'success',
  rejected: 'error',
};

const initialBasicForm = {
  name: '',
  type: '',
  description: '',
  price: '',
  size: '',
  listing_type: 'sale',
  rent_price: '',
  plan: '',
  has_water: false,
  has_views: false,
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address_line1: '',
  address_line2: '',
  address_city: '',
  address_region: '',
  address_country: '',
  address_postal_code: '',
};

const SellerListingWizard = ({ listingId: initialListingId }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [listing, setListing] = useState(null);
  const [listingId, setListingId] = useState(initialListingId);
  const [basicForm, setBasicForm] = useState(initialBasicForm);
  const [basicErrors, setBasicErrors] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotDraft, setTimeSlotDraft] = useState({ day: '', from: '', to: '' });
  const [accessNotes, setAccessNotes] = useState('');
  const [savedBoundary, setSavedBoundary] = useState(null);
  const [boundaryDraft, setBoundaryDraft] = useState(null);
  const [boundaryDirty, setBoundaryDirty] = useState(false);
  const [boundaryRemovalPending, setBoundaryRemovalPending] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

  const currentDocuments = useMemo(() => listing?.documents ?? [], [listing]);

  const boundaryAreaHa = useMemo(() => {
    if (boundaryRemovalPending && !boundaryDraft) {
      return null;
    }
    if (boundaryDirty && boundaryDraft?.areaHa != null) {
      return boundaryDraft.areaHa;
    }
    if (savedBoundary?.areaHa != null) {
      return savedBoundary.areaHa;
    }
    const numericSize = Number.parseFloat(listing?.size);
    return Number.isFinite(numericSize) ? numericSize : null;
  }, [boundaryDirty, boundaryDraft, boundaryRemovalPending, savedBoundary, listing]);

  const showMessage = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, severity, message });
  }, []);

  const clearBasicError = useCallback((name) => {
    setBasicErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const validateEmail = (value) => {
    if (!value) return true;
    return /^[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(\.[\w-]+)+$/i.test(value.trim());
  };

  const parseNumber = (value) => {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const validateBasicForm = useCallback(() => {
    const errors = {};
    const trimmedName = basicForm.name.trim();
    const trimmedType = basicForm.type.trim();
    const trimmedContactName = basicForm.contact_name.trim();
    const trimmedContactPhone = basicForm.contact_phone.trim();
    const trimmedAddressLine1 = basicForm.address_line1.trim();
    const trimmedCity = basicForm.address_city.trim();
    const trimmedRegion = basicForm.address_region.trim();
    const trimmedCountry = basicForm.address_country.trim();

    if (!trimmedName) {
      errors.name = 'Ingresa un nombre descriptivo para la propiedad.';
    }

    if (!trimmedType) {
      errors.type = 'Define el tipo de propiedad.';
    }

    if (!basicForm.plan) {
      errors.plan = 'Selecciona un plan activo antes de continuar.';
    }

    const priceValue = parseNumber(basicForm.price);
    const rentPriceValue = parseNumber(basicForm.rent_price);
    const sizeValue = parseNumber(basicForm.size);
    const listingType = basicForm.listing_type;
    const includesSale = listingType === 'sale' || listingType === 'both';
    const includesRent = listingType === 'rent' || listingType === 'both';

    if (includesSale && (priceValue == null || priceValue <= 0)) {
      errors.price = 'Define el precio de venta.';
    }

    if (includesRent && (rentPriceValue == null || rentPriceValue <= 0)) {
      errors.rent_price = 'Define el valor de arriendo mensual.';
    }

    if (sizeValue == null || sizeValue <= 0) {
      errors.size = 'Ingresa el tamaño en hectáreas.';
    }

    if (!trimmedContactName) {
      errors.contact_name = 'Indica quién coordinará las visitas.';
    }

    if (!trimmedContactPhone) {
      errors.contact_phone = 'Agrega un teléfono o WhatsApp válido.';
    }

    if (basicForm.contact_email && !validateEmail(basicForm.contact_email)) {
      errors.contact_email = 'El correo electrónico no tiene un formato válido.';
    }

    if (!trimmedAddressLine1) {
      errors.address_line1 = 'Describe la dirección principal o punto de referencia.';
    }

    if (!trimmedCity) {
      errors.address_city = 'Indica la ciudad o comuna.';
    }

    if (!trimmedRegion) {
      errors.address_region = 'Define la región/estado.';
    }

    if (!trimmedCountry) {
      errors.address_country = 'Selecciona el país.';
    }

    return errors;
  }, [basicForm]);

  const closeSnackbar = useCallback(() => setSnackbar((prev) => ({ ...prev, open: false })), []);

  const loadPlans = useCallback(async () => {
    const data = await marketplaceService.fetchPlans();
    setPlans(data);
    return data;
  }, []);

  const loadListing = useCallback(
    async (id) => {
      if (!id) {
        setListing(null);
        setBasicForm(initialBasicForm);
        setBasicErrors({});
        setSavedBoundary(null);
        setBoundaryDraft(null);
        setBoundaryDirty(false);
        setBoundaryRemovalPending(false);
        return null;
      }
      const data = await marketplaceService.fetchProperty(id);
      setListing(data);
      setListingId(data.id);
      setBasicForm({
        name: data.name || '',
        type: data.type || '',
        description: data.description || '',
        price: data.price ?? '',
        size: data.size ?? '',
        listing_type: data.listing_type || 'sale',
        rent_price: data.rent_price ?? '',
        plan: data.plan ?? '',
        has_water: Boolean(data.has_water),
        has_views: Boolean(data.has_views),
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        address_city: data.address_city || '',
        address_region: data.address_region || '',
        address_country: data.address_country || '',
        address_postal_code: data.address_postal_code || '',
      });
      setAccessNotes(data.access_notes || '');
      setTimeSlots(Array.isArray(data.preferred_time_windows) ? data.preferred_time_windows : []);
      const normalizedBoundary = normalizeBoundary(data.boundary_polygon);
      setSavedBoundary(normalizedBoundary);
      setBoundaryDraft(normalizedBoundary);
      setBoundaryDirty(false);
      setBoundaryRemovalPending(false);
      return data;
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        const [plansData] = await Promise.all([loadPlans(), listingId ? loadListing(listingId) : Promise.resolve(null)]);
        if (!listingId && plansData?.length) {
          setBasicForm((prev) => ({ ...prev, plan: prev.plan || plansData[0].id }));
        }
      } catch (error) {
        console.error('Error bootstrapping wizard', error);
        showMessage('No fue posible cargar la información inicial.', 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [listingId, loadPlans, loadListing, showMessage]);

  const handleBasicChange = (event) => {
    const { name, value } = event.target;
    clearBasicError(name);
    setBasicForm((prev) => {
      if (name === 'listing_type') {
        return {
          ...prev,
          [name]: value,
          rent_price: value === 'sale' ? '' : prev.rent_price,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleBasicSwitchChange = (event) => {
    const { name, checked } = event.target;
    clearBasicError(name);
    setBasicForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleBasicSubmit = async () => {
    const errors = validateBasicForm();
    if (Object.keys(errors).length) {
      setBasicErrors(errors);
      showMessage('Revisa los campos obligatorios antes de continuar.', 'warning');
      return;
    }

    setBasicErrors({});

    const listingType = basicForm.listing_type;
    const includesSale = listingType === 'sale' || listingType === 'both';
    const includesRent = listingType === 'rent' || listingType === 'both';
    const priceValue = parseNumber(basicForm.price) ?? 0;
    const rentPriceValue = parseNumber(basicForm.rent_price) ?? 0;
    const sizeValue = parseNumber(basicForm.size) ?? 0;

    const payload = {
      name: basicForm.name,
      type: basicForm.type,
      description: basicForm.description?.trim() || '',
      price: includesSale ? priceValue : 0,
      size: sizeValue,
      listing_type: listingType,
      rent_price: includesRent ? rentPriceValue : null,
      plan: basicForm.plan || null,
      has_water: Boolean(basicForm.has_water),
      has_views: Boolean(basicForm.has_views),
      contact_name: basicForm.contact_name?.trim() || '',
      contact_email: basicForm.contact_email?.trim() || '',
      contact_phone: basicForm.contact_phone?.trim() || '',
      address_line1: basicForm.address_line1?.trim() || '',
      address_line2: basicForm.address_line2?.trim() || '',
      address_city: basicForm.address_city?.trim() || '',
      address_region: basicForm.address_region?.trim() || '',
      address_country: basicForm.address_country?.trim() || '',
      address_postal_code: basicForm.address_postal_code?.trim() || '',
    };
    try {
      setSaving(true);
      if (!listingId) {
        const created = await marketplaceService.createProperty(payload);
        setListingId(created.id);
        await loadListing(created.id);
      } else {
        await marketplaceService.updateProperty(listingId, payload);
        await loadListing(listingId);
      }
      showMessage('Datos guardados correctamente.');
      setActiveStep((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving basic form', error);
      showMessage('No fue posible guardar la información. Revisa los campos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!listingId) {
      showMessage('Guarda primero los datos básicos para crear la publicación.', 'warning');
      return;
    }
    try {
      setSaving(true);
      await marketplaceService.uploadPropertyDocument({
        propertyId: listingId,
        file,
        docType,
        description: '',
      });
      await loadListing(listingId);
      showMessage('Documento subido correctamente.');
    } catch (error) {
      console.error('Error uploading document', error);
      showMessage('No se pudo subir el documento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentDelete = async (docId) => {
    try {
      setSaving(true);
      await marketplaceService.deletePropertyDocument(docId);
      await loadListing(listingId);
      showMessage('Documento eliminado.');
    } catch (error) {
      console.error('Error deleting document', error);
      showMessage('No se pudo eliminar el documento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBoundaryUpdate = useCallback(
    (boundaryEvent) => {
      if (!boundaryEvent) return;

      if (boundaryEvent.type === 'initial') {
        const normalized = normalizeBoundary(boundaryEvent.feature || boundaryEvent, {
          areaHa: boundaryEvent.areaHa ?? boundaryEvent.area,
          center: boundaryEvent.center,
          bounds: boundaryEvent.bounds,
        });
        setSavedBoundary((prev) => prev ?? normalized ?? prev);
        setBoundaryDraft(normalized ?? null);
        setBoundaryDirty(false);
        setBoundaryRemovalPending(false);
        return;
      }

      if (boundaryEvent.type === 'clear' || boundaryEvent.removed) {
        setBoundaryDraft(null);
        const hadSavedBoundary = Boolean(savedBoundary?.feature);
        setBoundaryDirty(hadSavedBoundary);
        setBoundaryRemovalPending(hadSavedBoundary);
        return;
      }

      const normalized = normalizeBoundary(boundaryEvent.feature || boundaryEvent, {
        areaHa: boundaryEvent.areaHa ?? boundaryEvent.area,
        center: boundaryEvent.center,
        bounds: boundaryEvent.bounds,
      });

      if (!normalized) {
        setBoundaryDraft(null);
        const hadSavedBoundary = Boolean(savedBoundary?.feature);
        setBoundaryDirty(hadSavedBoundary);
        setBoundaryRemovalPending(hadSavedBoundary);
        return;
      }

      const sameAsSaved = savedBoundary?.feature
        ? areBoundaryCoordinatesEqual(savedBoundary, normalized)
        : false;

      setBoundaryDraft(normalized);
      setBoundaryDirty(!sameAsSaved);
      setBoundaryRemovalPending(false);
    },
    [savedBoundary]
  );

  useEffect(() => {
    if (!mapInstance || boundaryDirty) return;
    const feature = savedBoundary?.geojson;
    if (!feature) return;
    try {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(feature);
      if ([minLng, minLat, maxLng, maxLat].every((value) => Number.isFinite(value))) {
        mapInstance.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, duration: 800 }
        );
      }
    } catch (error) {
      console.error('Error ajustando el mapa al polígono', error);
    }
  }, [mapInstance, savedBoundary, boundaryDirty]);

  const recenterOnBoundary = useCallback(() => {
    if (!mapInstance) return;
    const targetBoundary = boundaryDirty && !boundaryRemovalPending ? boundaryDraft : savedBoundary;
    const feature = targetBoundary?.geojson;
    if (!feature) return;
    try {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(feature);
      if ([minLng, minLat, maxLng, maxLat].every((value) => Number.isFinite(value))) {
        mapInstance.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, duration: 500 }
        );
      }
    } catch (error) {
      console.error('No fue posible recentrar el mapa en el polígono', error);
    }
  }, [mapInstance, boundaryDraft, boundaryDirty, boundaryRemovalPending, savedBoundary]);

  const saveBoundary = async () => {
    if (!listingId) {
      showMessage('Guarda primero la información básica.', 'warning');
      return;
    }

    if (!boundaryDirty) {
      setActiveStep((prev) => prev + 1);
      return;
    }

    try {
      setSaving(true);

      if (boundaryRemovalPending) {
        await marketplaceService.updateProperty(listingId, {
          boundary_polygon: null,
          longitude: null,
          latitude: null,
          size: null,
          has_boundary: false,
        });
        await loadListing(listingId);
        showMessage('Polígono eliminado correctamente.');
      } else if (boundaryDraft?.feature) {
        const centroid =
          boundaryDraft.center && boundaryDraft.center.length === 2
            ? boundaryDraft.center
            : turf.centroid(boundaryDraft.feature)?.geometry?.coordinates;

        const payload = {
          boundary_polygon: boundaryDraft.feature,
        };

        if (Array.isArray(centroid) && centroid.length === 2) {
          payload.longitude = centroid[0];
          payload.latitude = centroid[1];
        }

        if (Number.isFinite(boundaryDraft?.areaHa)) {
          payload.size = Number(boundaryDraft.areaHa.toFixed(2));
        }

        await marketplaceService.updateProperty(listingId, payload);
        await loadListing(listingId);
        showMessage('Ubicación guardada correctamente.');
      } else {
        showMessage('Dibuja un polígono antes de guardar.', 'warning');
        return;
      }

      setBoundaryDirty(false);
      setBoundaryRemovalPending(false);
      setActiveStep((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving boundary', error);
      showMessage('No fue posible guardar el polígono.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTimeSlot = () => {
    if (!timeSlotDraft.day || !timeSlotDraft.from || !timeSlotDraft.to) {
      showMessage('Completa día y rangos horarios antes de agregar.', 'warning');
      return;
    }

    const parseTime = (value) => {
      const [hours, minutes] = value.split(':').map((segment) => Number.parseInt(segment, 10));
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
      return hours * 60 + minutes;
    };

    const fromMinutes = parseTime(timeSlotDraft.from);
    const toMinutes = parseTime(timeSlotDraft.to);

    if (fromMinutes == null || toMinutes == null) {
      showMessage('Usa formato horario HH:MM.', 'warning');
      return;
    }

    if (toMinutes <= fromMinutes) {
      showMessage('La hora de término debe ser posterior a la de inicio.', 'warning');
      return;
    }

    const duplicate = timeSlots.some(
      (slot) =>
        slot.day === timeSlotDraft.day &&
        slot.from === timeSlotDraft.from &&
        slot.to === timeSlotDraft.to
    );

    if (duplicate) {
      showMessage('Ese bloque horario ya está agregado.', 'info');
      return;
    }

    const nextSlots = [...timeSlots, { ...timeSlotDraft }];
    nextSlots.sort((a, b) => {
      const dayComparison = a.day.localeCompare(b.day);
      if (dayComparison !== 0) return dayComparison;
      return a.from.localeCompare(b.from);
    });

    setTimeSlots(nextSlots);
    setTimeSlotDraft({ day: '', from: '', to: '' });
  };

  const handleRemoveTimeSlot = (index) => {
    setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const savePreferences = async () => {
    if (!listingId) {
      showMessage('Guarda primero la información básica.', 'warning');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        preferred_time_windows: timeSlots,
        access_notes: accessNotes,
      };
      await marketplaceService.updateProperty(listingId, payload);
      await loadListing(listingId);
      showMessage('Preferencias guardadas.');
      setActiveStep((prev) => prev + 1);
    } catch (error) {
      console.error('Error saving preferences', error);
      showMessage('No se pudieron guardar las preferencias.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!listingId) return;
    try {
      setSaving(true);
      await marketplaceService.submitProperty(listingId, {
        message: 'El vendedor envió la publicación a revisión.',
      });
      await loadListing(listingId);
      showMessage('Publicación enviada a revisión.');
      // stay on review step but refresh data
    } catch (error) {
      console.error('Error submitting property', error);
      const missing = error?.response?.data?.missing_documents;
      if (Array.isArray(missing) && missing.length) {
        const labels = missing.map((code) => DOCUMENT_LABEL_MAP[code] || code).join(', ');
        showMessage(`Faltan documentos aprobados: ${labels}`, 'warning');
      } else if (error?.response?.data?.has_boundary === false) {
        showMessage('Guarda el polígono del terreno antes de enviar a revisión.', 'warning');
      } else {
        showMessage('No fue posible enviar a revisión.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const renderBasicStep = () => {
    const includesRent = basicForm.listing_type === 'rent' || basicForm.listing_type === 'both';
    const includesSale = basicForm.listing_type === 'sale' || basicForm.listing_type === 'both';

    return (
      <Stack spacing={4}>
        <Box>
          <Typography variant="h6">Información general</Typography>
          <Typography variant="body2" color="text.secondary">
            Cuéntanos sobre el terreno para que el equipo de operadores y los compradores entiendan de inmediato su potencial.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nombre del terreno"
              name="name"
              value={basicForm.name}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.name)}
              helperText={basicErrors.name || 'Por ejemplo: "Campo Los Boldos" o "Parcela en Lago Ranco"'}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={Boolean(basicErrors.plan)}>
              <InputLabel id="plan-label">Plan</InputLabel>
              <Select
                labelId="plan-label"
                label="Plan"
                name="plan"
                value={basicForm.plan}
                onChange={handleBasicChange}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={500}>{plan.name}</Typography>
                      <Chip size="small" label={`$${plan.price}`} color="primary" variant="outlined" />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText error={Boolean(basicErrors.plan)}>
                {basicErrors.plan || 'El plan define la visibilidad, reportes y soporte que recibes.'}
              </FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Tipo de propiedad"
              name="type"
              value={basicForm.type}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.type)}
              helperText={basicErrors.type || 'Ejemplos: terreno agrícola, parcela urbanizada, predio forestal.'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Precio de venta (USD)"
              name="price"
              type="number"
              value={basicForm.price}
              onChange={handleBasicChange}
              fullWidth
              required={includesSale}
              error={Boolean(basicErrors.price)}
              helperText={basicErrors.price || (includesSale ? 'Indica el precio total solicitado.' : 'Solo visible si habilitas venta.')}
              InputProps={{ inputProps: { min: 0, step: 100 } }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Tamaño (hectáreas)"
              name="size"
              type="number"
              value={basicForm.size}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.size)}
              helperText={basicErrors.size || 'Redondea a dos decimales si es necesario.'}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="listing-type-label">Tipo de publicación</InputLabel>
              <Select
                labelId="listing-type-label"
                label="Tipo de publicación"
                name="listing_type"
                value={basicForm.listing_type}
                onChange={handleBasicChange}
              >
                <MenuItem value="sale">Venta</MenuItem>
                <MenuItem value="rent">Arriendo</MenuItem>
                <MenuItem value="both">Venta y arriendo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {includesRent && (
            <Grid item xs={12} md={4}>
              <TextField
                label="Precio de arriendo mensual (USD)"
                name="rent_price"
                type="number"
                value={basicForm.rent_price}
                onChange={handleBasicChange}
                fullWidth
                required
                error={Boolean(basicErrors.rent_price)}
                helperText={basicErrors.rent_price || 'Si arriendas por temporada, acláralo en la descripción.'}
                InputProps={{ inputProps: { min: 0, step: 50 } }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              label="Descripción"
              name="description"
              value={basicForm.description}
              onChange={handleBasicChange}
              fullWidth
              multiline
              minRows={4}
              helperText="Resalta atributos únicos, accesos, servidumbres y potencial de uso."
            />
          </Grid>
          <Grid item xs={12}>
            <FormGroup row>
              <FormControlLabel
                control={<Switch checked={Boolean(basicForm.has_water)} onChange={handleBasicSwitchChange} name="has_water" />}
                label="Cuenta con acceso a agua"
              />
              <FormControlLabel
                control={<Switch checked={Boolean(basicForm.has_views)} onChange={handleBasicSwitchChange} name="has_views" />}
                label="Tiene vistas destacadas"
              />
            </FormGroup>
          </Grid>
        </Grid>

        <Divider />

        <Box>
          <Typography variant="h6">Contacto operativo</Typography>
          <Typography variant="body2" color="text.secondary">
            Estos datos permiten coordinar al piloto de SkyTerra y responder a potenciales compradores.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Nombre del contacto"
              name="contact_name"
              value={basicForm.contact_name}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.contact_name)}
              helperText={basicErrors.contact_name || 'Persona que abrirá el campo o atenderá visitas.'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Correo del contacto"
              name="contact_email"
              value={basicForm.contact_email}
              onChange={handleBasicChange}
              fullWidth
              error={Boolean(basicErrors.contact_email)}
              helperText={basicErrors.contact_email || 'Usaremos este correo para enviar confirmaciones y reportes.'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Teléfono o WhatsApp"
              name="contact_phone"
              value={basicForm.contact_phone}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.contact_phone)}
              helperText={basicErrors.contact_phone || 'Incluye código de país. Ej: +56 9 1234 5678.'}
            />
          </Grid>
        </Grid>

        <Divider />

        <Box>
          <Typography variant="h6">Ubicación y referencias</Typography>
          <Typography variant="body2" color="text.secondary">
            Indica la dirección base y cualquier detalle que ayude al operador a llegar sin contratiempos.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Dirección o punto de referencia"
              name="address_line1"
              value={basicForm.address_line1}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.address_line1)}
              helperText={basicErrors.address_line1 || 'Puedes usar coordenadas o una descripción clara si no existe dirección formal.'}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Detalle adicional (interior, lote, portón...)"
              name="address_line2"
              value={basicForm.address_line2}
              onChange={handleBasicChange}
              fullWidth
              helperText="Información opcional para llegar sin perder tiempo."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Ciudad / Comuna"
              name="address_city"
              value={basicForm.address_city}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.address_city)}
              helperText={basicErrors.address_city || 'Es clave para programar al operador local.'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Región / Estado"
              name="address_region"
              value={basicForm.address_region}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.address_region)}
              helperText={basicErrors.address_region || 'Indica la división administrativa correspondiente.'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="País"
              name="address_country"
              value={basicForm.address_country}
              onChange={handleBasicChange}
              fullWidth
              required
              error={Boolean(basicErrors.address_country)}
              helperText={basicErrors.address_country || 'Si recibes visitas internacionales, esto ayuda a los pilotos.'}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Código postal"
              name="address_postal_code"
              value={basicForm.address_postal_code}
              onChange={handleBasicChange}
              fullWidth
              helperText="Opcional, pero útil para notificaciones y logística."
            />
          </Grid>
        </Grid>
      </Stack>
    );
  };

  const renderDocumentsStep = () => (
    <Stack spacing={2}>
      {DOCUMENT_TYPES.map((doc) => {
        const existing = currentDocuments.find((d) => d.doc_type === doc.key);
        return (
          <Paper key={doc.key} variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
              <Box sx={{ flexGrow: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1">{doc.label}</Typography>
                  {existing && (
                    <Chip
                      size="small"
                      label={DOC_STATUS_LABELS[existing.status] || existing.status}
                      color={DOC_STATUS_COLOR[existing.status] || 'default'}
                    />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {existing
                    ? existing.reviewed_at
                      ? `Revisado ${new Date(existing.reviewed_at).toLocaleString()}${existing.reviewed_by_details ? ` por ${existing.reviewed_by_details.username}` : ''}`
                      : 'En revisión por el equipo de SkyTerra'
                    : 'Pendiente de subir'}
                </Typography>
                {existing?.description && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {existing.description}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={saving}
                >
                  Subir
                  <input
                    hidden
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleDocumentUpload(doc.key, file);
                      event.target.value = '';
                    }}
                  />
                </Button>
                {existing && (
                  <IconButton color="error" onClick={() => handleDocumentDelete(existing.id)} disabled={saving}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );

  const renderBoundaryStep = () => {
    const hasSavedBoundary = Boolean(savedBoundary?.geojson);
    const hasDraftBoundary = Boolean(boundaryDraft?.geojson);
    const areaLabel =
      boundaryRemovalPending || boundaryAreaHa == null
        ? '—'
        : `${boundaryAreaHa.toFixed(2)} ha`;

    let statusSeverity = 'warning';
    let statusMessage =
      'Dibuja los límites del terreno para que el equipo de operadores pueda ubicarlo con precisión.';

    if (boundaryRemovalPending) {
      statusSeverity = 'warning';
      statusMessage =
        'Eliminarás el polígono guardado al confirmar los cambios. Si fue un error, vuelve a dibujarlo antes de guardar.';
    } else if (boundaryDirty) {
      statusSeverity = 'info';
      statusMessage = 'Tienes cambios sin guardar. Presiona “Guardar polígono” para actualizar la publicación.';
    } else if (hasSavedBoundary) {
      statusSeverity = 'success';
      statusMessage = 'El polígono guardado se utilizará para asignar al operador en terreno.';
    }

    const targetBoundary = boundaryDirty && !boundaryRemovalPending && hasDraftBoundary ? boundaryDraft : savedBoundary;
    const initialLatitude = targetBoundary?.latitude ?? listing?.latitude ?? -33.4489;
    const initialLongitude = targetBoundary?.longitude ?? listing?.longitude ?? -70.6693;
    const initialZoom = targetBoundary ? 16 : listing?.boundary_polygon ? 15 : 4;

    const canPersistBoundary = boundaryDirty ? boundaryRemovalPending || hasDraftBoundary : true;
    const canRecenter =
      Boolean(mapInstance) &&
      Boolean(
        (boundaryDirty && !boundaryRemovalPending && hasDraftBoundary) ||
          (!boundaryDirty && hasSavedBoundary)
      );

    return (
      <Stack spacing={3}>
        <Alert severity={statusSeverity} variant="outlined">
          {statusMessage}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Dibuja el polígono que representa la propiedad. Ajusta tanto como necesites y asegúrate de que el área sea representativa.
        </Typography>
        <Box sx={{ position: 'relative', height: 420, borderRadius: 2, overflow: 'hidden' }}>
          <Map
            initialViewState={{
              latitude: initialLatitude,
              longitude: initialLongitude,
              zoom: initialZoom,
            }}
            mapboxAccessToken={config.mapbox.accessToken}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
            style={{ width: '100%', height: '100%' }}
            onLoad={(event) => setMapInstance(event.target)}
          >
            <NavigationControl position="top-right" />
            {mapInstance && (
              <PropertyBoundaryDraw
                map={mapInstance}
                onBoundariesUpdate={handleBoundaryUpdate}
                existingBoundaries={savedBoundary?.geojson || listing?.boundary_polygon}
              />
            )}
          </Map>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Área estimada: {areaLabel}
            </Typography>
            {boundaryRemovalPending && hasSavedBoundary && (
              <Typography variant="caption" color="warning.main">
                El polígono actual se eliminará al guardar.
              </Typography>
            )}
            {!boundaryRemovalPending &&
              listing?.size &&
              boundaryAreaHa != null &&
              Math.abs(boundaryAreaHa - Number(listing.size)) > 0.5 && (
              <Typography variant="caption" color="text.secondary">
                Tamaño registrado en ficha: {Number(listing.size).toFixed(2)} ha.
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={recenterOnBoundary}
              disabled={!canRecenter}
            >
              Recentrar mapa
            </Button>
            <Button variant="contained" onClick={saveBoundary} disabled={saving || !canPersistBoundary}>
              Guardar polígono
            </Button>
          </Stack>
        </Stack>
      </Stack>
    );
  };

  const renderPreferencesStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1">Ventanas horarias sugeridas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Agrega disponibilidad estimada para coordinar la visita del piloto.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Fecha"
            type="date"
            value={timeSlotDraft.day}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, day: event.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Selecciona el día disponible."
          />
          <TextField
            label="Desde"
            type="time"
            value={timeSlotDraft.from}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, from: event.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Hasta"
            type="time"
            value={timeSlotDraft.to}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, to: event.target.value }))}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddTimeSlot}>
            Agregar
          </Button>
        </Stack>
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
          {timeSlots.map((slot, index) => (
            <Chip
              key={`${slot.day}-${slot.from}-${slot.to}-${index}`}
              label={`${slot.day} • ${slot.from} - ${slot.to}`}
              onDelete={() => handleRemoveTimeSlot(index)}
              sx={{ mb: 1 }}
            />
          ))}
          {!timeSlots.length && <Typography variant="body2" color="text.secondary">Sin ventanas registradas aún.</Typography>}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle1">Instrucciones de acceso</Typography>
        <TextField
          label="Notas para el piloto (portón, contacto, seguridad...)"
          value={accessNotes}
          onChange={(event) => setAccessNotes(event.target.value)}
          multiline
          minRows={4}
          fullWidth
        />
      </Box>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button variant="contained" onClick={savePreferences} disabled={saving}>
          Guardar preferencias
        </Button>
      </Stack>
    </Stack>
  );

  const renderReviewStep = () => {
    const requirements = listing?.submission_requirements || {
      missing_documents: DOCUMENT_TYPES.filter((doc) => doc.key !== 'other').map((doc) => doc.key),
      has_boundary: Boolean(listing?.boundary_polygon),
      can_submit: false,
    };

    const hasContact = Boolean(listing?.contact_name && listing?.contact_phone);
    const hasAddress = Boolean(
      listing?.address_line1 &&
        listing?.address_country &&
        listing?.address_region &&
        listing?.address_city
    );
    const missingDocuments = Array.isArray(requirements.missing_documents)
      ? requirements.missing_documents
      : [];
    const canSubmit = Boolean(requirements.can_submit && hasContact && hasAddress && requirements.has_boundary);

    return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">Resumen</Typography>
        <Typography variant="body2" color="text.secondary">
          Revisa la información antes de enviar a revisión. Puedes volver atrás para ajustar cualquier detalle.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1">{listing?.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {listing?.type} · {listing?.size ? `${listing.size} ha` : '—'} · ${listing?.price ?? '—'}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {listing?.description || 'Sin descripción'}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Plan contratado</Typography>
        <Typography variant="body2" color="text.secondary">
          {listing?.plan_details?.name || 'Sin plan asignado'}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Contacto operativo</Typography>
        <Typography variant="body2" color="text.secondary">
          {listing?.contact_name || '—'} · {listing?.contact_phone || 'Teléfono pendiente'}
        </Typography>
        {listing?.contact_email && (
          <Typography variant="body2" color="text.secondary">{listing.contact_email}</Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Dirección de grabación</Typography>
        <Typography variant="body2" color="text.secondary">
          {[listing?.address_line1, listing?.address_line2].filter(Boolean).join(', ') || 'Dirección pendiente'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {[listing?.address_city, listing?.address_region, listing?.address_country]
            .filter(Boolean)
            .join(', ') || 'Completa ciudad y país para coordinar el vuelo.'}
        </Typography>
      </Paper>
      <Box>
        <StatusBar status={listing?.status_bar} />
      </Box>
      {!canSubmit && (
        <Alert severity="warning">
          {!requirements.has_boundary
            ? 'Dibuja y guarda el polígono del terreno para continuar.'
            : !hasContact
            ? 'Agrega un nombre y teléfono de contacto para coordinar el vuelo.'
            : !hasAddress
            ? 'Completa la dirección principal para orientar al piloto.'
            : 'Faltan documentos aprobados para continuar.'}
          {!!missingDocuments.length && (
            <Box component="span"> Documentos pendientes: {missingDocuments.map((code) => DOCUMENT_LABEL_MAP[code] || code).join(', ')}.</Box>
          )}
        </Alert>
      )}
      <Box>
        <Typography variant="subtitle2">Historial de estado</Typography>
        <Stack spacing={1} mt={1}>
          {(listing?.status_history || []).slice(0, 6).map((entry) => (
            <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {entry.substate}
              </Typography>
              {entry.message && (
                <Typography variant="body2" color="text.secondary">
                  {entry.message}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.created_at).toLocaleString()}
              </Typography>
            </Paper>
          ))}
          {!listing?.status_history?.length && (
            <Typography variant="body2" color="text.secondary">
              Aún no hay eventos registrados.
            </Typography>
          )}
        </Stack>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="space-between">
        <Button variant="outlined" onClick={() => navigate('/dashboard')}>
          Volver al panel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSubmitForReview} disabled={saving || !listingId || !canSubmit}>
          Enviar a revisión
        </Button>
      </Stack>
    </Stack>
  );
  };

  const renderStepContent = () => {
    switch (steps[activeStep].key) {
      case 'basic':
        return renderBasicStep();
      case 'documents':
        return renderDocumentsStep();
      case 'boundary':
        return renderBoundaryStep();
      case 'preferences':
        return renderPreferencesStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const actionButtons = (
    <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
      {activeStep > 0 && (
        <Button variant="text" onClick={handleBack} disabled={saving}>
          Atrás
        </Button>
      )}
      {activeStep < steps.length - 1 && steps[activeStep].key !== 'preferences' && steps[activeStep].key !== 'boundary' && (
        <Button variant="contained" onClick={handleBasicSubmit} disabled={saving}>
          Guardar y continuar
        </Button>
      )}
    </Stack>
  );

  return (
    <Box sx={{ pb: 6 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {listingId ? 'Editar publicación' : 'Nueva publicación'}
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((step) => (
          <Step key={step.key}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        {renderStepContent()}
        {steps[activeStep].key === 'basic' && actionButtons}
        {steps[activeStep].key === 'documents' && (
          <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
            <Button variant="text" onClick={handleBack} disabled={saving}>
              Atrás
            </Button>
            <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)} disabled={saving}>
              Continuar
            </Button>
          </Stack>
        )}
        {steps[activeStep].key === 'preferences' && (
          <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
            <Button variant="text" onClick={handleBack} disabled={saving}>
              Atrás
            </Button>
            <Button variant="contained" onClick={savePreferences} disabled={saving}>
              Guardar y continuar
            </Button>
          </Stack>
        )}
        {steps[activeStep].key === 'boundary' && (
          <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
            <Button variant="text" onClick={handleBack} disabled={saving}>
              Atrás
            </Button>
          </Stack>
        )}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SellerListingWizard;
