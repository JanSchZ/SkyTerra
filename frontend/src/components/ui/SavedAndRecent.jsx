import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, IconButton, Button, Chip, Link } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useNavigate } from 'react-router-dom';
import { favoritesService } from '../../services/api';

const HorizontalScroller = ({ children, ariaLabel }) => {
  const [containerRef, setContainerRef] = useState(null);
  const scrollBy = (direction) => {
    if (!containerRef) return;
    const delta = direction === 'left' ? -containerRef.clientWidth * 0.9 : containerRef.clientWidth * 0.9;
    containerRef.scrollBy({ left: delta, behavior: 'smooth' });
  };
  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton aria-label="scroll left" onClick={() => scrollBy('left')} sx={{ position: 'absolute', top: '40%', left: -10, zIndex: 2 }}>
        <ChevronLeftIcon />
      </IconButton>
      <Box
        ref={setContainerRef}
        role="region"
        aria-label={ariaLabel}
        sx={{ display: 'flex', gap: 2, overflowX: 'auto', scrollBehavior: 'smooth', px: 4, py: 1 }}
      >
        {children}
      </Box>
      <IconButton aria-label="scroll right" onClick={() => scrollBy('right')} sx={{ position: 'absolute', top: '40%', right: -10, zIndex: 2 }}>
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
};

const CardTile = ({ item, onToggleSelect, selected }) => {
  const hasTour = !!item.previewTourUrl;
  const imageUrl = item.main_image || (item.images && item.images[0]?.url) || null;
  return (
    <Paper variant="glass" sx={{ width: 280, minWidth: 280, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ width: '100%', height: 160, backgroundColor: '#111' }}>
        {hasTour ? (
          <iframe src={item.previewTourUrl} width="100%" height="160" style={{ border: 0 }} title={`Preview ${item.name}`} />
        ) : (
          imageUrl ? <img src={imageUrl} alt={item.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} /> : null
        )}
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle1" noWrap>{item.name}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{item.size ? `${item.size} ha` : ''}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
          {typeof item.price !== 'undefined' && (
            <Chip size="small" label={
              item.price ? Number(item.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—'
            } />
          )}
          {item.type && <Chip size="small" variant="outlined" label={item.type} />}
        </Box>
        <Button
          size="small"
          variant={selected ? 'contained' : 'outlined'}
          startIcon={<CompareArrowsIcon />}
          onClick={() => onToggleSelect(item.id)}
          sx={{ mt: 1 }}
        >
          {selected ? 'Seleccionada' : 'Comparar'}
        </Button>
      </Box>
    </Paper>
  );
};

const SavedAndRecent = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const favs = await favoritesService.list();
        const normalized = (favs || []).map((f) => {
          const prop = f.property_details || f.property || f;
          return {
            id: prop.id || f.property,
            name: prop.name,
            price: prop.price,
            size: prop.size,
            images: prop.images,
            main_image: prop.main_image,
            type: prop.type,
            previewTourUrl: prop.previewTourUrl,
          };
        });
        setSaved(normalized);
      } catch (_) {
        setSaved([]);
      }
    };
    load();
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      let next = has ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length > 4) next = next.slice(-4);
      return next;
    });
  };

  const handleCompare = () => {
    if (selected.length === 0) return;
    navigate(`/compare?ids=${selected.join(',')}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Guardados</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Guardados</Typography>
        <Button variant="contained" size="small" disabled={selected.length === 0} onClick={handleCompare}>
          Comparar ({selected.length}/4)
        </Button>
      </Box>
      {saved.length === 0 ? (
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>No tienes guardados.</Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>Volver al mapa</Button>
        </Box>
      ) : (
        <HorizontalScroller ariaLabel="Guardados">
          {saved.map((f) => (
            <CardTile key={`sav-${f.id}`} item={f} onToggleSelect={toggleSelect} selected={selected.includes(f.id)} />
          ))}
        </HorizontalScroller>
      )}
    </Box>
  );
};

export default SavedAndRecent;


