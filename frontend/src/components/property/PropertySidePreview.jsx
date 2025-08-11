import React from 'react';
import { Box, Typography, Button, IconButton, CardMedia, Paper } from '@mui/material';
import CircularPlusvalia from '../ui/CircularPlusvalia';
import CloseIcon from '@mui/icons-material/Close';
import { motion, AnimatePresence } from 'framer-motion';

const PropertySidePreview = ({ open, property, previewUrl, onClose, onGo, getPriceDisplay }) => {
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
            sx={{ width: 320, p: 2, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', backgroundColor:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', flexDirection:'column', color:'#ffffff' }}
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
              
                <Box sx={{ display:'inline-block', mb:0.75, px:1, py:0.5, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.18)' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight:700, fontSize: '0.9rem', color: '#ffffff' }}>{property.name}</Typography>
                </Box>
                <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem', color: '#ffffff' }}>
                  Precio: {getPriceDisplay ? getPriceDisplay(property).replace(/\s*\/mes\s*$/, '') : 'N/D'}
                </Typography>
                <Typography variant="body2" sx={{ mb:0.5, fontSize: '0.8rem', color: '#ffffff' }}>Tamaño: {Number(property.size).toLocaleString('es-CL')} ha</Typography>
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
                  py: 1
                }}
              >
                Ir
              </Button>
            </Box>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertySidePreview; 