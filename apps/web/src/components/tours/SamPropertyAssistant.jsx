import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { api } from '../../services/api';

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

const formatSummaryLine = (property) => {
  if (!property) return '';
  const segments = [];
  if (property.name) segments.push(`"${property.name}"`);
  if (property.address) segments.push(property.address);
  const priceValue = Number(property.price);
  if (Number.isFinite(priceValue)) segments.push(`precio estimado $${priceValue.toLocaleString()}`);
  const sizeValue = Number(property.size);
  if (Number.isFinite(sizeValue)) segments.push(`superficie ${sizeValue.toFixed(1)} ha`);
  if (property.plusvalia_score != null) segments.push(`plusvalía ${property.plusvalia_score}%`);
  return segments.join(' · ');
};

const SamPropertyAssistant = ({ property }) => {
  const [messages, setMessages] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const summaryLine = useMemo(() => formatSummaryLine(property), [property]);

  useEffect(() => {
    if (!property) return;
    const snapshot = buildPropertySnapshot(property);
    const contextContent = [
      'Contexto de análisis de propiedad:',
      property.name ? `Nombre: "${property.name}"` : null,
      property.id ? `ID interno: ${property.id}` : null,
      summaryLine ? `Resumen: ${summaryLine}` : null,
      'Responde únicamente sobre esta propiedad y no recomiendes otras.',
    ]
      .filter(Boolean)
      .join('\n');

    const contextEntry = {
      role: 'assistant',
      content: contextContent,
      properties: snapshot ? [snapshot] : undefined,
    };

    setConversationHistory(contextEntry ? [contextEntry] : []);
    setMessages([
      {
        id: 'sam-welcome',
        role: 'sam',
        content: property.name
          ? `Hola, soy Sam. Estoy aquí para ayudarte a evaluar "${property.name}". Pregúntame lo que necesites saber de esta propiedad.`
          : 'Hola, soy Sam. Estoy aquí para ayudarte a evaluar esta propiedad. Pregúntame lo que necesites saber.',
      },
    ]);
    setError(null);
    setInputValue('');
  }, [property, summaryLine]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!inputValue.trim() || !property) return;

    const question = inputValue.trim();
    const userMessage = { role: 'user', content: question };
    const uniqueSuffix = Math.random().toString(36).slice(2, 7);
    const newMessage = { id: `user-${Date.now()}-${uniqueSuffix}`, role: 'user', content: question };

    const historyPayload = [...conversationHistory, userMessage];

    setMessages((prev) => [...prev, newMessage]);
    setConversationHistory(historyPayload);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const propertyLine = summaryLine || 'Analiza la propiedad mostrada en el tour actual.';
      const composedQuery = `Analiza la siguiente propiedad de SkyTerra con toda la información disponible. ${propertyLine}. Responde únicamente sobre esta propiedad y evita recomendar otras o mover el mapa. Pregunta del usuario: ${question}`;

      const response = await api.post('/ai-search/', {
        query: composedQuery,
        conversation_history: historyPayload,
      });

      const data = response?.data || {};
      const assistantMessage = data.assistant_message || 'No tengo información adicional en este momento.';
      const assistantEntry = {
        id: `sam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'sam',
        content: assistantMessage,
      };

      setMessages((prev) => [...prev, assistantEntry]);

      const finalHistory = [...historyPayload, { role: 'assistant', content: assistantMessage }];

      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        const propertyEntry = {
          role: 'assistant',
          content: '',
          properties: data.recommendations.slice(0, 5).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            latitude: item.latitude,
            longitude: item.longitude,
            reason: item.reason,
            size: item.size,
            type: item.type,
          })),
        };
        finalHistory.push(propertyEntry);
      }

      setConversationHistory(finalHistory);
    } catch (err) {
      console.error('Error consultando a Sam sobre la propiedad:', err);
      setError('No pude conectar con Sam. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))',
        borderRadius: 3,
        p: 2,
        color: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 12px 35px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Paper
            elevation={0}
            sx={{
              width: 38,
              height: 38,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
            }}
          >
            <PsychologyIcon fontSize="small" />
          </Paper>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Sam analiza esta propiedad
            </Typography>
            {property?.name && (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Enfocado en "{property.name}"
              </Typography>
            )}
          </Box>
        </Box>
        {summaryLine && (
          <Tooltip title={summaryLine} placement="left">
            <Chip
              label="Modo análisis"
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.95)',
                borderRadius: '10px',
              }}
            />
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          maxHeight: 220,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pr: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 8,
          },
        }}
      >
        {messages.map((message) => {
          const isSam = message.role === 'sam';
          return (
            <Box
              key={message.id}
              sx={{
                alignSelf: isSam ? 'flex-start' : 'flex-end',
                backgroundColor: isSam ? 'rgba(12,182,255,0.18)' : 'rgba(255,255,255,0.22)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: isSam ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
                px: 1.5,
                py: 1,
                maxWidth: '100%',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                {message.content}
              </Typography>
            </Box>
          );
        })}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Sam está analizando...
            </Typography>
          </Box>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Pregúntale a Sam sobre esta propiedad"
          variant="outlined"
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          InputProps={{
            sx: {
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderRadius: '14px',
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.25)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.45)',
              },
            },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={loading || !inputValue.trim()}
                  sx={{ color: 'white' }}
                >
                  {loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default SamPropertyAssistant;
