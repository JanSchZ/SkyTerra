import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const UF_FORMAT = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

const formatUF = (value) => `${UF_FORMAT.format(value)} UF`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const PlanDetailDialog = ({ open, plan, propertyTypes, onClose, onConfirm }) => {
  const hasCalculator = plan?.tier === 'professional' && plan?.maxListings;
  const [counts, setCounts] = useState({ basic: plan?.maxListings ? Math.min(plan.maxListings, 1) : 1, advanced: 0, pro: 0 });
  const [error, setError] = useState('');

  React.useEffect(() => {
    setCounts({ basic: plan?.maxListings ? Math.min(plan.maxListings, 1) : 1, advanced: 0, pro: 0 });
    setError('');
  }, [plan?.id, plan?.maxListings]);

  const totals = useMemo(() => {
    if (!plan) return null;
    const discount = plan.discountMultiplier ?? 1;
    const platformFee = plan.platformFee ?? 0;

    const breakdown = propertyTypes.reduce((acc, item) => {
      const qty = counts[item.key] || 0;
      const subtotal = qty * item.unitPrice;
      acc[item.key] = {
        ...item,
        quantity: qty,
        subtotal,
        subtotalWithDiscount: subtotal * discount,
      };
      return acc;
    }, {});

    const totalQty = propertyTypes.reduce((sum, item) => sum + (counts[item.key] || 0), 0);
    const baseSum = propertyTypes.reduce((sum, item) => sum + (counts[item.key] || 0) * item.unitPrice, 0);
    const discountedSum = baseSum * discount;
    const totalUF = discountedSum + platformFee;
    const originalUF = baseSum + platformFee;

    return {
      totalQty,
      baseSum,
      discountedSum,
      totalUF,
      originalUF,
      platformFee,
      discount,
      breakdown,
    };
  }, [plan, propertyTypes, counts]);

  const handleChange = (key, rawValue) => {
    const numericValue = Number(rawValue);
    if (Number.isNaN(numericValue)) return;
    setCounts((prev) => {
      const othersTotal = propertyTypes.reduce((sum, type) => {
        if (type.key === key) return sum;
        return sum + (prev[type.key] || 0);
      }, 0);

      const maxAllowed = Math.max(0, (plan.maxListings || 0) - othersTotal);
      const nextValue = clamp(Math.floor(numericValue), 0, maxAllowed);

      return { ...prev, [key]: nextValue };
    });
  };

  const handleConfirm = () => {
    if (!plan) return;
    if (hasCalculator) {
      if (!totals || totals.totalQty === 0) {
        setError('Debes asignar al menos una publicación.');
        return;
      }
      if (totals.totalQty > plan.maxListings) {
        setError(`Tu plan incluye hasta ${plan.maxListings} avisos activos. Ajusta la distribución.`);
        return;
      }
    }
    setError('');

    const payload = {
      ...plan,
      pricing: totals
        ? {
            totalUF: totals.totalUF,
            originalUF: totals.originalUF,
            discountMultiplier: totals.discount,
            platformFee: totals.platformFee,
            breakdown: totals.breakdown,
          }
        : {
            totalUF: parseFloat(plan.priceLabel),
            breakdown: null,
            platformFee: plan.platformFee ?? 0,
            discountMultiplier: plan.discountMultiplier ?? 1,
          },
      selection: hasCalculator ? { counts, propertyTypes } : null,
      propertyTypes,
    };

    onConfirm?.(payload);
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{plan.title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>¿Para quién es este plan?</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{plan.audience}</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Resumen</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{plan.summary}</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Incluye</Typography>
            <List dense>
              {plan.features.map((feature) => (
                <ListItem key={feature} disableGutters>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color={plan.isFeatured ? 'primary' : 'action'} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ backgroundColor: '#f5f7fb', borderRadius: 3, p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Calcula tu inversión</Typography>
              {hasCalculator ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Selecciona cuántos terrenos de cada tipo quieres publicar (máx. {plan.maxListings}). Te quedan {Math.max(0, (plan.maxListings || 0) - (totals?.totalQty || 0))} disponibles.
                  </Typography>
                  {propertyTypes.map((type) => (
                    <Box key={type.key} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{type.label} — {formatUF(type.unitPrice)} c/u</Typography>
                      <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        inputProps={{ min: 0, max: plan.maxListings }}
                        value={counts[type.key] ?? 0}
                        onChange={(event) => handleChange(type.key, event.target.value)}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  ))}

                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, backgroundColor: 'white', border: '1px solid #e4e8f1' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Resumen estimado</Typography>
                    <Typography variant="body2" color="text.secondary">Publicaciones: {totals?.totalQty || 0} / {plan.maxListings}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>{formatUF(totals?.totalUF || 0)}</Typography>
                    {plan.discountMultiplier && plan.discountMultiplier < 1 && (
                      <Typography variant="body2" color="success.main">
                        Incluye {Math.round((1 - plan.discountMultiplier) * 100)}% de descuento en cada publicación.
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      El valor final se factura en UF + IVA. La tarifa de plataforma es {formatUF(plan.platformFee ?? 0)}.
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{plan.story}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>Desde {plan.priceLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">Valor en UF + IVA</Typography>
                </>
              )}

              {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text">Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" sx={{ borderRadius: 2, fontWeight: 600 }}>
          Continuar con {plan.title}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanDetailDialog;
