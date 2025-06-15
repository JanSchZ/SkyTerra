import React, { useEffect, useState } from 'react';
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
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Vista que muestra hasta 4 propiedades lado a lado para comparación.
 * Acepta lista de ids en query param ?ids=1,2,3
 * Si no hay ids, intenta recuperar sesión /api/compare/ (GET) y redirige con ids.
 */
const CompareView = () => {
  const [propsData, setPropsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const idsParam = searchParams.get('ids');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let ids = idsParam ? idsParam.split(',').map((x) => parseInt(x)) : [];
        if (ids.length === 0) {
          // GET current comparison session
          const resp = await axios.get('/api/compare/');
          const session = resp.data?.results?.[0] || resp.data?.[0];
          ids = session?.properties?.map((p) => p.id) || [];
          if (ids.length > 0) {
            navigate(`/compare?ids=${ids.join(',')}`, { replace: true });
          }
        } else {
          if (ids.length > 4) ids = ids.slice(0, 4);
          const resp = await axios.get('/api/properties-preview/', {
            params: { id__in: ids.join(',') }, // assumes backend filter
          });
          // But DRF default filter not set; fallback fetch individual
          const properties = [];
          for (const id of ids) {
            const r = await axios.get(`/api/properties-preview/${id}/`);
            properties.push(r.data);
          }
          setPropsData(properties);
        }
      } catch (err) {
        setError('Error al cargar comparación');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idsParam, navigate]);

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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>Comparación de Propiedades</Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {propsData.map((p) => (
          <Grid item xs={12 / propsData.length} key={p.id}>
            <Card variant="glass">
              {p.main_image && (
                <CardMedia component="img" image={p.main_image} height="160" alt={p.name} />
              )}
              <CardContent>
                <Typography variant="h6" noWrap>{p.name}</Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {p.price ? Number(p.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—'}
                </Typography>
                <Chip label={`${p.size} ha`} size="small" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {renderRow('Precio', (p) => p.price ? Number(p.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : '—')}
      {renderRow('Tamaño', (p) => `${p.size} ha`)}
      {renderRow('Coordenadas', (p) => `${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}`)}
      {/* Aquí se pueden añadir más filas comparativas con métricas avanzadas */}
    </Box>
  );
};

export default CompareView; 