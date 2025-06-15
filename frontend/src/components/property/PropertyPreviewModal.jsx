import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

/**
 * Modal translúcido que muestra una vista previa limitada de una propiedad.
 * Props:
 *  - open: boolean para controlar visibilidad
 *  - onClose: callback para cerrar
 *  - propertyId: ID de la propiedad a cargar (usa endpoint /api/properties-preview/:id/)
 */
const PropertyPreviewModal = ({ open, onClose, propertyId }) => {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!open || !propertyId) return;
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await axios.get(`/api/properties-preview/${propertyId}/`);
        setProperty(resp.data);
      } catch (err) {
        setError('Error al cargar datos de la propiedad');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [open, propertyId]);

  const handleRegister = () => {
    // redirige al flujo de registro conservando la ruta para volver
    const current = window.location.pathname + window.location.search;
    window.location.href = `/register?next=${encodeURIComponent(current)}`;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{
        sx: {
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          backgroundColor: 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Vista Previa de Propiedad</Typography>
        <IconButton onClick={onClose} size="large"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 360 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error">{error}</Typography>
        )}
        {property && (
          <Box>
            {/* Galería simple */}
            {property.images && property.images.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
                  <Box component="img" src={property.images[slideIndex].url} alt={property.name}
                       sx={{ width: '100%', height: 280, objectFit: 'cover', transition:'opacity 0.4s' }} />
                  {property.images.length > 1 && (
                    <>
                      <IconButton size="small" onClick={() => setSlideIndex((slideIndex - 1 + property.images.length) % property.images.length)}
                        sx={{ position:'absolute', top:'50%', left:8, transform:'translateY(-50%)', backgroundColor:'rgba(0,0,0,0.4)', color:'#fff' }}>
                        ‹
                      </IconButton>
                      <IconButton size="small" onClick={() => setSlideIndex((slideIndex + 1) % property.images.length)}
                        sx={{ position:'absolute', top:'50%', right:8, transform:'translateY(-50%)', backgroundColor:'rgba(0,0,0,0.4)', color:'#fff' }}>
                        ›
                      </IconButton>
                    </>
                  )}
                </Box>
                <Box sx={{ textAlign:'center', mt:1 }}>
                  {property.images.map((_, idx) => (
                    <Box key={idx} component="span" sx={{ width:8, height:8, mx:0.5, borderRadius:'50%', display:'inline-block', backgroundColor: idx===slideIndex? 'primary.main':'rgba(255,255,255,0.4)'}} />
                  ))}
                </Box>
              </Box>
            )}

            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{property.name}</Typography>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
              Precio: {property.price ? Number(property.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—'}
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Tamaño: {property.size} ha
            </Typography>

            <Button variant="contained" color="primary" size="large" fullWidth onClick={handleRegister}>
              Ver Tour 360° y Detalles Completos (Regístrate Gratis)
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PropertyPreviewModal; 