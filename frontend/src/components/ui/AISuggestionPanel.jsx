import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Card, CardContent, Divider, Chip, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { tourService } from '../../services/api';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { TextField } from '@mui/material';
import CircularPlusvalia from './CircularPlusvalia';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  // Show up to 5 recommendations so counts like 4 are fully displayed
  const MAX_DISPLAY = 5;
  const [collapsed, setCollapsed] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [displayedAssistant, setDisplayedAssistant] = useState('');
  const [lastRecommendations, setLastRecommendations] = useState([]);
  const [chatExpanded, setChatExpanded] = useState(false);

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

  // Mantener últimas recomendaciones visibles mientras Sam piensa
  useEffect(() => {
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      setLastRecommendations(recommendations);
    }
  }, [recommendations]);

  useEffect(() => {
    setDisplayedAssistant(assistantMessage || '');
  }, [assistantMessage]);

  // Determine if there's anything meaningful to display besides a simple message
  const hasRecommendations = recommendations && recommendations.length > 0 && searchMode === 'property_recommendation';
  const hasFlyTo = flyToLocation && searchMode === 'location';
  const hasContentToDisplay = hasRecommendations || hasFlyTo || (assistantMessage && assistantMessage !== 'Búsqueda procesada') || isLoading;
  const shouldShow = hasContentToDisplay || currentQuery;
  const activeRecommendations = hasRecommendations ? recommendations : lastRecommendations;

  return (
    <>
      {shouldShow && (
        <motion.div
          initial={false}
          style={{
            position: 'absolute',
            top: 120,
            left: 16,
            width: 340,
            zIndex: 1250,
          }}
        >
          <div>
            <Paper
              variant="glass"
              elevation={6}
              sx={(theme) => ({
                // Siempre mantener el mismo tamaño - estado expandido
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
                // Ocultar barra de scroll visual, permitir scroll con rueda
                scrollbarWidth: 'none',
                scrollbarColor: 'transparent transparent',
                '&::-webkit-scrollbar': {
                  width: 0,
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'transparent',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'transparent',
                }
              })}
            >
                          {/* Contenido expandido siempre presente */}
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

              {/* Contenido principal sin animaciones para evitar saltos */}
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'white', fontStyle: 'italic' }}>
                    Pensando
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.6 }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                        style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.85)' }}
                      />
                    ))}
                  </Box>
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

              {/* Chat / follow-up input on top */}
              <Box sx={{ my: 1.5, display:'flex', gap:1, alignItems:'center' }}>
                <Tooltip title={chatExpanded ? 'Ocultar chat' : 'Mostrar chat'} placement="top">
                  <IconButton size="small" onClick={()=>setChatExpanded(v=>!v)} sx={{ color:'rgba(255,255,255,0.85)' }}>
                    {chatExpanded ? <ExpandLessIcon fontSize="small"/> : <ExpandMoreIcon fontSize="small"/>}
                  </IconButton>
                </Tooltip>
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

              {/* Chat history (compact) */}
              {chatExpanded && (
                <Box sx={{ mb: 1.5, px: 1, py: 1, borderRadius: '10px', backgroundColor:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.15)', maxHeight: 150, overflowY:'auto' }}>
                   {(Array.isArray(window.__skyterraConversationHistory) ? window.__skyterraConversationHistory : []).slice(-8).map((msg, idx)=> (
                      <Typography key={idx} variant="caption" sx={{ display:'block', color:'rgba(255,255,255,0.85)' }}>
                        <strong>{msg.role === 'user' ? 'Tú' : 'Sam'}:</strong> {msg.content}
                      </Typography>
                   ))}
                </Box>
              )}

              <AnimatePresence>
                {(activeRecommendations && activeRecommendations.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.4 } }}
                    exit={{ opacity: 0 }}
                  >
                    <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight:'bold', color: 'white' }}>
                      Sugerencias de Sam
                    </Typography>
                    <List dense disablePadding sx={{ overflowY: 'auto', maxHeight: { xs: '50vh', sm: '55vh' }, pr:0.5, '&::-webkit-scrollbar':{ width:0}, scrollbarWidth:'none' }}>
                      {activeRecommendations.slice(0, MAX_DISPLAY).map((rec, index) => (
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
                            <Box sx={{ position:'relative', height: 130, mb: 1 }}>
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
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2" color="white">
                                  Tamaño: {rec.size ? `${Math.round(Number(rec.size)).toLocaleString()} ha` : 'No disponible'}
                                </Typography>
                                {/* Plusvalía score */}
                                {typeof rec.plusvalia_score === 'number' && (
                                  <CircularPlusvalia value={Number(rec.plusvalia_score)} size={32} strokeWidth={4} />
                                )}
                              </Box>
                              {rec.reason && rec.reason.toLowerCase().includes('filtros sugeridos') ? null : (
                                rec.reason ? (
                                  <Typography variant="caption" color="white" sx={{ fontStyle: 'italic' }}>
                                    {rec.reason}
                                  </Typography>
                                ) : null
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
          </div>
        </motion.div>
      )}

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
          <Paper
            onClick={() => setCollapsed(false)}
            elevation={0}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: '12px',
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-0.5px)',
                boxShadow: '0 0 8px rgba(255,255,255,0.15)',
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 400, letterSpacing: 0, color: '#ffffff', fontSize: '0.875rem' }}>Sam</Typography>
          </Paper>
        </motion.div>
      )}
    </>
  );
};

export default AISuggestionPanel;
