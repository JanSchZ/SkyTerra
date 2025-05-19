import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, TextField, Button, CircularProgress, Collapse, Chip, Link as MuiLink } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../../services/api';

const initialAssistantMessage = {
  role: 'assistant',
  content: '¡Hola! Soy Sky, tu asistente para encontrar terrenos rurales en Chile. ¿En qué puedo ayudarte hoy?'
};

const AIChatAssistant = ({ onFiltersSuggested, onRecommendations }) => {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState([initialAssistantMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilters, setLastFilters] = useState(null);
  const [lastRecommendations, setLastRecommendations] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleInputChange = (e) => setInput(e.target.value);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    const userMessage = input.trim();
    setInput('');
    const updatedConversation = [
      ...conversation,
      { role: 'user', content: userMessage }
    ];
    setConversation(updatedConversation);
    try {
      const payload = {
        current_query: userMessage,
        conversation_history: updatedConversation.filter(msg => msg.role !== 'system')
      };
      const response = await api.post('ai-search/', payload);
      if (response.data && response.data.conversation_history) {
        setConversation(response.data.conversation_history);
        
        if (response.data.suggestedFilters) {
          setLastFilters(response.data.suggestedFilters);
          if (onFiltersSuggested) onFiltersSuggested(response.data.suggestedFilters);
        }
        if (response.data.recommendations) {
          setLastRecommendations(response.data.recommendations);
          if (onRecommendations) onRecommendations(response.data.recommendations);
        }
      } else {
        setError('La respuesta de la IA no tiene datos válidos o falta el historial de conversación.');
        setConversation(prev => prev.slice(0, -1));
      }
    } catch (err) {
      setError('Error al contactar al asistente. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar el chat */}
      <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2000 }}>
        {!open && (
          <IconButton color="primary" size="large" onClick={handleToggle} sx={{ boxShadow: 3, bgcolor: 'background.paper' }}>
            <ChatIcon fontSize="large" />
          </IconButton>
        )}
      </Box>
      {/* Panel de chat */}
      <Collapse in={open} orientation="horizontal">
        <Paper elevation={6} sx={{ position: 'fixed', bottom: 32, right: 32, width: 370, maxHeight: 540, display: 'flex', flexDirection: 'column', zIndex: 2100 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">Asistente Sky</Typography>
            <IconButton size="small" onClick={handleToggle}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
            {conversation.map((msg, idx) => (
              <Box key={idx} sx={{
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                  mb: 1,
                  ml: msg.role === 'assistant' ? 0 : 'auto',
                  mr: msg.role === 'user' ? 0 : 'auto',
              }}>
                <Box sx={{
                  bgcolor: msg.role === 'user' ? 'primary.main' : (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  px: 2, py: 1, borderRadius: 2, maxWidth: '80%',
                  boxShadow: 1,
                }}>
                  <Typography variant="body2">{msg.content}</Typography>
                </Box>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ ml: 1 }}>Sky está pensando...</Typography>
              </Box>
            )}
            <div ref={chatEndRef} />
          </Box>
          {/* Filtros sugeridos */}
          {lastFilters && (
            <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {lastFilters.propertyTypes && lastFilters.propertyTypes.map(type => (
                <Chip key={type} label={type} size="small" color="primary" />
              ))}
              {lastFilters.priceRange ? (
                (typeof lastFilters.priceRange[0] === 'number' || typeof lastFilters.priceRange[1] === 'number') ? (
                    <Chip 
                        label={`Precio: ${lastFilters.priceRange[0] !== null ? lastFilters.priceRange[0].toLocaleString() : 'Cualquiera'} - ${lastFilters.priceRange[1] !== null ? lastFilters.priceRange[1].toLocaleString() : 'Cualquiera'}`}
                        size="small" 
                        color="secondary" 
                    />
                ) : (
                    <Chip label="Rango de precio no especificado" size="small" />
                )
              ) : null}
              {lastFilters.features && lastFilters.features.map(feature => (
                <Chip key={feature} label={feature} size="small" color="success" />
              ))}
            </Box>
          )}
          {/* Recomendaciones */}
          {lastRecommendations && lastRecommendations.length > 0 && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>Propiedades recomendadas:</Typography>
              {lastRecommendations.map((prop, idx) => (
                <Paper 
                  key={prop.id || idx} 
                  component={RouterLink}
                  to={`/property/${prop.id}`}
                  sx={{ 
                    p: 1.5,
                    mb: 1, 
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                    cursor: 'pointer', 
                    textDecoration: 'none',
                    '&:hover': { 
                      boxShadow: 3,
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
                    }
                  }}
                >
                  <Typography variant="body1" fontWeight="bold" color="text.primary">{prop.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Precio: ${Number(prop.price).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tamaño: {prop.size} ha
                  </Typography>
                  <Box sx={{mt: 0.5}}>
                    {prop.has_water && <Chip label="Agua" size="small" variant="outlined" color="info" sx={{ mr: 0.5 }} />}
                    {prop.has_views && <Chip label="Vistas" size="small" variant="outlined" color="info" sx={{ mr: 0.5 }} />}
                    {prop.has_tour && <Chip label="Tour 360" size="small" variant="outlined" color="success" sx={{ mr: 0.5 }} />}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
          {/* Input y error */}
          <Box component="form" onSubmit={handleSend} sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={handleInputChange}
              disabled={loading}
              autoFocus={open}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
            />
            <Button type="submit" variant="contained" color="primary" disabled={loading || !input.trim()}>Enviar</Button>
          </Box>
          {error && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Typography color="error" variant="body2">{error}</Typography>
            </Box>
          )}
        </Paper>
      </Collapse>
    </>
  );
};

export default AIChatAssistant; 