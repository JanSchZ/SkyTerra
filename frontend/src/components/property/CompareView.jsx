import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { api } from '../../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Vista que muestra hasta 4 propiedades lado a lado para comparación, con cada
 * tour a la derecha y su tarjeta de especificaciones a la izquierda.
 * Acepta lista de ids en query param ?ids=1,2,3. Si no hay ids, intenta
 * recuperar una sesión existente /compare/ (GET) y redirige con ids.
 */
const CompareView = () => {
  const [propsData, setPropsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchedRef = useRef(false);

  const idsParam = searchParams.get('ids');
  const ids = useMemo(() => {
    return (idsParam ? idsParam.split(',') : [])
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n))
      .slice(0, 4);
  }, [idsParam]);

  const buildTourUrl = (url) => {
    if (!url) return '';
    const hasHash = url.includes('#');
    const [prefix, tail] = hasHash ? url.split('#') : url.split('?');
    const params = new URLSearchParams(tail || '');
    params.set('autoLoad', 'true');
    if (!params.has('autoRotate')) params.set('autoRotate', '0');
    return `${prefix}${hasHash ? '#' : '?'}${params.toString()}`;
  };

  useEffect(() => {
    if (fetchedRef.current) return; // evita doble ejecución en StrictMode
    fetchedRef.current = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (ids.length === 0) {
          // GET current comparison session
          const resp = await api.get('/compare/', { skipAuth: true });
          const session = resp.data?.results?.[0] || resp.data?.[0];
          const sessionIds = session?.properties?.map((p) => p.id) || [];
          if (sessionIds.length > 0) {
            navigate(`/compare?ids=${sessionIds.join(',')}`, { replace: true });
          }
        } else {
          const resp = await api.get('/properties-preview/', {
            params: { id__in: ids.join(','), page_size: ids.length },
            skipAuth: true,
          });
          const results = resp?.data?.results || resp?.data || [];
          const byId = new Map(results.map((p) => [p.id, p]));
          const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
          setPropsData(ordered);
        }
      } catch (err) {
        setError('Error al cargar comparación');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ids, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (propsData.length === 0) {
    return <Typography sx={{ mt: 8, textAlign: 'center' }}>No hay propiedades para comparar.</Typography>;
  }

  const renderRow = (label, getValue) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{label}</Typography>
      <Grid container spacing={2}>
        {propsData.map((p) => (
          <Grid item xs={12 / propsData.length} key={`${label}-${p.id}`}>
            <Typography>{getValue(p)}</Typography>
          </Grid>
        ))}
      </Grid>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Comparación</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {propsData.map((p) => (
          <Grid item xs={12} md={12 / Math.min(propsData.length, 4)} key={`col-${p.id}`}>
            <Box sx={{ display: 'flex', height: { xs: 420, md: '70vh' }, backgroundColor: '#0c0c0c', borderRadius: 2, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
              <Box sx={{ width: { xs: 220, md: 300 }, p: 2, color: 'white', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))', borderRight: '1px solid rgba(255,255,255,0.18)' }}>
                <Typography variant="h6" sx={{ mb: 1 }} noWrap>{p.name}</Typography>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {p.price ? Number(p.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—'}
                </Typography>
                <Chip label={`${p.size} ha`} size="small" sx={{ mb: 2 }} />
                <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                <Typography variant="body2" sx={{ mb: 1 }}>Lat/Lon</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {p.latitude && p.longitude ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : '—'}
                </Typography>
                {p.main_image && (
                  <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
                    <CardMedia component="img" image={p.main_image} height="120" alt={p.name} sx={{ objectFit: 'cover', borderRadius: 1 }} />
                  </Card>
                )}
              </Box>
              <Box sx={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
                {p.previewTourUrl ? (
                  <iframe src={buildTourUrl(p.previewTourUrl)} title={`Tour ${p.id}`} width="100%" height="100%" frameBorder="0" allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking" style={{ position: 'absolute', inset: 0, border: 'none' }} />
                ) : (
                  p.main_image ? (
                    <CardMedia component="img" image={p.main_image} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography variant="body2">Sin tour ni imagen</Typography>
                    </Box>
                  )
                )}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {renderRow('Precio', (p) => p.price ? Number(p.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—')}
      {renderRow('Tamaño', (p) => `${p.size} ha`)}
      {renderRow('Coordenadas', (p) => `${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}`)}
    </Box>
  );
};

export default CompareView; 