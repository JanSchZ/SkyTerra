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
    if (assistantMessage && assistantMessage !== displayedAssistant) {
      let i = 0;
      setDisplayedAssistant('');
      const interval = setInterval(() => {
        i += 1;
        setDisplayedAssistant(assistantMessage.slice(0, i));
        if (i >= assistantMessage.length) clearInterval(interval);
      }, 12); // Faster typing speed for better UX
      return () => clearInterval(interval);
    }
  }, [assistantMessage]);

  // Determine if there's anything meaningful to display besides a simple message
  const hasRecommendations = recommendations && recommendations.length > 0 && searchMode === 'property_recommendation';
  const hasFlyTo = flyToLocation && searchMode === 'location';
  const hasContentToDisplay = hasRecommendations || hasFlyTo || (assistantMessage && assistantMessage !== 'Búsqueda procesada') || isLoading;
  const shouldShow = hasContentToDisplay || currentQuery;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ 
          opacity: (!collapsed && shouldShow) ? 1 : 0, 
          y: (!collapsed && shouldShow) ? 0 : 30, 
          scale: (!collapsed && shouldShow) ? 1 : 0.95,
          pointerEvents: (!collapsed && shouldShow) ? 'auto' : 'none'
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: 0.3 }
        }}
        style={{
          position: 'absolute',
          top: 120,
          left: 16,
          width: 340,
          zIndex: 1250,
        }}
      >
          <Paper
            variant="glass"
            elevation={6}
            sx={(theme) => ({
              pt: 1.25,
              pr: 2,
              pb: 2,
              pl: 2,
              width: '100%',
              maxHeight: { xs: '70vh', sm: '80vh' },
              overflowY: 'auto',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              backgroundColor: 'rgba(255,255,255,0.16)',
              border: `1px solid rgba(255,255,255,0.3)`,
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
              // Custom scrollbar for a better look
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.3) transparent',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(255,255,255,0.4)',
              }
            })}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ 
                  fontWeight: 500, 
                  fontSize: '1.1rem', 
                  letterSpacing: 0,
                  animation: 'glow 2.5s ease-in-out infinite',
                  '@keyframes glow': {
                    '0%, 100%': { color: 'white', textShadow: '0 0 5px rgba(255,255,255,0.4)' },
                    '50%': { color: '#E0E0E0', textShadow: '0 0 20px rgba(255,255,255,0.8)' },
                  }
                }}>
                Sam
              </Typography>
              {shouldShow && (
                <IconButton size="small" onClick={() => setCollapsed(true)} sx={{ ml: 1, color: 'rgba(255,255,255,0.8)' }}>
                   <ArrowForwardIosIcon fontSize="small" style={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              )}
            </Box>

            {/* Unified content block */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isLoading ? "loading" : "content"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Typography variant="body2" sx={{ color: 'white', fontStyle: 'italic' }}>
                        Sam está escribiendo
                      </Typography>
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ 
                              duration: 1.2, 
                              repeat: Infinity, 
                              delay: i * 0.2,
                              ease: "easeInOut"
                            }}
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.7)'
                            }}
                          />
                        ))}
                      </Box>
                    </motion.div>
                  </Box>
                ) : (
                  <>
                    {displayedAssistant && (
                      <Typography variant="body2" sx={{ mb: 1, color: 'white', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                        {displayedAssistant}
                      </Typography>
                    )}

                    {searchMode === 'location' && flyToLocation && !hasRecommendations && (
                      <Typography variant="body2" sx={{ mt: 1, color: 'white' }}>
                        Navegando al área de interés que indicaste.
                      </Typography>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Chat / follow-up input on top */}
            <Box sx={{ my: 2, display:'flex', gap:1 }}>
              <TextField 
                size="small" 
                fullWidth 
                type="text" 
                autoComplete="off" 
                variant="outlined" 
                placeholder="Continuar conversación..." 
                value={followUp} 
                onChange={(e)=>setFollowUp(e.target.value)} 
                onKeyPress={(e)=>{ if(e.key==='Enter' && followUp.trim()){ onFollowUpQuery && onFollowUpQuery(followUp.trim()); setFollowUp(''); } }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    backgroundColor: 'rgba(0,0,0,0.25)', 
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.3s ease',
                    '& fieldset': { border: 'none' },
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      boxShadow: '0 0 8px rgba(255,255,255,0.2)',
                    }
                  }, 
                  input: { 
                    color: 'white', 
                    fontSize: '0.85rem',
                    '::placeholder': { 
                      color: 'rgba(255,255,255,0.6)',
                      opacity: 1
                    }
                  }
                }}
              />
            </Box>

            <AnimatePresence>
              {!isLoading && hasRecommendations && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.5 } }}
                  exit={{ opacity: 0 }}
                >
                  <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight:'bold', color: 'white' }}>
                    Top {Math.min(recommendations.length, MAX_DISPLAY)} Sugerencia{Math.min(recommendations.length, MAX_DISPLAY) > 1 ? 's' : ''}:
                  </Typography>
                  <List dense disablePadding sx={{ overflowY: 'auto', maxHeight: { xs: '50vh', sm: '55vh' }, pr:0.5, '&::-webkit-scrollbar':{ width:0}, scrollbarWidth:'none' }}>
                    {recommendations.slice(0, MAX_DISPLAY).map((rec, index) => (
                      <motion.div
                        key={rec.id || index}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          delay: index * 0.1 + 0.2,
                          duration: 0.3,
                          ease: [0.25, 0.1, 0.25, 1]
                        }}
                      >
                        <Card
                          variant="glass"
                          sx={(theme)=>({
                            mb: 1.5,
                            cursor: 'pointer',
                            backgroundColor: 'rgba(40,40,40,0.4)',
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
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, fontSize: '1rem', color: 'white', letterSpacing: 0 }}>
                              {rec.name}
                            </Typography>
                            <Typography variant="body2" color="white" sx={{ mb: 0.5 }}>
                              Precio: {rec.price ? `$${Number(rec.price).toLocaleString()}` : 'No disponible'}
                            </Typography>
                            <Typography variant="body2" color="white" sx={{ mb: 0.5 }}>
                              Tamaño: {rec.size ? `${rec.size} ha` : 'No disponible'}
                            </Typography>
                            <Typography variant="body2" color="white" sx={{ textTransform: 'capitalize', mb: 1 }}>
                              Tipo: {rec.type || 'No especificado'}
                            </Typography>
                            {rec.reason && (
                              <Typography variant="caption" color="white" sx={{ fontStyle: 'italic' }}>
                                {rec.reason}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </List>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </motion.div>
        
        {/* Collapsed state - small expand button */}
        {collapsed && shouldShow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              top: 120,
              left: 16,
              zIndex: 1250,
            }}
          >
            <IconButton 
              size="small" 
              onClick={() => setCollapsed(false)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </motion.div>
        )}
    </>
  );
};

export default AISuggestionPanel;
