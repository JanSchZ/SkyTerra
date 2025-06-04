import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Card, CardContent, CardMedia, Divider, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

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
  if (isLoading) {
    return (
      <Paper elevation={3} sx={{ p: 2, position: 'absolute', top: '100px', left: '20px', width: '350px', zIndex: 1300, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', backgroundColor: 'rgba(22, 27, 34, 0.85)', backdropFilter: 'blur(10px)' }}>
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
        elevation={6}
        sx={{
          p: 2,
          position: 'absolute',
          top: { xs: 'auto', sm: '140px' }, // Adjust based on AISearchBar and AppliedFiltersDisplay height
          bottom: { xs: '20px', sm: 'auto' },
          left: '20px',
          width: { xs: 'calc(100% - 40px)', sm: '380px' },
          zIndex: 1250, // Below AISearchBar (1300), above MapView (1)
          maxHeight: { xs: '40vh', sm: 'calc(100vh - 160px)' },
          overflowY: 'auto',
          backgroundColor: 'rgba(22, 27, 34, 0.9)', // Darker, more translucent
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(48, 54, 61, 0.7)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'text.primary', fontSize: '1.1rem' }}>
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
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight:'bold', color: 'text.primary' }}>
             Top {recommendations.length > 1 ? recommendations.length : ''} Sugerencia{recommendations.length > 1 ? 's' : ''}:
          </Typography>
          <List dense disablePadding>
            {recommendations.slice(0, 3).map((rec, index) => (
              <motion.div
                 key={rec.id || index}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
              >
              <Card
                variant="outlined"
                sx={{
                  mb: 1.5,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(30, 36, 42, 0.7)',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    borderColor: 'primary.main'
                  },
                  border: '1px solid rgba(48, 54, 61, 0.5)'
                }}
                onClick={() => onSuggestionClick && onSuggestionClick(rec)}
                onMouseEnter={() => onSuggestionHover && onSuggestionHover(rec)}
                onMouseLeave={() => onSuggestionHover && onSuggestionHover(null)} // Clear hover
              >
                {/* Placeholder for CardMedia if images become available */}
                {/* <CardMedia component="img" height="100" image={rec.imageUrl || "https://via.placeholder.com/300x100?text=Propiedad"} alt={rec.name} /> */}
                <CardContent sx={{p: 1.5}}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', fontSize: '1rem', color: 'primary.light' }}>
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
