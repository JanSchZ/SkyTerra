import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Fade,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api } from '../../services/api';

const buildCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch (error) {
    return `$${Number(value).toLocaleString('es-CL')}`;
  }
};

const buildHectares = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return `${num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ha`;
};

const buildPropertySummary = (property) => {
  if (!property) return '';
  const fragments = [];
  if (property.name) {
    fragments.push(`Nombre: ${property.name}`);
  }
  if (property.id) {
    fragments.push(`ID: ${property.id}`);
  }
  if (property.type) {
    fragments.push(`Tipo: ${property.type}`);
  }
  const price = buildCurrency(property.price);
  if (price) {
    fragments.push(`Precio: ${price}`);
  }
  const size = buildHectares(property.size);
  if (size) {
    fragments.push(`Superficie: ${size}`);
  }
  if (property.address) {
    fragments.push(`Ubicación: ${property.address}`);
  } else if (property.latitude && property.longitude) {
    fragments.push(`Coordenadas: (${property.latitude}, ${property.longitude})`);
  }
  if (property.plusvalia_score !== null && property.plusvalia_score !== undefined) {
    fragments.push(`Plusvalía estimada: ${property.plusvalia_score}%`);
  }
  if (property.description) {
    const desc = property.description.length > 350
      ? `${property.description.slice(0, 347)}...`
      : property.description;
    fragments.push(`Descripción: ${desc}`);
  }
  return fragments.join('\n');
};

