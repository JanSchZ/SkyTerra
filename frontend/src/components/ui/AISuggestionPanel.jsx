import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Card, CardContent, Divider, Chip, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { tourService } from '../../services/api';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { TextField } from '@mui/material';

const AISuggestionPanel = ({
  assistantMessage,
  recommendations,
  searchMode,
  flyToLocation, // Will be used to decide if we show recommendations or just a message
  onSuggestionClick,
  onSuggestionHover,
  onClearAISearch, // Callback to clear AI search results
  onFollowUpQuery,
  isLoading,
  currentQuery // The user's query that led to these results
}) => {
  const [tourPreviews, setTourPreviews] = useState({});
  const MAX_DISPLAY = 3;
  const [collapsed, setCollapsed] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [displayedAssistant, setDisplayedAssistant] = useState('');

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

  useEffect(() => {
    if (assistantMessage) {
      let i = 0;
      setDisplayedAssistant('');
      const interval = setInterval(() => {
        i += 1;
        setDisplayedAssistant(assistantMessage.slice(0, i));
        if (i >= assistantMessage.length) clearInterval(interval);
      }, 18); // speed of typing
      return () => clearInterval(interval);
    }
  }, [assistantMessage]);

  // Determine if there's anything meaningful to display besides a simple message
  const hasRecommendations = recommendations && recommendations.length > 0 && searchMode === 'property_recommendation';
  const hasFlyTo = flyToLocation && searchMode === 'location';
  const hasContentToDisplay = hasRecommendations || hasFlyTo || (assistantMessage && assistantMessage !== 'Búsqueda procesada') || isLoading;

  if (!hasContentToDisplay && !currentQuery && !collapsed) { // Don't show if no active query or meaningful content
    return null;
  }

  return (
    <>
      {collapsed ? (
        <Box sx={{ position:'absolute', top:120, left:0, zIndex:1260 }}>
          <IconButton size="small" color="primary" onClick={()=>setCollapsed(false)} sx={{ backgroundColor:'rgba(255,255,255,0.2)', backdropFilter:'blur(6px)', borderRadius:'0 8px 8px 0' }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : null}

      <motion.div animate={{ x: collapsed ? -360 : 0 }} transition={{ duration:0.4 }} style={{ position:'absolute', left:0, top:0 }}>
      <Paper
        variant="glass"
        elevation={6}
        sx={(theme) => ({
          pt: 1.25,
          pr: 2,
          pb: 2,
          pl: 2,
          position: 'absolute',
          top: 120,
          left: 16,
          width: 340,
          zIndex: 1250,
          maxHeight: { xs: '70vh', sm: '80vh' },
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          backgroundColor: 'rgba(255,255,255,0.14)',
          border: `1px solid rgba(255,255,255,0.25)`,
        })}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '1.1rem', letterSpacing: 0 }}>
            Asistente IA SkyTerra
          </Typography>
          <IconButton size="small" onClick={()=>setCollapsed(true)} sx={{ ml:1, color:'rgba(255,255,255,0.8)' }}>
             <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>

        {(isLoading || displayedAssistant) && (
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic', whiteSpace:'pre-wrap' }}>
            {displayedAssistant || 'Escribiendo...'}
          </Typography>
        )}

        {/* Chat / follow-up input on top */}
        <Box sx={{ mb:2, display:'flex', gap:1 }}>
          <TextField size="small" fullWidth type="text" autoComplete="off" variant="outlined" placeholder="Continuar conversación..." value={followUp} onChange={(e)=>setFollowUp(e.target.value)} onKeyPress={(e)=>{ if(e.key==='Enter' && followUp.trim()){ onFollowUpQuery && onFollowUpQuery(followUp.trim()); setFollowUp(''); } }}
            sx={{ '& .MuiOutlinedInput-root':{ backgroundColor:'rgba(255,255,255,0.12)', backdropFilter:'blur(6px)', borderRadius:2, '& fieldset':{ border:'none' } }, input:{ color:(theme)=>theme.palette.text.primary, fontSize:'0.8rem'} }}
          />
        </Box>

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
          <List dense disablePadding sx={{ overflowY: 'auto', maxHeight: { xs: '50vh', sm: '55vh' }, pr:0.5, '&::-webkit-scrollbar':{ width:0}, scrollbarWidth:'none' }}>
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
                <Box sx={{ height: 100, mb: 1 }}>
                  {tourPreviews[rec.id] ? (
                    <iframe
                      src={tourPreviews[rec.id]}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      title={`Tour preview ${rec.name}`}
                    />
                  ) : (
                    <Box sx={{ width:'100%', height:'100%', backgroundColor:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:1 }}>
                      <Typography variant="caption" color="text.secondary">Sin preview 360°</Typography>
                    </Box>
                  )}
                </Box>
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
                      {rec.reason}
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
    </>
  );
};

export default AISuggestionPanel;
