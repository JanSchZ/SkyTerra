import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Fade,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PsychologyIcon from '@mui/icons-material/Psychology';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../../services/api';

const QUICK_PROMPTS = [
  'Dame un resumen rápido de esta propiedad',
  '¿Cuáles son los puntos fuertes que ves?',
  '¿Qué debo revisar con más detalle antes de invertir?',
];

// Helper para construir snapshot de la propiedad para el historial
const buildPropertySnapshot = (property) => {
  if (!property) return null;
  const priceValue = Number(property.price);
  const sizeValue = Number(property.size);
  return {
    id: property.id,
    name: property.name,
    price: Number.isFinite(priceValue) ? priceValue : undefined,
    size: Number.isFinite(sizeValue) ? sizeValue : undefined,
    type: property.type,
    latitude: property.latitude,
    longitude: property.longitude,
    reason: 'Propiedad en análisis dentro del tour virtual.',
  };
};

// Helper para construir el contexto completo de la propiedad
const buildPropertyContext = (property) => {
  if (!property) return '';
  const lines = [];
  lines.push(`Estamos analizando la propiedad "${property.name || 'sin nombre'}" (ID: ${property.id || 'N/A'}).`);
  
  if (property.listing_type) {
    lines.push(`Tipo de listing: ${property.listing_type}.`);
  }
  if (property.type) {
    lines.push(`Tipo de propiedad: ${property.type}.`);
  }
  
  const priceValue = Number(property.price);
  if (!Number.isNaN(priceValue) && priceValue > 0) {
    lines.push(`Precio listado: $${priceValue.toLocaleString()}.`);
  }
  
  const sizeValue = Number(property.size);
  if (!Number.isNaN(sizeValue) && sizeValue > 0) {
    lines.push(`Superficie: ${sizeValue} hectáreas.`);
  }
  
  if (property.address) {
    lines.push(`Dirección: ${property.address}.`);
  }
  
  if (property.plusvalia_score !== null && property.plusvalia_score !== undefined) {
    lines.push(`Plusvalía estimada: ${property.plusvalia_score}%.`);
  }
  
  if (property.description) {
    const desc = property.description.length > 350
      ? `${property.description.slice(0, 347)}...`
      : property.description;
    lines.push(`Descripción: ${desc}`);
  }
  
  lines.push('');
  lines.push('INSTRUCCIONES: Enfócate exclusivamente en esta propiedad del tour virtual.');
  lines.push('No sugieras visitar otras zonas del mapa ni listar propiedades adicionales.');
  lines.push('Si el usuario pregunta por otras propiedades, recuérdale amablemente que estamos analizando esta propiedad específica en el tour.');
  
  return lines.join('\n');
};

// Helper para crear entrada de historial con propiedades recomendadas
const createPropertyHistoryEntry = (recommendations) => {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return null;
  const snapshot = recommendations
    .slice(0, 5)
    .map(({ id, name, price, latitude, longitude, reason, size, type }) => ({
      id,
      name,
      price,
      latitude,
      longitude,
      reason,
      size,
      type,
    }))
    .filter((item) => Object.values(item).some((value) => value !== undefined && value !== null && value !== ''));
  
  if (snapshot.length === 0) return null;
  return { role: 'assistant', content: '', properties: snapshot };
};

const formatAssistantIntro = (property) => {
  if (!property) {
    return 'Hola, soy Sam. Estoy aquí para ayudarte a analizar los detalles de esta propiedad.';
  }
  return `Hola, soy Sam 👋 Estoy analizando contigo la propiedad "${property.name || 'sin nombre'}". Pregúntame lo que quieras y me enfocaré solo en este activo.`;
};

