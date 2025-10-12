import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, IconButton, Button, Chip, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useNavigate } from 'react-router-dom';
import { favoritesService } from '../../services/api';

const HorizontalScroller = ({ children, ariaLabel }) => {
  const [containerRef, setContainerRef] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    if (!containerRef) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScrollLeft = containerRef.scrollWidth - containerRef.clientWidth - 4;
    setCanScrollLeft(containerRef.scrollLeft > 4);
    setCanScrollRight(containerRef.scrollLeft < maxScrollLeft);
  }, [containerRef]);

  useEffect(() => {
    if (!containerRef) return undefined;
    updateScrollIndicators();
    const handleScroll = () => updateScrollIndicators();
    containerRef.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      containerRef.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef, updateScrollIndicators]);

  const scrollBy = useCallback((direction) => {
    if (!containerRef) return;
    const delta = direction === 'left' ? -containerRef.clientWidth * 0.9 : containerRef.clientWidth * 0.9;
    containerRef.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollIndicators, 180);
  }, [containerRef, updateScrollIndicators]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Tooltip title="Anterior" disableHoverListener={!canScrollLeft} arrow>
        <span>
          <IconButton
            aria-label="scroll left"
            onClick={() => scrollBy('left')}
            disabled={!canScrollLeft}
            sx={{ position: 'absolute', top: '40%', left: -12, zIndex: 2, visibility: canScrollLeft ? 'visible' : 'hidden' }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Box
        ref={setContainerRef}
        role="region"
        aria-label={ariaLabel}
        sx={{ display: 'flex', gap: 2, overflowX: 'auto', scrollBehavior: 'smooth', px: 4, py: 1 }}
      >
        {children}
      </Box>
      <Tooltip title="Siguiente" disableHoverListener={!canScrollRight} arrow>
        <span>
          <IconButton
            aria-label="scroll right"
            onClick={() => scrollBy('right')}
            disabled={!canScrollRight}
            sx={{ position: 'absolute', top: '40%', right: -12, zIndex: 2, visibility: canScrollRight ? 'visible' : 'hidden' }}
          >
            <ChevronRightIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

const formatPrice = (value) => {
  if (value === null || value === undefined) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
};

const CardTile = ({ item, onToggleSelect, selected, onUnfavorite, allowCompare = true, onView }) => {
  const hasTour = !!item.previewTourUrl;
  const imageUrl = item.main_image || (item.images && item.images[0]?.url) || null;
  return (
    <Paper variant="glass" sx={{ width: 280, minWidth: 280, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <Box sx={{ width: '100%', height: 160, backgroundColor: '#111', position: 'relative' }}>
        {onUnfavorite && (
          <IconButton
            aria-label="Quitar de guardados"
            onClick={() => onUnfavorite(item.id)}
            size="small"
            sx={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', color: 'white', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' } }}
          >
            <FavoriteIcon fontSize="small" />
          </IconButton>
        )}
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
            <Chip size="small" label={formatPrice(item.price)} />
          )}
          {item.type && <Chip size="small" variant="outlined" label={item.type} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {allowCompare && (
            <Button
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              startIcon={<CompareArrowsIcon />}
              onClick={() => onToggleSelect(item.id)}
            >
              {selected ? 'Seleccionada' : 'Comparar'}
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={() => onView?.(item.id)}>
            Ver
          </Button>
          {onUnfavorite && (
            <Button size="small" color="error" onClick={() => onUnfavorite(item.id)}>
              Quitar
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

const SavedAndRecent = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [recent, setRecent] = useState([]);
  const [selected, setSelected] = useState([]);

  const normalizeProperty = useCallback((raw) => {
    if (!raw) return null;
    const prop = raw.property_details || raw.property || raw;
    const images = Array.isArray(prop.images) ? prop.images : raw.images || [];
    return {
      id: prop.id || raw.id,
      name: prop.name || raw.name || 'Propiedad',
      price: prop.price ?? raw.price ?? null,
      size: prop.size ?? raw.size ?? null,
      images,
      main_image: prop.main_image || raw.main_image || (images && images[0]?.url) || null,
      type: prop.type || raw.type || null,
      previewTourUrl: prop.previewTourUrl || raw.previewTourUrl || null,
    };
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await favoritesService.list();
      const normalized = (favs || [])
        .map(normalizeProperty)
        .filter(Boolean);
      setSaved(normalized);
    } catch (err) {
      console.error('No se pudieron cargar los guardados:', err);
      setSaved([]);
    }
  }, [normalizeProperty]);

  const loadRecents = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('recently_viewed_properties');
      if (!raw) {
        setRecent([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeProperty).filter(Boolean)
        : [];
      setRecent(normalized);
    } catch (err) {
      console.error('No se pudieron cargar los recientes:', err);
      setRecent([]);
    }
  }, [normalizeProperty]);

  useEffect(() => {
    loadFavorites();
    loadRecents();
  }, [loadFavorites, loadRecents]);

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

  const handleUnfavorite = async (propertyId) => {
    try {
      await favoritesService.removeByProperty(propertyId);
      setSaved((prev) => prev.filter((p) => p.id !== propertyId));
      setSelected((prev) => prev.filter((id) => id !== propertyId));
    } catch (err) {
      console.error('No se pudo quitar de guardados:', err);
    }
  };

  const handleView = (propertyId) => {
    if (!propertyId) return;
    navigate(`/property/${propertyId}`);
  };

  const handleClearRecent = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('recently_viewed_properties');
    setRecent([]);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 2 }}>Guardados y recientes</Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
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
              <CardTile
                key={`sav-${f.id}`}
                item={f}
                onToggleSelect={toggleSelect}
                selected={selected.includes(f.id)}
                onUnfavorite={handleUnfavorite}
                onView={handleView}
              />
            ))}
          </HorizontalScroller>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">Recientes</Typography>
          <Button variant="text" size="small" disabled={recent.length === 0} onClick={handleClearRecent}>
            Limpiar recientes
          </Button>
        </Box>
        {recent.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Explora propiedades y aparecerán aquí automáticamente.</Typography>
        ) : (
          <HorizontalScroller ariaLabel="Recientes">
            {recent.map((item) => (
              <CardTile
                key={`recent-${item.id}`}
                item={item}
                onToggleSelect={toggleSelect}
                selected={selected.includes(item.id)}
                allowCompare
                onView={handleView}
              />
            ))}
          </HorizontalScroller>
        )}
      </Box>
    </Box>
  );
};

export default SavedAndRecent;

