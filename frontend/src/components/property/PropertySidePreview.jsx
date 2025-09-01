import React from 'react';
import { Box, Typography, Button, IconButton, CardMedia, Paper, Snackbar, Alert } from '@mui/material';
import CircularPlusvalia from '../ui/CircularPlusvalia';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { motion, AnimatePresence } from 'framer-motion';
import { favoritesService } from '../../services/api';
import { AuthContext } from '../../App';

const PropertySidePreview = ({ open, property, previewUrl, onClose, onGo, getPriceDisplay }) => {
  const { isAuthenticated } = React.useContext(AuthContext) || { isAuthenticated: false };
  const [isSaved, setIsSaved] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'info' });

  React.useEffect(() => {
    let mounted = true;
    const checkFav = async () => {
      try {
        if (!property?.id) { setIsSaved(false); return; }
        if (!isAuthenticated) { setIsSaved(false); return; }
        const favs = await favoritesService.list();
        if (!mounted) return;
        setIsSaved(!!favs.find((f) => (f.property === property.id) || (f.property_details && f.property_details.id === property.id)));
      } catch (_) { setIsSaved(false); }
    };
    checkFav();
    return () => { mounted = false; };
  }, [isAuthenticated, property?.id]);

  const toggleSave = async () => {
    if (!property?.id) return;
    if (!isAuthenticated) {
      setSnackbar({ open: true, message: 'Inicia sesión para guardar propiedades.', severity: 'warning' });
      return;
    }
    const next = !isSaved;
    setIsSaved(next); // Optimistic update
    try {
      if (next) {
        await favoritesService.add(property.id);
      } else {
        const favs = await favoritesService.list();
        const fav = favs.find((f) => f.property === property.id || (f.property_details && f.property_details.id === property.id));
        if (fav) await favoritesService.remove(fav.id);
      }
    } catch (e) {
      // If unauthorized, keep visual state as pressed; otherwise revert
      const status = e?.response?.status;
      if (status === 401) {
        setIsSaved(!next);
        setSnackbar({ open: true, message: 'Inicia sesión para guardar propiedades.', severity: 'warning' });
      } else if (status && status !== 401) {
        setIsSaved(!next);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && property && (
        <motion.div
          initial={{ x: -380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -380, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', top: 120, left: 16, zIndex: 1300 }}
        >
          <Paper
            variant="glass"
            elevation={6}
            sx={{ width: 320, p: 2, backdropFilter:'blur(12px) saturate(120%)', WebkitBackdropFilter:'blur(12px) saturate(120%)', backgroundColor:'rgba(20,20,24,0.28)', border:'1px solid rgba(255,255,255,0.18)', display:'flex', flexDirection:'column', color:'#ffffff', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}
          >
            {/* Preview - 1:1 aspect ratio */}
            <Box sx={{ position:'relative', width:'100%', height:280, mb:1.5, borderRadius:1, overflow:'hidden' }}>
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
                  title="Tour Preview"
                />
              ) : (
                property?.images?.length > 0 && (
                  <CardMedia component="img" image={property.images[0].url} alt={property.name} sx={{ width:'100%', height:'100%', objectFit:'cover' }} />
                )
              )}
              {/* Bookmark toggle */}
              <IconButton 
                onClick={toggleSave}
                sx={{ 
                  position:'absolute',
                  top:8,
                  left:10,
                  padding:0,
                  minWidth:0,
                  backgroundColor:'rgba(0,0,0,0.25)',
                  border:'1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  borderRadius: '10px',
                  color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.85)',
                  '&:hover':{ color: isSaved ? '#ffffff' : 'rgba(255,255,255,0.95)', backgroundColor: 'rgba(0,0,0,0.32)' },
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
              >
                {isSaved ? (
                  <BookmarkIcon sx={{ color:'#ffffff', fontSize: 28 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: 28 }} />
                )}
              </IconButton>
              <IconButton 
                onClick={onClose} 
                sx={{ 
                  position:'absolute',
                  top:2,
                  right:2,
                  width:28,
                  height:28,
                  padding:0,
                  minWidth:0,
                  backgroundColor:'transparent',
                  color:'rgba(255,255,255,0.9)',
                  '&:hover':{ backgroundColor:'rgba(255,255,255,0.06)' }
                }}
              >
                <CloseIcon fontSize="small" sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>

            {/* Details in two-column layout */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Left column - Property details */}
              <Box sx={{ flex: 1 }}>
              { /* normalize price label to remove "/mes" */ }
              { /* priceLabelClean computed below in render scope */ }
              
                <Box sx={{ display:'inline-block', mb:0.75, px:1, py:0.5, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight:500, fontSize: '0.95rem', color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.01em' }}>{property.name}</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem', color: 'rgba(255,255,255,0.88)' }}>
                  Precio: {getPriceDisplay ? getPriceDisplay(property).replace(/\s*\/mes\s*$/, '') : 'N/D'}
                </Typography>
                <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem', color: 'rgba(255,255,255,0.88)' }}>Tamaño: {Number(property.size).toLocaleString('es-CL')} ha</Typography>
                {property.bedrooms && (
                  <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem' }}>Dormitorios: {property.bedrooms}</Typography>
                )}
                {property.bathrooms && (
                  <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem' }}>Baños: {property.bathrooms}</Typography>
                )}
                {property.parking_spaces && (
                  <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem' }}>Estacionamientos: {property.parking_spaces}</Typography>
                )}
              </Box>

              {/* Right column - Plusvalía score */}
              {property.plusvalia_score !== undefined && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', pt: 0.5 }}>
                  <CircularPlusvalia value={Number(property.plusvalia_score)} size={56} strokeWidth={6} />
                  <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.8)', mt: 0.5, textAlign: 'center' }}>Plusvalía</Typography>
                </Box>
              )}
            </Box>

            {/* Centered button */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                size="small"
                onClick={onGo}
                sx={{ 
                  minWidth: '80px',
                  px: 3,
                  py: 1,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.20)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)', boxShadow: '0 8px 24px rgba(0,0,0,0.26)' }
                }}
              >
                Ir
              </Button>
            </Box>
          </Paper>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertySidePreview; 