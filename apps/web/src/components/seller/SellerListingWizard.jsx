import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import Map from 'react-map-gl';
import { NavigationControl } from 'react-map-gl';
import * as turf from '@turf/turf';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService.js';
import StatusBar from './StatusBar.jsx';
import PropertyBoundaryDraw from '../map/PropertyBoundaryDraw.jsx';
import config from '../../config/environment';

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
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotDraft, setTimeSlotDraft] = useState({ day: '', from: '', to: '' });
  const [accessNotes, setAccessNotes] = useState('');
  const [pendingBoundary, setPendingBoundary] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });

  const currentDocuments = useMemo(() => listing?.documents ?? [], [listing]);

  const showMessage = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, severity, message });
  }, []);

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
      });
      setAccessNotes(data.access_notes || '');
      setTimeSlots(Array.isArray(data.preferred_time_windows) ? data.preferred_time_windows : []);
      if (data.boundary_polygon) {
        setPendingBoundary(data.boundary_polygon);
      }
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
    setBasicForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBasicSubmit = async () => {
    const payload = {
      name: basicForm.name,
      type: basicForm.type,
      description: basicForm.description,
      price: Number(basicForm.price || 0),
      size: Number(basicForm.size || 0),
      listing_type: basicForm.listing_type,
      rent_price: basicForm.listing_type !== 'sale' ? Number(basicForm.rent_price || 0) : null,
      plan: basicForm.plan || null,
      has_water: Boolean(basicForm.has_water),
      has_views: Boolean(basicForm.has_views),
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

  const handleBoundaryUpdate = useCallback((feature) => {
    setPendingBoundary(feature);
  }, []);

  const saveBoundary = async () => {
    if (!listingId) {
      showMessage('Guarda primero la información básica.', 'warning');
      return;
    }
    if (!pendingBoundary) {
      showMessage('Dibuja un polígono antes de guardar.', 'warning');
      return;
    }
    try {
      setSaving(true);
      const centroid = turf.centroid(pendingBoundary)?.geometry?.coordinates;
      const area = turf.area(pendingBoundary);
      const sizeHa = area ? Number((area / 10000).toFixed(2)) : undefined;
      const payload = {
        boundary_polygon: pendingBoundary,
      };
      if (centroid?.length === 2) {
        payload.longitude = centroid[0];
        payload.latitude = centroid[1];
      }
      if (sizeHa && Number.isFinite(sizeHa)) {
        payload.size = sizeHa;
      }
      await marketplaceService.updateProperty(listingId, payload);
      await loadListing(listingId);
      showMessage('Ubicación guardada correctamente.');
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
    setTimeSlots((prev) => [...prev, { ...timeSlotDraft }]);
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

  const renderBasicStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          label="Nombre del terreno"
          name="name"
          value={basicForm.name}
          onChange={handleBasicChange}
          fullWidth
          required
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
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
                {plan.name} — ${plan.price}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField label="Tipo (ej: Terreno agrícola)" name="type" value={basicForm.type} onChange={handleBasicChange} fullWidth />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          label="Precio (USD)"
          name="price"
          type="number"
          value={basicForm.price}
          onChange={handleBasicChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          label="Tamaño (hectáreas)"
          name="size"
          type="number"
          value={basicForm.size}
          onChange={handleBasicChange}
          fullWidth
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
      {(basicForm.listing_type === 'rent' || basicForm.listing_type === 'both') && (
        <Grid item xs={12} md={4}>
          <TextField
            label="Precio arriendo"
            name="rent_price"
            type="number"
            value={basicForm.rent_price}
            onChange={handleBasicChange}
            fullWidth
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          label="Descripción"
          name="description"
          value={basicForm.description}
          onChange={handleBasicChange}
          multiline
          minRows={4}
          fullWidth
        />
      </Grid>
    </Grid>
  );

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

  const renderBoundaryStep = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Dibuja el polígono que representa la propiedad. Ajusta tanto como necesites y asegúrate que el área sea representativa.
      </Typography>
      <Box sx={{ position: 'relative', height: 400, borderRadius: 2, overflow: 'hidden' }}>
        <Map
          initialViewState={{
            latitude: listing?.latitude || -33.4489,
            longitude: listing?.longitude || -70.6693,
            zoom: listing?.boundary_polygon ? 15 : 4,
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
              existingBoundaries={listing?.boundary_polygon}
            />
          )}
        </Map>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="text.secondary">
            Área estimada: {pendingBoundary ? `${(turf.area(pendingBoundary) / 10000).toFixed(2)} ha` : listing?.size ? `${listing.size} ha` : '—'}
          </Typography>
        </Box>
        <Button variant="contained" onClick={saveBoundary} disabled={saving}>
          Guardar polígono
        </Button>
      </Stack>
    </Stack>
  );

  const renderPreferencesStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1">Ventanas horarias sugeridas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Agrega disponibilidad estimada para coordinar la visita del piloto.
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Fecha (YYYY-MM-DD)"
            value={timeSlotDraft.day}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, day: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Desde (HH:MM)"
            value={timeSlotDraft.from}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, from: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Hasta (HH:MM)"
            value={timeSlotDraft.to}
            onChange={(event) => setTimeSlotDraft((prev) => ({ ...prev, to: event.target.value }))}
            fullWidth
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
      </Paper>
      <Box>
        <StatusBar status={listing?.status_bar} />
      </Box>
      {!requirements.can_submit && (
        <Alert severity="warning">
          {requirements.has_boundary ? 'Faltan documentos aprobados para continuar.' : 'Dibuja y guarda el polígono del terreno para continuar.'}
          {!!requirements.missing_documents?.length && (
            <Box component="span"> Documentos pendientes: {requirements.missing_documents.map((code) => DOCUMENT_LABEL_MAP[code] || code).join(', ')}.</Box>
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
        <Button variant="contained" color="primary" onClick={handleSubmitForReview} disabled={saving || !listingId || !requirements.can_submit}>
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
