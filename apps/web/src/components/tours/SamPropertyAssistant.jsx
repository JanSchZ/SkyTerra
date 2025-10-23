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
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PsychologyIcon from '@mui/icons-material/Psychology';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { api } from '../../services/api';

const QUICK_PROMPTS = [
  'Dame un resumen rápido de esta propiedad',
  '¿Cuáles son los puntos fuertes que ves?',
  '¿Qué debo revisar con más detalle antes de invertir?',
];

const buildPropertyContext = (property) => {
  if (!property) return '';
  const lines = [];
  lines.push(`Estamos analizando la propiedad "${property.name || 'sin nombre'}".`);
  if (property.listing_type) {
    lines.push(`Tipo de listing: ${property.listing_type}.`);
  }
  if (property.type) {
    lines.push(`Tipo de propiedad: ${property.type}.`);
  }
  const priceValue = Number(property.price);
  if (!Number.isNaN(priceValue) && priceValue > 0) {
    lines.push(`Precio listado: ${priceValue}.`);
  }
  const sizeValue = Number(property.size);
  if (!Number.isNaN(sizeValue) && sizeValue > 0) {
    lines.push(`Superficie: ${sizeValue} hectáreas.`);
  }
  if (property.address) {
    lines.push(`Dirección o referencia: ${property.address}.`);
  }
  if (property.description) {
    lines.push(`Descripción breve: ${property.description}`);
  }
  lines.push('Enfócate exclusivamente en esta propiedad del tour virtual. No sugieras visitar otras zonas del mapa ni listar propiedades adicionales.');
  lines.push('Si necesitas información adicional pídela en relación con esta propiedad específica.');
  return lines.join('\n');
};

const formatAssistantIntro = (property) => {
  if (!property) {
    return 'Hola, soy Sam. Estoy aquí para ayudarte a analizar los detalles de esta propiedad.';
  }
  return `Hola, soy Sam. Estoy analizando contigo la propiedad "${property.name || 'sin nombre'}". Pregúntame lo que quieras y me enfocaré solo en este activo.`;
};

const SamPropertyAssistant = ({ property }) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const propertyContext = useMemo(() => buildPropertyContext(property), [property]);

  useEffect(() => {
    if (property) {
      const introMessage = formatAssistantIntro(property);
      setMessages([
        {
          role: 'assistant',
          content: introMessage,
        },
      ]);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: formatAssistantIntro(null),
        },
      ]);
    }
  }, [property?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setLoading(true);

    try {
      const conversation_history = [
        propertyContext ? { role: 'user', content: propertyContext } : null,
        ...nextMessages.map(({ role, content }) => ({ role, content })),
      ].filter(Boolean);

      const response = await api.post('/ai-search/', {
        query: trimmed,
        conversation_history,
      });

      const assistantReply = response?.data?.assistant_message;
      const replyContent = assistantReply || 'Por ahora no tengo más información, pero seguiré aprendiendo sobre esta propiedad.';
      setMessages((prev) => [...prev, { role: 'assistant', content: replyContent }]);
    } catch (error) {
      console.error('Error consultando a Sam:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'No pude conectar con el servicio en este momento. Intenta nuevamente en unos segundos.',
        },
      ]);
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

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2.5,
        mb: 2,
        background: theme.palette.mode === 'dark'
          ? 'rgba(15, 23, 42, 0.55)'
          : 'rgba(255, 255, 255, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.32)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? 'primary.main' : 'primary.dark',
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
            Conversación centrada en esta propiedad. Pregúntame detalles específicos.
          </Typography>
        </Box>
        {property?.id && (
          <Tooltip title={`ID interno: ${property.id}`} placement="left">
            <InfoOutlinedIcon sx={{ color: 'rgba(255,255,255,0.6)' }} fontSize="small" />
          </Tooltip>
        )}
      </Box>

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.75)' }}>
            <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.75)' }} />
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              Sam está analizando esta propiedad...
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {QUICK_PROMPTS.map((prompt) => (
          <Chip
            key={prompt}
            label={prompt}
            onClick={() => handleQuickPrompt(prompt)}
            disabled={loading}
            sx={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.78rem',
              '&:hover': {
                background: 'rgba(255,255,255,0.18)',
              },
            }}
          />
        ))}
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Pregúntale algo a Sam sobre esta propiedad"
          fullWidth
          variant="outlined"
          size="small"
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
                borderColor: theme.palette.primary.main,
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
          }}
        >
          <SendIcon sx={{ color: 'white' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default SamPropertyAssistant;
