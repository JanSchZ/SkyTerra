import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Card, CardContent, Divider, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { tourService } from '../../services/api';

const AISuggestionPanel = ({
  assistantMessage,
  recommendations,
  searchMode,
  flyToLocation, // Will be used to decide if we show recommendations or just a message
  onSuggestionClick,
  onSuggestionHover,
  onClearAISearch, // Callback to clear AI search results
  isLoading,
  currentQuery // The user's query that led to these results
}) => {
  const [tourPreviews, setTourPreviews] = useState({});
  const MAX_DISPLAY = 3;

  useEffect(() => {
    const fetchPreviews = async () => {
      if (!recommendations || recommendations.length === 0) return;
      const previews = {};
      const toFetch = recommendations.slice(0, 5);
      for (const rec of toFetch) {
        try {
          const data = await tourService.getTours(rec.id);
          const tours = data?.results || data;
          const firstTour = Array.isArray(tours) ? tours[0] : null;
          if (firstTour && firstTour.url) {
            let url = firstTour.url;
            if (!url.includes('autoLoad=true')) {
              url += (url.includes('?') ? '&' : '?') + 'autoLoad=true';
            }
            if (!url.includes('autoRotate=')) {
              url += (url.includes('?') ? '&' : '?') + 'autoRotate=0';
            }
            previews[rec.id] = url;
          }
        } catch (err) {
          console.error('Error fetching tour preview', err);
        }
      }
      setTourPreviews(previews);
    };

    fetchPreviews();
  }, [recommendations]);
  if (isLoading) {
    return (
      <Paper variant="glass" elevation={3} sx={{ p: 2, position: 'absolute', top: '100px', left: '20px', width: '350px', zIndex: 1300, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
          <CircularProgress size={30} />
          <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>Buscando con IA...</Typography>
        </Box>
      </Paper>
    );
  }

  // Determine if there's anything meaningful to display besides a simple message
  const hasRecommendations = recommendations && recommendations.length > 0 && searchMode === 'property_recommendation';
  const hasFlyTo = flyToLocation && searchMode === 'location';
  const hasContentToDisplay = hasRecommendations || hasFlyTo || (assistantMessage && assistantMessage !== 'Búsqueda procesada');

  if (!hasContentToDisplay && !currentQuery) { // Don't show if no active query or meaningful content
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        variant="glass"
        elevation={6}
        sx={(theme) => ({
          p: 2,
          position: 'absolute',
          top: 140,
          left: 20,
          width: 380,
          zIndex: 1250,
          maxHeight: { xs: '40vh', sm: 'calc(100vh - 160px)' },
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          backgroundColor: 'rgba(255,255,255,0.18)',
          border: `1px solid rgba(255,255,255,0.25)`,
        })}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '1.1rem', letterSpacing: 0 }}>
            Asistente IA SkyTerra
          </Typography>
          {onClearAISearch && (
             <Chip label="Limpiar" onClick={onClearAISearch} size="small" sx={{cursor: 'pointer'}} />
          )}
        </Box>

        {assistantMessage && (
          <Typography variant="body2" sx={{ mb: hasRecommendations ? 2 : 0, color: 'text.secondary', fontStyle: 'italic' }}>
            {assistantMessage}
          </Typography>
        )}

        {searchMode === 'location' && flyToLocation && !hasRecommendations && (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.primary' }}>
            Navegando al área de interés que indicaste.
          </Typography>
        )}

        {hasRecommendations && (
          <>
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight:'bold', color: 'text.primary' }}>
             Top {Math.min(recommendations.length, MAX_DISPLAY)} Sugerencia{Math.min(recommendations.length, MAX_DISPLAY) > 1 ? 's' : ''}:
          </Typography>
          <List dense disablePadding>
            {recommendations.slice(0, MAX_DISPLAY).map((rec, index) => (
              <motion.div
                 key={rec.id || index}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
              >
              <Card
                variant="glass"
                sx={(theme)=>({
                  mb: 1.5,
                  cursor: 'pointer',
                  transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s cubic-bezier(0.4,0,0.2,1)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 6px 20px rgba(0,0,0,0.35)` ,
                    borderColor: theme.palette.primary.main,
                  },
                })}
                onClick={() => onSuggestionClick && onSuggestionClick(rec)}
                onMouseEnter={() => onSuggestionHover && onSuggestionHover(rec)}
                onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)} // Clear hover
              >
                {tourPreviews[rec.id] && (
                  <Box sx={{ height: 100, mb: 1 }}>
                    <iframe
                      src={tourPreviews[rec.id]}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      title={`Tour preview ${rec.name}`}
                    />
                  </Box>
                )}
                <CardContent sx={{p: 1.5}}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, fontSize: '1rem', color: 'text.primary', letterSpacing: 0 }}>
                    {rec.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Precio: {rec.price ? `$${Number(rec.price).toLocaleString()}` : 'No disponible'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Tamaño: {rec.size ? `${rec.size} ha` : 'No disponible'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize', mb: 1 }}>
                    Tipo: {rec.type || 'No especificado'}
                  </Typography>
                  {rec.reason && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      Razón: {rec.reason}
                    </Typography>
                  )}
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </List>
          </>
        )}
      </Paper>
    </motion.div>
  );
};

export default AISuggestionPanel;
