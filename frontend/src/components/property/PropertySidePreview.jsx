import React from 'react';
import { Box, Typography, Button, IconButton, CardMedia, Paper } from '@mui/material';
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
            sx={{ width: 340, p: 2, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', backgroundColor:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', flexDirection:'column', color:'#ffffff' }}
          >
            {/* Preview */}
            <Box sx={{ position:'relative', width:'100%', height:180, mb:1.5, borderRadius:1, overflow:'hidden' }}>
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
              <IconButton size="small" onClick={onClose} sx={{ position:'absolute', top:6, right:6, backgroundColor:'rgba(0,0,0,0.55)', color:'#fff', '&:hover':{ backgroundColor:'rgba(0,0,0,0.75)' } }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Details */}
            <Typography variant="subtitle1" sx={{ fontWeight:600, mb:0.5 }}>{property.name}</Typography>
            <Typography variant="body2" sx={{ mb:0.5 }}>Precio: {getPriceDisplay ? getPriceDisplay(property) : 'N/D'}</Typography>
            <Typography variant="body2" sx={{ mb:0.5 }}>Tamaño: {property.size} ha</Typography>
            {property.plusvalia_score !== undefined && (
              <Typography variant="body2" sx={{ mb:0.5 }}>Plusvalía: {property.plusvalia_score}%</Typography>
            )}
            {property.bedrooms && (
              <Typography variant="body2" sx={{ mb:0.5 }}>Dormitorios: {property.bedrooms}</Typography>
            )}
            {property.bathrooms && (
              <Typography variant="body2" sx={{ mb:0.5 }}>Baños: {property.bathrooms}</Typography>
            )}
            {property.parking_spaces && (
              <Typography variant="body2" sx={{ mb:0.5 }}>Estacionamientos: {property.parking_spaces}</Typography>
            )}
            <Box sx={{ mb:2 }} />

            <Button variant="contained" fullWidth onClick={onGo}>Ir</Button>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertySidePreview; 