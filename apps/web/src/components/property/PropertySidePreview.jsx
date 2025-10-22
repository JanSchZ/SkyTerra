import React from 'react';
import { Box, Typography, Button, IconButton, CardMedia, Paper, Snackbar, Alert, Divider, Chip } from '@mui/material';
import CircularPlusvalia from '../ui/CircularPlusvalia';
import CloseIcon from '@mui/icons-material/Close';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
        if (!property?.id || !isAuthenticated) {
          setIsSaved(false);
          return;
        }
        const favs = await favoritesService.list();
        if (!mounted) return;
        setIsSaved(Boolean(favs.find((f) => (f.property === property.id) || (f.property_details && f.property_details.id === property.id))));
      } catch (_) {
        setIsSaved(false);
      }
    };
    checkFav();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, property?.id]);

  const toggleSave = async () => {
    if (!property?.id) return;
    if (!isAuthenticated) {
      setSnackbar({ open: true, message: 'Inicia sesion para guardar propiedades.', severity: 'warning' });
      return;
    }
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        await favoritesService.add(property.id);
      } else {
        const favs = await favoritesService.list();
        const fav = favs.find((f) => f.property === property.id || (f.property_details && f.property_details.id === property.id));
        if (fav) await favoritesService.remove(fav.id);
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        setIsSaved(!next);
        setSnackbar({ open: true, message: 'Inicia sesion para guardar propiedades.', severity: 'warning' });
      } else if (status && status !== 401) {
        setIsSaved(!next);
      }
    }
  };

  const priceLabelRaw = getPriceDisplay ? getPriceDisplay(property) : null;
  const priceLabelClean = priceLabelRaw ? priceLabelRaw.replace(/\s*\/mes\s*$/, '') : 'N/D';

  const locationLabel =
    property?.location || [property?.municipality, property?.region].filter(Boolean).join(', ') || 'Ubicacion por confirmar';

  const listingFallback =
    property?.listing_type === 'rent'
      ? 'Arriendo'
      : property?.listing_type === 'both'
        ? 'Venta / Arriendo'
        : 'Venta';

  const destinationLabel =
    property?.zoning ||
    property?.intended_use ||
    property?.property_type ||
    property?.type ||
    listingFallback;

  const typeBadgeLabel = property?.type || property?.property_type || listingFallback;

  const featureSource = Array.isArray(property?.features)
    ? property.features
    : Array.isArray(property?.amenities)
      ? property.amenities
      : [];
  const featureTags = featureSource.filter(Boolean).slice(0, 3);

  return (
    <AnimatePresence>
      {open && property && (
        <motion.div
          initial={{ x: -380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -380, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ position: 'absolute', top: 116, left: 18, zIndex: 1300 }}
        >
          <Paper
            elevation={0}
            sx={{
              width: 360,
              p: 2.4,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.8,
              position: 'relative',
              overflow: 'hidden',
              color: '#f8fafc',
              borderRadius: '16px',
              backgroundColor: 'rgba(20, 22, 30, 0.42)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 26px 60px rgba(6, 12, 24, 0.55)',
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'radial-gradient(40% 50% at 0% 0%, rgba(56,189,248,0.32) 0%, rgba(56,189,248,0) 70%), radial-gradient(55% 45% at 80% 85%, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0) 72%)',
                opacity: 0.85,
                zIndex: 0,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(140deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(15,23,42,0.35) 100%)',
                mixBlendMode: 'screen',
                zIndex: 0,
              },
              '& > *': {
                position: 'relative',
                zIndex: 1,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 230,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: 'rgba(9,13,22,0.6)',
              }}
            >
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', display: 'block' }}
                  allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
                  title="Tour Preview"
                />
              ) : property?.images?.length > 0 ? (
                <CardMedia
                  component="img"
                  image={property.images[0].url}
                  alt={property.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(14,23,33,0.85), rgba(20,32,48,0.65))',
                    color: 'rgba(226,232,240,0.75)',
                    fontSize: '0.85rem',
                  }}
                >
                  Vista no disponible
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(10,14,22,0.05) 0%, rgba(10,14,22,0.78) 72%, rgba(10,14,22,0.92) 100%)',
                }}
              />
              {typeBadgeLabel && (
                <Chip
                  label={typeBadgeLabel}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    backgroundColor: 'rgba(16,185,129,0.2)',
                    color: '#bbf7d0',
                    borderRadius: '999px',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    border: '1px solid rgba(45,212,191,0.35)',
                    backdropFilter: 'blur(8px)',
                  }}
                />
              )}
              <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={toggleSave}
                  sx={{
                    width: 38,
                    height: 38,
                    color: isSaved ? '#f1f5f9' : 'rgba(248,250,252,0.9)',
                    backgroundColor: 'rgba(6,11,19,0.55)',
                    border: '1px solid rgba(148,163,184,0.25)',
                    backdropFilter: 'blur(8px)',
                    '&:hover': { backgroundColor: 'rgba(12,18,30,0.72)' },
                  }}
                  aria-label={isSaved ? 'Quitar de guardados' : 'Guardar'}
                >
                  {isSaved ? <BookmarkIcon sx={{ fontSize: 22 }} /> : <BookmarkBorderIcon sx={{ fontSize: 22 }} />}
                </IconButton>
                <IconButton
                  onClick={onClose}
                  sx={{
                    width: 36,
                    height: 36,
                    color: 'rgba(248,250,252,0.88)',
                    backgroundColor: 'rgba(15,23,42,0.45)',
                    border: '1px solid rgba(148,163,184,0.2)',
                    backdropFilter: 'blur(8px)',
                    '&:hover': { backgroundColor: 'rgba(30,41,59,0.65)' },
                  }}
                  aria-label="Cerrar"
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  left: 18,
                  right: 18,
                  bottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: 'rgba(248,250,252,0.95)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.22,
                  }}
                >
                  {property.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: 'rgba(226,232,240,0.85)' }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
                    {locationLabel}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                <Typography
                  variant="h6"
                  sx={{ fontSize: '1.15rem', fontWeight: 600, color: '#e0f2fe', letterSpacing: '-0.01em' }}
                >
                  {priceLabelClean}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.88)', fontSize: '0.82rem' }}>
                  {destinationLabel}
                </Typography>
              </Box>
              {property.plusvalia_score !== undefined && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 }}>
                  <CircularPlusvalia value={Number(property.plusvalia_score)} size={60} strokeWidth={6} />
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                    Plusvalia
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.1 }} />

            {featureTags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {featureTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(59,130,246,0.16)',
                      color: '#dbeafe',
                      borderRadius: '999px',
                      border: '1px solid rgba(96,165,250,0.32)',
                    }}
                  />
                ))}
              </Box>
            )}

            {property?.description && (
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(226,232,240,0.85)',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {property.description}
              </Typography>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={onGo}
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{
                mt: 0.6,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.05,
                background: 'linear-gradient(90deg, #38bdf8 0%, #22d3ee 100%)',
                color: '#04111f',
                boxShadow: '0 16px 32px rgba(56,189,248,0.32)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #0ea5e9 0%, #14b8a6 100%)',
                  boxShadow: '0 18px 36px rgba(34,211,238,0.45)',
                },
              }}
            >
              Explorar terreno
            </Button>
          </Paper>
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertySidePreview;