const createPropertyHistoryEntry = (recs) => {
  if (!Array.isArray(recs) || recs.length === 0) return null;
  const snapshot = recs
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

const PropertySamAssistant = ({ property }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const propertySummary = useMemo(() => buildPropertySummary(property), [property]);

  useEffect(() => {
    if (!property) {
      setMessages([]);
      setConversationHistory([]);
      return;
    }

    const introMessage = property?.name
      ? `Hola, soy Sam. Estoy aquí para ayudarte a analizar "${property.name}". ¿Qué te gustaría saber de esta propiedad?`
      : 'Hola, soy Sam. Estoy aquí para ayudarte a analizar esta propiedad. ¿Qué te gustaría saber?';

    const contextInstruction = property?.name
      ? `Estás asistiendo al usuario mientras revisa el tour virtual de la propiedad "${property.name}" (ID ${property.id}). `
        + 'Concéntrate en analizar esta propiedad específica. Solo sugiere otras propiedades si el usuario lo pide expresamente.'
      : 'Estás asistiendo al usuario mientras revisa una propiedad específica en su tour virtual. '
        + 'Concéntrate en analizar esta propiedad y no sugieras alternativas a menos que te las pidan.';

    const contextSummary = propertySummary
      ? `Detalles clave conocidos de la propiedad:\n${propertySummary}`
      : 'La información disponible sobre la propiedad es limitada. Utiliza únicamente los datos confirmados.';

    setMessages([{ role: 'assistant', content: introMessage }]);
    setConversationHistory([
      { role: 'assistant', content: contextInstruction },
      { role: 'assistant', content: contextSummary },
    ]);
    setError(null);
    setInput('');
  }, [property, propertySummary]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!property || !input.trim()) return;
    const question = input.trim();
    setInput('');
    setError(null);

    const userVisibleEntry = { role: 'user', content: question };
    setMessages((prev) => [...prev, userVisibleEntry]);

    const userHistoryEntry = {
      role: 'user',
      content: `Pregunta del usuario sobre la propiedad ${property?.name || property?.id || ''}: ${question}`,
    };
    const historyBeforeSend = [...conversationHistory, userHistoryEntry];
    setConversationHistory(historyBeforeSend);

    setLoading(true);
    try {
      const payloadQuery = property?.name
        ? `Analiza la propiedad "${property.name}" (ID ${property.id}). ${question}`
        : `Analiza esta propiedad en su tour virtual. ${question}`;
      const response = await api.post('/ai-search/', {
        query: payloadQuery,
        conversation_history: historyBeforeSend,
      });
      const assistantMessage = response?.data?.assistant_message
        || 'Aquí tienes mi análisis preliminar de la propiedad.';

      const assistantEntry = { role: 'assistant', content: assistantMessage };
      setMessages((prev) => [...prev, assistantEntry]);

      setConversationHistory((prev) => {
        const next = [...prev, { role: 'assistant', content: assistantMessage }];
        const propertyEntry = createPropertyHistoryEntry(response?.data?.recommendations);
        if (propertyEntry) {
          next.push(propertyEntry);
        }
        return next;
      });
    } catch (err) {
      console.error('Error enviando consulta a Sam:', err);
      const fallback = 'No pude conectarme en este momento. Intenta nuevamente en unos segundos.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
      setError(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (!property) return;
    setMessages((prev) => prev.filter((msg) => msg.role !== 'assistant' || msg.content !== error));
    setError(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, rgba(25,33,55,0.65) 0%, rgba(35,45,70,0.55) 100%)',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
        p: 2.5,
        mb: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            <SmartToyIcon sx={{ color: 'rgba(255,255,255,0.92)' }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
              Sam analiza esta propiedad
            </Typography>
            {property?.name && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                {property.name}
              </Typography>
            )}
          </Box>
        </Box>
        <Tooltip title="Reiniciar conversación">
          <span>
            <IconButton
              size="small"
              onClick={() => {
                setInput('');
                if (property) {
                  const introMessage = property?.name
                    ? `Hola, soy Sam. Estoy aquí para ayudarte a analizar "${property.name}". ¿Qué te gustaría saber de esta propiedad?`
                    : 'Hola, soy Sam. Estoy aquí para ayudarte a analizar esta propiedad. ¿Qué te gustaría saber?';
                  const contextInstruction = property?.name
                    ? `Estás asistiendo al usuario mientras revisa el tour virtual de la propiedad "${property.name}" (ID ${property.id}). `
                      + 'Concéntrate en analizar esta propiedad específica. Solo sugiere otras propiedades si el usuario lo pide expresamente.'
                    : 'Estás asistiendo al usuario mientras revisa una propiedad específica en su tour virtual. '
                      + 'Concéntrate en analizar esta propiedad y no sugieras alternativas a menos que te las pidan.';
                  const contextSummary = propertySummary
                    ? `Detalles clave conocidos de la propiedad:\n${propertySummary}`
                    : 'La información disponible sobre la propiedad es limitada. Utiliza únicamente los datos confirmados.';
                  setMessages([{ role: 'assistant', content: introMessage }]);
                  setConversationHistory([
                    { role: 'assistant', content: contextInstruction },
                    { role: 'assistant', content: contextSummary },
                  ]);
                } else {
                  setMessages([]);
                  setConversationHistory([]);
                }
              }}
              sx={{
                color: 'rgba(255,255,255,0.65)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 220,
          pr: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 3,
          },
        }}
      >
        {messages.map((msg, index) => (
          <Box
            key={`${msg.role}-${index}`}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(72,123,255,0.9) 0%, rgba(56,99,245,0.85) 100%)'
                : 'rgba(255,255,255,0.09)',
              color: 'white',
              px: 1.75,
              py: 1.25,
              borderRadius: msg.role === 'user'
                ? '14px 14px 0 14px'
                : '14px 14px 14px 0',
              boxShadow: msg.role === 'user'
                ? '0 10px 26px rgba(35, 72, 196, 0.35)'
                : '0 10px 26px rgba(0, 0, 0, 0.25)',
              maxWidth: '95%',
              whiteSpace: 'pre-line',
              fontSize: '0.95rem',
              lineHeight: 1.45,
            }}
          >
            {msg.content}
          </Box>
        ))}

        {loading && (
          <Fade in>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.7)' }}>
              <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)' }} />
              <Typography variant="caption">Sam está analizando esta propiedad…</Typography>
            </Box>
          </Fade>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Pregúntale a Sam sobre esta propiedad"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255,255,255,0.15)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255,255,255,0.3)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgba(117,161,255,0.8)',
              },
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255,255,255,0.45)',
            },
          }}
        />
        <Tooltip title="Enviar">
          <span>
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              sx={{
                background: 'linear-gradient(135deg, rgba(83,135,255,0.95) 0%, rgba(62,110,255,0.95) 100%)',
                color: 'white',
                borderRadius: '12px',
                p: 1,
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(93,145,255,1) 0%, rgba(72,120,255,1) 100%)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: '#ffb4a9' }}>
          {error}
          <Box component="span" sx={{ ml: 1 }}>
            <Tooltip title="Reintentar">
              <IconButton size="small" onClick={handleRetry} sx={{ color: '#ffb4a9' }}>
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        </Typography>
      )}
    </Box>
  );
};

export default PropertySamAssistant;
