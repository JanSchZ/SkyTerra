import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
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
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
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
  { key: 'overview', label: 'Perfil de la propiedad' },
  { key: 'documents', label: 'Documentos' },
  { key: 'operations', label: 'Operación en terreno' },
  { key: 'review', label: 'Revisión y publicación' },
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

const SECTION_CARD_SX = {
  p: { xs: 3, md: 4 },
  borderRadius: 4,
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: '0 24px 48px rgba(15, 23, 42, 0.08)',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

const initialListingForm = {
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
  const [listingForm, setListingForm] = useState(initialListingForm);
  const [formErrors, setFormErrors] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotDraft, setTimeSlotDraft] = useState({ day: '', from: '', to: '' });
  const [accessNotes, setAccessNotes] = useState('');
  const [savedBoundary, setSavedBoundary] = useState(null);
  const [boundaryDraft, setBoundaryDraft] = useState(null);
  const [boundaryDirty, setBoundaryDirty] = useState(false);
  const [boundaryRemovalPending, setBoundaryRemovalPending] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
  const [locating, setLocating] = useState(false);

  const currentDocuments = useMemo(() => listing?.documents ?? [], [listing]);
  const goToPricing = useCallback(
    (extraState = {}) => {
      const { from = 'seller-wizard', ...rest } = extraState || {};
      navigate('/pricing', {
        state: {
          from,
          listingId,
          ...rest,
        },
      });
    },
    [navigate, listingId]
  );

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

  const reviewChecklist = useMemo(() => {
    if (!listing) {
      return {
        requirements: { missing_documents: [], has_boundary: false, can_submit: false },
        hasContact: false,
        hasAddress: false,
        hasPlan: false,
        missingDocuments: [],
        canSubmit: false,
      };
    }

    const requirements = listing.submission_requirements || {
      missing_documents: DOCUMENT_TYPES.filter((doc) => doc.key !== 'other').map((doc) => doc.key),
      has_boundary: Boolean(listing.boundary_polygon),
      can_submit: false,
    };
    const hasContact = Boolean(listing.contact_name && listing.contact_phone);
    const hasAddress = Boolean(
      listing.address_line1 &&
        listing.address_country &&
        listing.address_region &&
        listing.address_city
    );
    const missingDocuments = Array.isArray(requirements.missing_documents)
      ? requirements.missing_documents
      : [];
    const hasPlan = Boolean(listing.plan || listing.plan_details?.id);
    const canSubmit = Boolean(requirements.can_submit && hasContact && hasAddress && requirements.has_boundary && hasPlan);

    return { requirements, hasContact, hasAddress, hasPlan, missingDocuments, canSubmit };
  }, [listing]);

  const showMessage = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, severity, message });
  }, []);

  const clearFormError = useCallback((name) => {
    setFormErrors((prev) => {
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

  const validateOverview = useCallback(() => {
    const errors = {};
    const trimmedName = listingForm.name.trim();
    const trimmedType = listingForm.type.trim();

    if (!trimmedName) {
      errors.name = 'Ingresa un nombre descriptivo para la propiedad.';
    }

    if (!trimmedType) {
      errors.type = 'Define el tipo de propiedad.';
    }

    const priceValue = parseNumber(listingForm.price);
    const rentPriceValue = parseNumber(listingForm.rent_price);
    const sizeValue = parseNumber(listingForm.size);
    const listingType = listingForm.listing_type;
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

    return errors;
  }, [listingForm]);

  const validateOperations = useCallback(() => {
    const errors = {};
    const trimmedContactName = listingForm.contact_name.trim();
    const trimmedContactPhone = listingForm.contact_phone.trim();
    const trimmedAddressLine1 = listingForm.address_line1.trim();
    const trimmedCity = listingForm.address_city.trim();
    const trimmedRegion = listingForm.address_region.trim();
    const trimmedCountry = listingForm.address_country.trim();

    if (!trimmedContactName) {
      errors.contact_name = 'Indica quién coordinará las visitas.';
    }

    if (!trimmedContactPhone) {
      errors.contact_phone = 'Agrega un teléfono o WhatsApp válido.';
    }

    if (listingForm.contact_email && !validateEmail(listingForm.contact_email)) {
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
  }, [listingForm]);

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
        setListingForm(initialListingForm);
        setFormErrors({});
        setSavedBoundary(null);
        setBoundaryDraft(null);
        setBoundaryDirty(false);
        setBoundaryRemovalPending(false);
        return null;
      }
      const data = await marketplaceService.fetchProperty(id);
      setListing(data);
      setListingId(data.id);
      setListingForm({
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
        await Promise.all([loadPlans(), listingId ? loadListing(listingId) : Promise.resolve(null)]);
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

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    clearFormError(name);
    setListingForm((prev) => {
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

  const handleSwitchChange = (event) => {
    const { name, checked } = event.target;
    clearFormError(name);
    setListingForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleOverviewSubmit = async ({ advance = true } = {}) => {
    const errors = validateOverview();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showMessage('Revisa los campos obligatorios antes de continuar.', 'warning');
      return false;
    }

    setFormErrors({});

    const listingType = listingForm.listing_type;
    const includesSale = listingType === 'sale' || listingType === 'both';
    const includesRent = listingType === 'rent' || listingType === 'both';
    const priceValue = parseNumber(listingForm.price) ?? 0;
    const rentPriceValue = parseNumber(listingForm.rent_price) ?? 0;
    const sizeValue = parseNumber(listingForm.size) ?? 0;

    const payload = {
      name: listingForm.name,
      type: listingForm.type,
      description: listingForm.description?.trim() || '',
      price: includesSale ? priceValue : 0,
      size: sizeValue,
      listing_type: listingType,
      rent_price: includesRent ? rentPriceValue : null,
      has_water: Boolean(listingForm.has_water),
      has_views: Boolean(listingForm.has_views),
    };

    if (!listingId) {
      payload.contact_name = listingForm.contact_name?.trim() || '';
      payload.contact_email = listingForm.contact_email?.trim() || '';
      payload.contact_phone = listingForm.contact_phone?.trim() || '';
      payload.address_line1 = listingForm.address_line1?.trim() || '';
      payload.address_line2 = listingForm.address_line2?.trim() || '';
      payload.address_city = listingForm.address_city?.trim() || '';
      payload.address_region = listingForm.address_region?.trim() || '';
      payload.address_country = listingForm.address_country?.trim() || '';
      payload.address_postal_code = listingForm.address_postal_code?.trim() || '';
    }

    let success = false;
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
      success = true;
      if (advance) {
        setActiveStep((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error saving basic form', error);
      showMessage('No fue posible guardar la información. Revisa los campos.', 'error');
      success = false;
    } finally {
      setSaving(false);
    }
    return success;
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

  const locatePropertyOnMap = useCallback(async () => {
    if (!mapInstance) {
      showMessage('El mapa aún no está listo, intenta nuevamente en unos segundos.', 'warning');
      return;
    }

    const queryParts = [
      listingForm.address_line1,
      listingForm.address_city,
      listingForm.address_region,
      listingForm.address_country,
    ]
      .map((value) => value?.trim())
      .filter(Boolean);

    if (!queryParts.length) {
      showMessage('Completa al menos la dirección base para buscarla en el mapa.', 'warning');
      return;
    }

    if (!config.mapbox.accessToken) {
      showMessage('Configura el token de Mapbox para habilitar la búsqueda de direcciones.', 'warning');
      return;
    }

    const query = queryParts.join(', ');

    try {
      setLocating(true);
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${config.mapbox.accessToken}&language=es&limit=1`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Geocoding failed with status ${response.status}`);
      }
      const data = await response.json();
      const feature = data?.features?.[0];
      if (feature?.center?.length === 2) {
        mapInstance.flyTo({ center: feature.center, zoom: Math.max(mapInstance.getZoom() ?? 0, 13), duration: 1200 });
        showMessage('Dirección localizada en el mapa. Ajusta el polígono para mayor precisión.');
      } else {
        showMessage('No encontramos la ubicación con esa descripción. Ajusta la dirección y vuelve a intentar.', 'info');
      }
    } catch (error) {
      console.error('Error geocoding address', error);
      showMessage('No fue posible ubicar la dirección. Revisa la ortografía o prueba con una referencia distinta.', 'error');
    } finally {
      setLocating(false);
    }
  }, [listingForm.address_line1, listingForm.address_city, listingForm.address_region, listingForm.address_country, mapInstance, showMessage]);

  const persistBoundary = useCallback(
    async ({ withFeedback = true } = {}) => {
      if (!listingId) {
        if (withFeedback) {
          showMessage('Guarda primero la información de la propiedad.', 'warning');
        }
        return false;
      }

      if (!boundaryDirty && !boundaryRemovalPending) {
        if (withFeedback) {
          showMessage('No hay cambios en el polígono para guardar.', 'info');
        }
        return true;
      }

      try {
        if (withFeedback) {
          setSaving(true);
        }

        if (boundaryRemovalPending) {
          await marketplaceService.updateProperty(listingId, {
            boundary_polygon: null,
            longitude: null,
            latitude: null,
            size: null,
            has_boundary: false,
          });
          await loadListing(listingId);
          if (withFeedback) {
            showMessage('Polígono eliminado correctamente.');
          }
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
          if (withFeedback) {
            showMessage('Ubicación guardada correctamente.');
          }
        } else {
          if (withFeedback) {
            showMessage('Dibuja un polígono antes de guardar.', 'warning');
          }
          return false;
        }

        setBoundaryDirty(false);
        setBoundaryRemovalPending(false);
        return true;
      } catch (error) {
        console.error('Error saving boundary', error);
        if (withFeedback) {
          showMessage('No fue posible guardar el polígono.', 'error');
        }
        return false;
      } finally {
        if (withFeedback) {
          setSaving(false);
        }
      }
    },
    [
      listingId,
      boundaryDirty,
      boundaryRemovalPending,
      boundaryDraft,
      loadListing,
      showMessage,
    ]
  );

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

  const handleOperationsSubmit = async ({ advance = true } = {}) => {
    const errors = validateOperations();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      showMessage('Completa los datos de coordinación antes de continuar.', 'warning');
      return false;
    }

    if (!listingId) {
      showMessage('Guarda primero la información de la propiedad.', 'warning');
      return false;
    }

    let success = false;
    try {
      setSaving(true);
      const boundaryResult = await persistBoundary({ withFeedback: false });
      if (!boundaryResult && (boundaryDirty || boundaryRemovalPending)) {
        // Si hubo error al guardar el polígono, abortamos sin continuar.
        return false;
      }

      const payload = {
        contact_name: listingForm.contact_name?.trim() || '',
        contact_email: listingForm.contact_email?.trim() || '',
        contact_phone: listingForm.contact_phone?.trim() || '',
        address_line1: listingForm.address_line1?.trim() || '',
        address_line2: listingForm.address_line2?.trim() || '',
        address_city: listingForm.address_city?.trim() || '',
        address_region: listingForm.address_region?.trim() || '',
        address_country: listingForm.address_country?.trim() || '',
        address_postal_code: listingForm.address_postal_code?.trim() || '',
        preferred_time_windows: timeSlots,
        access_notes: accessNotes,
      };

      await marketplaceService.updateProperty(listingId, payload);
      await loadListing(listingId);
      showMessage('Coordinación operativa actualizada.');
      if (advance) {
        setActiveStep((prev) => prev + 1);
      }
      success = true;
    } catch (error) {
      console.error('Error saving operations data', error);
      showMessage('No se pudieron guardar los datos operativos.', 'error');
    } finally {
      setSaving(false);
    }
    return success;
  };

  const handleSaveForLater = async () => {
    if (saving) return;

    const stepKey = steps[activeStep].key;

    if (!listingId && stepKey !== 'overview') {
      showMessage('Guarda primero los datos básicos para crear la publicación.', 'warning');
      return;
    }

    if (stepKey === 'overview') {
      const saved = await handleOverviewSubmit({ advance: false });
      if (!saved) return;
    } else if (stepKey === 'operations') {
      const saved = await handleOperationsSubmit({ advance: false });
      if (!saved) return;
    }

    navigate('/dashboard');
  };

  const handleSubmitForReview = async () => {
    if (!listingId) return;

    if (!reviewChecklist.hasPlan) {
      showMessage('Selecciona un plan activo antes de publicar. Te llevaremos a la sección de planes.', 'info');
      goToPricing({ from: 'seller-listing-review' });
      return;
    }

    if (!reviewChecklist.canSubmit) {
      showMessage('Aún faltan requisitos para enviar la publicación.', 'warning');
      return;
    }

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

  
const renderOverviewStep = () => {
  const includesRent = listingForm.listing_type === 'rent' || listingForm.listing_type === 'both';
  const includesSale = listingForm.listing_type === 'sale' || listingForm.listing_type === 'both';

  return (
    <Stack spacing={3}>
      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Identidad del terreno
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define los datos esenciales que verán los compradores y que usaremos para perfilar la operación en terreno.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre del terreno"
                name="name"
                value={listingForm.name}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.name)}
                helperText={formErrors.name || 'Por ejemplo: “Campo Los Boldos” o “Parcela en Lago Ranco”.'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Tipo de propiedad"
                name="type"
                value={listingForm.type}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.type)}
                helperText={formErrors.type || 'Ejemplos: terreno agrícola, parcela urbanizada, predio forestal.'}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="listing-type-label">Tipo de publicación</InputLabel>
                <Select
                  labelId="listing-type-label"
                  label="Tipo de publicación"
                  name="listing_type"
                  value={listingForm.listing_type}
                  onChange={handleFieldChange}
                >
                  <MenuItem value="sale">Venta</MenuItem>
                  <MenuItem value="rent">Arriendo</MenuItem>
                  <MenuItem value="both">Venta y arriendo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {includesSale && (
              <Grid item xs={12} md={4}>
                <TextField
                  label="Precio de venta (USD)"
                  name="price"
                  type="number"
                  value={listingForm.price}
                  onChange={handleFieldChange}
                  fullWidth
                  required
                  error={Boolean(formErrors.price)}
                  helperText={formErrors.price || 'Indica el precio total solicitado.'}
                  InputProps={{ inputProps: { min: 0, step: 100 } }}
                />
              </Grid>
            )}
            {includesRent && (
              <Grid item xs={12} md={4}>
                <TextField
                  label="Precio de arriendo mensual (USD)"
                  name="rent_price"
                  type="number"
                  value={listingForm.rent_price}
                  onChange={handleFieldChange}
                  fullWidth
                  required
                  error={Boolean(formErrors.rent_price)}
                  helperText={formErrors.rent_price || 'Si arriendas por temporada, acláralo en la descripción.'}
                  InputProps={{ inputProps: { min: 0, step: 50 } }}
                />
              </Grid>
            )}
            <Grid item xs={12} md={4}>
              <TextField
                label="Superficie (hectáreas)"
                name="size"
                type="number"
                value={listingForm.size}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.size)}
                helperText={formErrors.size || 'Redondea a dos decimales si es necesario.'}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>
          </Grid>

          <Divider />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Descripción"
                name="description"
                value={listingForm.description}
                onChange={handleFieldChange}
                fullWidth
                multiline
                minRows={4}
                helperText="Resalta atributos únicos, accesos, servidumbres y potencial de uso."
              />
            </Grid>
            <Grid item xs={12}>
              <FormGroup row>
                <FormControlLabel
                  control={<Switch checked={Boolean(listingForm.has_water)} onChange={handleSwitchChange} name="has_water" />}
                  label="Cuenta con acceso a agua"
                />
                <FormControlLabel
                  control={<Switch checked={Boolean(listingForm.has_views)} onChange={handleSwitchChange} name="has_views" />}
                  label="Tiene vistas destacadas"
                />
              </FormGroup>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Alert severity="info" variant="outlined">
        Podrás definir ubicación, contacto operativo y plan de publicación en los siguientes pasos sin perder la información ingresada.
      </Alert>
    </Stack>
  );
};

const renderDocumentsStep = () => (
  <Stack spacing={3}>
    <Paper sx={SECTION_CARD_SX}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Documentación de respaldo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adjunta los documentos que acrediten dominio y características del terreno. Esto acelera la revisión y aumenta la confianza de los compradores.
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          {DOCUMENT_TYPES.map((doc) => {
            const existing = currentDocuments.find((d) => d.doc_type === doc.key);
            return (
              <Box
                key={doc.key}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: 2,
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 3,
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  backgroundColor: 'rgba(248, 249, 255, 0.8)',
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {doc.label}
                    </Typography>
                    {existing && (
                      <Chip
                        size="small"
                        label={DOC_STATUS_LABELS[existing.status] || existing.status}
                        color={DOC_STATUS_COLOR[existing.status] || 'default'}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Paper>

    <Alert severity="info" variant="outlined">
      Puedes continuar sin subir todos los archivos, pero necesitaremos al menos escritura, plano y certificado para publicar.
    </Alert>
  </Stack>
);

const renderOperationsStep = () => {
  const hasSavedBoundary = Boolean(savedBoundary?.geojson);
  const hasDraftBoundary = Boolean(boundaryDraft?.geojson);
  const areaLabel = boundaryRemovalPending || boundaryAreaHa == null ? '—' : `${boundaryAreaHa.toFixed(2)} ha`;

  let statusSeverity = 'warning';
  let statusMessage = 'Dibuja los límites del terreno para que el equipo operativo pueda ubicarlo con precisión.';

  if (boundaryRemovalPending) {
    statusSeverity = 'warning';
    statusMessage = 'Eliminarás el polígono guardado al confirmar los cambios. Si fue un error, vuelve a dibujarlo antes de guardar.';
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
  const canPersistBoundary = boundaryDirty || boundaryRemovalPending;
  const canRecenter =
    Boolean(mapInstance) &&
    Boolean((boundaryDirty && !boundaryRemovalPending && hasDraftBoundary) || (!boundaryDirty && hasSavedBoundary));

  return (
    <Stack spacing={3}>
      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Contacto operativo y agenda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Indica quién coordinará en terreno y define ventanas de visita para agilizar la programación del vuelo.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                label="Nombre del contacto"
                name="contact_name"
                value={listingForm.contact_name}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.contact_name)}
                helperText={formErrors.contact_name || 'Persona que abrirá el campo o atenderá visitas.'}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Correo del contacto"
                name="contact_email"
                value={listingForm.contact_email}
                onChange={handleFieldChange}
                fullWidth
                error={Boolean(formErrors.contact_email)}
                helperText={formErrors.contact_email || 'Usaremos este correo para enviar confirmaciones y reportes.'}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Teléfono o WhatsApp"
                name="contact_phone"
                value={listingForm.contact_phone}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.contact_phone)}
                helperText={formErrors.contact_phone || 'Incluye código de país. Ej: +56 9 1234 5678.'}
              />
            </Grid>
          </Grid>

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Disponibilidad sugerida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Agrega bloques tentativos para coordinar al equipo de vuelo. Puedes editarlos en cualquier momento.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Fecha"
                type="date"
                value={timeSlotDraft.day}
                onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, day: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
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
              {!timeSlots.length && (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay bloques registrados.
                </Typography>
              )}
            </Stack>
          </Box>

          <TextField
            label="Instrucciones de acceso (portón, referencias, seguridad...)"
            value={accessNotes}
            onChange={(event) => setAccessNotes(event.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Ubicación y polígono
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usa una sola búsqueda para posicionar el terreno y dibuja el polígono que utilizaremos como referencia oficial.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Dirección o punto de referencia"
                name="address_line1"
                value={listingForm.address_line1}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.address_line1)}
                helperText={formErrors.address_line1 || 'Puedes usar coordenadas o una descripción clara si no existe dirección formal.'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Detalle adicional (interior, lote, portón...)"
                name="address_line2"
                value={listingForm.address_line2}
                onChange={handleFieldChange}
                fullWidth
                helperText="Información opcional para llegar sin perder tiempo."
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Ciudad / Comuna"
                name="address_city"
                value={listingForm.address_city}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.address_city)}
                helperText={formErrors.address_city || 'Es clave para programar al operador local.'}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Región / Estado"
                name="address_region"
                value={listingForm.address_region}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.address_region)}
                helperText={formErrors.address_region || 'Asegura una ubicación precisa para logística y permisos.'}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="País"
                name="address_country"
                value={listingForm.address_country}
                onChange={handleFieldChange}
                fullWidth
                required
                error={Boolean(formErrors.address_country)}
                helperText={formErrors.address_country || 'Selecciona el país del predio.'}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Código postal"
                name="address_postal_code"
                value={listingForm.address_postal_code}
                onChange={handleFieldChange}
                fullWidth
                helperText="Opcional, pero útil para notificaciones y logística."
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button
              variant="outlined"
              onClick={locatePropertyOnMap}
              disabled={locating}
              startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
            >
              {locating ? 'Buscando...' : 'Buscar en el mapa'}
            </Button>
            <Typography variant="body2" color="text.secondary">
              Ajusta la dirección y reutiliza esta búsqueda para posicionar el polígono solo una vez.
            </Typography>
          </Stack>

          <Alert severity={statusSeverity} variant="outlined">
            {statusMessage}
          </Alert>

          <Box sx={{ position: 'relative', height: { xs: 360, md: 420 }, borderRadius: 3, overflow: 'hidden' }}>
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
              <Button
                variant="contained"
                onClick={async () => {
                  await persistBoundary({ withFeedback: true });
                }}
                disabled={saving || !canPersistBoundary}
              >
                Guardar polígono
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};

const renderReviewStep = () => {
  const { requirements, hasContact, hasAddress, hasPlan, missingDocuments, canSubmit } = reviewChecklist;
  const planName = listing?.plan_details?.name;

  const blockingMessage = !requirements.has_boundary
    ? 'Dibuja y guarda el polígono del terreno para continuar.'
    : !hasContact
    ? 'Agrega un nombre y teléfono de contacto para coordinar el vuelo.'
    : !hasAddress
    ? 'Completa la dirección principal para orientar al piloto.'
    : !hasPlan
    ? 'Selecciona un plan activo para habilitar la publicación.'
    : missingDocuments.length
    ? `Faltan documentos aprobados: ${missingDocuments.map((code) => DOCUMENT_LABEL_MAP[code] || code).join(', ')}.`
    : null;

  return (
    <Stack spacing={3}>
      {!canSubmit && blockingMessage && (
        <Alert severity="warning" variant="outlined">
          {blockingMessage}
        </Alert>
      )}

      {!hasPlan && (
        <Alert
          severity="info"
          variant="outlined"
          action={
            <Button color="inherit" size="small" onClick={() => goToPricing({ from: 'seller-review-alert' })}>
              Ver planes
            </Button>
          }
        >
          Necesitas un plan activo para publicar. Puedes contratarlo sin perder el progreso actual.
        </Alert>
      )}

      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Resumen de la publicación
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revisa que toda la información sea correcta antes de enviar a revisión.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {listing?.name || 'Nombre pendiente'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {[listing?.type, listing?.size ? `${listing.size} ha` : null]
                .filter(Boolean)
                .join(' • ') || 'Completa los datos de la propiedad en el paso 1.'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {listing?.description || 'Sin descripción registrada.'}
            </Typography>
          </Box>

          <Divider />

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Contacto operativo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {listing?.contact_name || 'Nombre pendiente'} · {listing?.contact_phone || 'Teléfono pendiente'}
              </Typography>
              {listing?.contact_email && (
                <Typography variant="body2" color="text.secondary">
                  {listing.contact_email}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Dirección de grabación
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[listing?.address_line1, listing?.address_line2].filter(Boolean).join(', ') || 'Dirección pendiente'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[listing?.address_city, listing?.address_region, listing?.address_country]
                  .filter(Boolean)
                  .join(', ') || 'Completa ciudad y país para coordinar el vuelo.'}
              </Typography>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Plan contratado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              El plan define la visibilidad de tu publicación y el acompañamiento del equipo SkyTerra.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {planName || 'Sin plan asignado'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!planName ? 'Selecciona un plan para activar la publicación.' : 'Puedes cambiar de plan en cualquier momento antes de publicar.'}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="outlined" onClick={() => goToPricing({ from: 'seller-plan-card' })}>
              Ver planes disponibles
            </Button>
            {plans
              .filter((plan) => plan.is_active !== false)
              .slice(0, 2)
              .map((plan) => (
                <Button
                  key={plan.id}
                  variant="text"
                  onClick={() => goToPricing({ highlightPlan: plan.id })}
                >
                  {plan.name}
                </Button>
              ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={SECTION_CARD_SX}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Seguimiento y estado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Consulta el historial de revisión y la trazabilidad de tu publicación.
            </Typography>
          </Box>
          <StatusBar status={listing?.status_bar} />
          <Divider />
          <Stack spacing={1}>
            {(listing?.status_history || []).slice(0, 6).map((entry) => (
              <Paper key={entry.id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
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
        </Stack>
      </Paper>
    </Stack>
  );
};

const renderStepContent = () => {
  switch (steps[activeStep].key) {
    case 'overview':
      return renderOverviewStep();
    case 'documents':
      return renderDocumentsStep();
    case 'operations':
      return renderOperationsStep();
    case 'review':
      return renderReviewStep();
    default:
      return null;
  }
};

const renderStepActions = () => {
  const stepKey = steps[activeStep].key;

  switch (stepKey) {
    case 'overview':
      return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button variant="text" onClick={handleSaveForLater} disabled={saving}>
            Seguir más tarde
          </Button>
          <Button variant="contained" onClick={() => handleOverviewSubmit({ advance: true })} disabled={saving}>
            Guardar y continuar
          </Button>
        </Stack>
      );
    case 'documents':
      return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button variant="text" onClick={handleSaveForLater} disabled={saving}>
            Seguir más tarde
          </Button>
          <Button variant="outlined" onClick={handleBack} disabled={saving}>
            Atrás
          </Button>
          <Button variant="contained" onClick={() => setActiveStep((prev) => prev + 1)} disabled={saving}>
            Continuar
          </Button>
        </Stack>
      );
    case 'operations':
      return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button variant="text" onClick={handleSaveForLater} disabled={saving}>
            Seguir más tarde
          </Button>
          <Button variant="outlined" onClick={handleBack} disabled={saving}>
            Atrás
          </Button>
          <Button
            variant="contained"
            onClick={() => handleOperationsSubmit({ advance: true })}
            disabled={saving}
          >
            Guardar y continuar
          </Button>
        </Stack>
      );
    case 'review':
      return (
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
            <Button variant="text" onClick={handleSaveForLater} disabled={saving}>
              Seguir más tarde
            </Button>
            <Button variant="outlined" onClick={handleBack} disabled={saving}>
              Atrás
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitForReview}
              disabled={saving || !reviewChecklist.canSubmit}
            >
              Enviar a revisión
            </Button>
          </Stack>
        </Stack>
      );
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

const headerSubtitle = listingId
  ? 'Actualiza los datos clave de tu publicación sin perder el contexto.'
  : 'Completa los pasos para preparar tu publicación y coordinar al equipo de operaciones.';

return (
  <Box sx={{ backgroundColor: '#f5f7fb', minHeight: '100vh', py: { xs: 6, md: 8 } }}>
    <Container maxWidth="xl">
      <Grid container spacing={4}>
        <Grid item xs={12} md={4} lg={3}>
          <Stack spacing={3}>
            <Paper
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 4,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                backgroundColor: '#ffffff',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: '.12em', color: 'text.secondary' }}>
                  Progreso
                </Typography>
                <Stack spacing={1.5}>
                  {steps.map((step, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;
                    return (
                      <Box
                        key={step.key}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: isActive ? 'primary.main' : 'rgba(15, 23, 42, 0.12)',
                          backgroundColor: isActive ? 'primary.main' : '#fff',
                          color: isActive ? '#fff' : 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '.1em', opacity: 0.72, display: 'block' }}>
                            Paso {index + 1}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {step.label}
                          </Typography>
                        </Box>
                        {isCompleted ? (
                          <CheckCircleRoundedIcon fontSize="small" sx={{ color: isActive ? '#fff' : 'success.main' }} />
                        ) : (
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {index + 1}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>

            <Paper
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 4,
                border: '1px solid rgba(15, 23, 42, 0.08)',
                backgroundColor: '#ffffff',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: '.12em', color: 'text.secondary' }}>
                Estado actual
              </Typography>
              {listing ? (
                <StatusBar status={listing?.status_bar} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Guarda el primer paso para habilitar el seguimiento de revisión.
                </Typography>
              )}
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '.1em', color: 'text.secondary' }}>
                  Plan
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {listing?.plan_details?.name || 'Sin plan activo'}
                </Typography>
              </Box>
              <Button variant="text" size="small" onClick={() => goToPricing({ from: 'seller-sidebar' })} sx={{ alignSelf: 'flex-start' }}>
                Ver planes
              </Button>
            </Paper>
          </Stack>
        </Grid>

        <Grid item xs={12} md={8} lg={9}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: '.16em', color: 'text.secondary' }}>
                Publicaciones
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {listingId ? 'Editar publicación' : 'Nueva publicación'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {headerSubtitle}
              </Typography>
            </Box>

            {renderStepContent()}

            {renderStepActions()}
          </Stack>
        </Grid>
      </Grid>
    </Container>
    <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}>
      <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);

};

export default SellerListingWizard;