const SamPropertyAssistant = ({ property }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const propertyContext = useMemo(() => buildPropertyContext(property), [property]);
  const propertySnapshot = useMemo(() => buildPropertySnapshot(property), [property]);

  // Inicializar conversación cuando cambia la propiedad
  useEffect(() => {
    if (!property) {
      setMessages([]);
      setConversationHistory([]);
      return;
    }

    const introMessage = formatAssistantIntro(property);
    setMessages([{ role: 'assistant', content: introMessage }]);

    // Construir historial inicial con contexto
    const contextEntry = {
      role: 'assistant',
      content: propertyContext,
      properties: propertySnapshot ? [propertySnapshot] : undefined,
    };

    setConversationHistory([contextEntry]);
    setError(null);
    setInputValue('');
  }, [property?.id, propertyContext, propertySnapshot]);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || !property) return;

    const userMessage = { role: 'user', content: trimmed };
    const userVisibleEntry = { role: 'user', content: trimmed };
    
    setMessages((prev) => [...prev, userVisibleEntry]);
    setInputValue('');
    setError(null);

    // Agregar al historial con contexto adicional
    const userHistoryEntry = {
      role: 'user',
      content: `Pregunta del usuario sobre la propiedad ${property?.name || property?.id || ''}: ${trimmed}`,
    };
    
    const historyBeforeSend = [...conversationHistory, userHistoryEntry];
    setConversationHistory(historyBeforeSend);
    setLoading(true);

    try {
      const response = await api.post('/ai-search/', {
        query: trimmed,
        conversation_history: historyBeforeSend,
      });

      const assistantMessage = response?.data?.assistant_message 
        || 'Por ahora no tengo más información, pero seguiré aprendiendo sobre esta propiedad.';
      
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);

      // Actualizar historial con respuesta
      const assistantEntry = { role: 'assistant', content: assistantMessage };
      const updatedHistory = [...historyBeforeSend, assistantEntry];

      // Si hay recomendaciones de propiedades, agregarlas al historial
      const propertyEntry = createPropertyHistoryEntry(response?.data?.recommendations);
      if (propertyEntry) {
        updatedHistory.push(propertyEntry);
      }

      setConversationHistory(updatedHistory);
    } catch (err) {
      console.error('Error consultando a Sam:', err);
      const fallbackMessage = 'No pude conectar con el servicio en este momento. Intenta nuevamente en unos segundos.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackMessage }]);
      setError(fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!loading && inputValue.trim()) {
      void sendMessage(inputValue);
    }
  };

  const handleQuickPrompt = (prompt) => {
    if (loading) return;
    void sendMessage(prompt);
  };

  const handleReset = () => {
    if (property) {
      const introMessage = formatAssistantIntro(property);
      setMessages([{ role: 'assistant', content: introMessage }]);
      
      const contextEntry = {
        role: 'assistant',
        content: propertyContext,
        properties: propertySnapshot ? [propertySnapshot] : undefined,
      };
      setConversationHistory([contextEntry]);
    }
    setInputValue('');
    setError(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2.5,
        mb: 2,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65) 0%, rgba(30, 41, 59, 0.55) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.32)',
      }}
    >
      {/* Header del asistente */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 40,
            height: 40,
            boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
          }}
        >
          <PsychologyIcon fontSize="medium" />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
            Sam · Analista virtual
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem' }}>
            {property?.name ? `Enfocado en "${property.name}"` : 'Conversación centrada en esta propiedad'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {property?.id && (
            <Tooltip title={`ID interno: ${property.id}`} placement="left">
              <InfoOutlinedIcon sx={{ color: 'rgba(255,255,255,0.6)' }} fontSize="small" />
            </Tooltip>
          )}
          <Tooltip title="Reiniciar conversación" placement="left">
            <IconButton
              size="small"
              onClick={handleReset}
              sx={{
                color: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  color: 'rgba(255,255,255,0.9)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Área de mensajes */}
      <Box
        ref={scrollRef}
        sx={{
          maxHeight: '32vh',
          minHeight: '22vh',
          overflowY: 'auto',
          pr: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(148,163,184,0.4) transparent',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.45)',
            borderRadius: 999,
          },
        }}
      >
        {messages.map((msg, idx) => (
          <Box
            key={`${msg.role}-${idx}`}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(59,130,246,0.85), rgba(37,99,235,0.75))'
                : 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              px: 1.75,
              py: 1.25,
              color: 'rgba(255,255,255,0.95)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              boxShadow: msg.role === 'user'
                ? '0 10px 24px rgba(59,130,246,0.35)'
                : '0 6px 20px rgba(15,23,42,0.35)',
            }}
          >
            {msg.content}
          </Box>
        ))}
        {loading && (
          <Fade in>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.75)' }}>
              <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.75)' }} />
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                Sam está analizando esta propiedad...
              </Typography>
            </Box>
          </Fade>
        )}
        {error && (
          <Typography variant="caption" sx={{ color: '#ffb4a9', alignSelf: 'center' }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Quick prompts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {QUICK_PROMPTS.map((prompt) => (
          <Chip
            key={prompt}
            label={prompt}
            onClick={() => handleQuickPrompt(prompt)}
            disabled={loading}
            size="small"
            sx={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.78rem',
              '&:hover': {
                background: 'rgba(255,255,255,0.18)',
              },
              '&.Mui-disabled': {
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.4)',
              },
            }}
          />
        ))}
      </Box>

      {/* Input area */}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregúntale algo a Sam sobre esta propiedad"
          fullWidth
          variant="outlined"
          size="small"
          multiline
          maxRows={3}
          InputProps={{
            sx: {
              borderRadius: 2,
              backgroundColor: 'rgba(15,23,42,0.35)',
              color: 'rgba(255,255,255,0.95)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.18)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(59,130,246,0.8)',
              },
            },
          }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={loading || !inputValue.trim()}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(96,165,250,0.85))',
            boxShadow: '0 10px 24px rgba(59,130,246,0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(59,130,246,1), rgba(37,99,235,0.95))',
            },
            '&.Mui-disabled': {
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)',
            },
          }}
        >
          <SendIcon sx={{ color: 'white' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default SamPropertyAssistant;
