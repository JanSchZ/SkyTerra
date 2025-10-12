import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import Pano2VRViewer from '../tours/Pano2VRViewer';
import UploadTourDialog from '../tours/UploadTourDialog';
import { api, tourService } from '../../services/api';

/**
 * Dialogo de gestión de tours por propiedad
 */
export default function ManagePropertyToursDialog({ open, onClose, propertyId, propertyName, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tours, setTours] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTours = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError('');
      const data = await tourService.getPropertyTours(propertyId);
      setTours(Array.isArray(data.results) ? data.results : data);
    } catch (e) {
      setError('Error al cargar los tours de la propiedad');
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (open) loadTours();
  }, [open, loadTours]);

  const activeTour = tours && tours.length > 0 ? tours[0] : null; // Backend limita a 1 tour activo por propiedad

  const handleDelete = async () => {
    if (!activeTour) return;
    try {
      setDeleting(true);
      // obtener CSRF de forma explícita si aplica
      let headers = {};
      try {
        const csrfResp = await api.get('/auth/csrf/', { skipAuth: true });
        const csrfToken = csrfResp?.data?.csrfToken;
        if (csrfToken) headers['X-CSRFToken'] = csrfToken;
      } catch (error) { void error; }
      await api.delete(`/tours/${activeTour.id}/`, { headers });
      await loadTours();
      onChange?.();
    } catch (e) {
      setError('No se pudo eliminar el tour');
    } finally {
      setDeleting(false);
    }
  };

  const StatusChip = () => {
    if (!activeTour) return <Chip label="Sin tour" size="small" />;
    if (!activeTour.url && activeTour.package_path) {
      return <Chip icon={<HourglassEmptyIcon />} label="Procesando" color="warning" size="small" />;
    }
    if (!activeTour.url) {
      return <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />;
    }
    return <Chip icon={<CheckCircleIcon />} label="Activo" color="success" size="small" />;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="h6">Tours 360° de: {propertyName || `#${propertyId}`}</Typography>
            <Box>
              <Tooltip title="Refrescar">
                <IconButton onClick={loadTours} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : activeTour ? (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusChip />
                  <Typography variant="body2" color="text.secondary">
                    {activeTour.name || 'Tour 360°'} • {activeTour.uploaded_at ? new Date(activeTour.uploaded_at).toLocaleString('es-CL') : '—'}
                  </Typography>
                </Box>
                <Box>
                  {activeTour.url && (
                    <Tooltip title="Abrir en nueva pestaña">
                      <IconButton href={activeTour.url} target="_blank" rel="noopener noreferrer">
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Eliminar tour">
                    <span>
                      <IconButton color="error" onClick={handleDelete} disabled={deleting}>
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ height: 420, borderRadius: 2, overflow: 'hidden', border: theme => `1px solid ${theme.palette.divider}` }}>
                {activeTour.url ? (
                  <Pano2VRViewer src={activeTour.url} title={activeTour.name || propertyName || 'Tour 360°'} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">El tour aún se está procesando…</Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" gutterBottom>Esta propiedad no tiene tour 360°</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Sube un paquete de tour (.zip o .ggpkg) para crear un tour.
              </Typography>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)}>
                Subir tour 360°
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)}>
            {activeTour ? 'Reemplazar tour' : 'Subir tour'}
          </Button>
        </DialogActions>
      </Dialog>

      <UploadTourDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        propertyId={propertyId}
        onUploaded={async () => {
          setUploadOpen(false);
          await loadTours();
          onChange?.();
        }}
      />
    </>
  );
}

