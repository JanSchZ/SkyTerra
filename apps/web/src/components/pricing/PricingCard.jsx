import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const formatUF = (value) => {
  const formatter = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${formatter.format(value)} UF`;
};

const PricingCard = ({ plan, onSelect }) => {
  const ranges = plan.ranges;
  const hasDiscount = !!(ranges && plan.discountMultiplier && plan.discountMultiplier < 1);
  const discountPercent = hasDiscount ? Math.round((1 - plan.discountMultiplier) * 100) : 0;

  const discountedValue = ranges ? ranges.discounted.min : parseFloat(plan.priceLabel || '0');
  const listValue = ranges ? ranges.original.min : parseFloat(plan.priceLabel || '0');
  const priceLabel = `Desde ${formatUF(discountedValue)}`;

  const cardRef = React.useRef(null);
  const [hover, setHover] = React.useState(false);
  const [mouse, setMouse] = React.useState({ x: '50%', y: '50%' });
  const animRef = React.useRef(0);
  const curRef = React.useRef({ x: 0, y: 0 });
  const tgtRef = React.useRef({ x: 0, y: 0 });

  const lerp = (a, b, t) => a + (b - a) * t;

  const updateLoop = () => {
    const cur = curRef.current;
    const tgt = tgtRef.current;
    const nx = lerp(cur.x, tgt.x, 0.18);
    const ny = lerp(cur.y, tgt.y, 0.18);
    curRef.current = { x: nx, y: ny };
    setMouse({ x: `${nx}px`, y: `${ny}px` });
    animRef.current = requestAnimationFrame(updateLoop);
  };

  const handleMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    tgtRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleEnter = (e) => {
    setHover(true);
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    curRef.current = { x, y };
    tgtRef.current = { x, y };
    setMouse({ x: `${x}px`, y: `${y}px` });
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(updateLoop);
  };

  const handleLeave = () => {
    setHover(false);
    cancelAnimationFrame(animRef.current);
  };

  return (
    <Card
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: 4,
        border: '1px solid',
        borderColor: plan.isFeatured ? 'primary.main' : 'grey.200',
        backgroundColor: 'white',
        color: 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 320,
        transition: 'transform 0.3s ease, box-shadow 0.4s ease',
        willChange: 'transform, box-shadow',
        boxShadow: plan.isFeatured
          ? '0 12px 30px rgba(13, 93, 216, 0.25)'
          : '0 6px 18px rgba(15, 27, 57, 0.08)',
        // Cursor-follow halo contained inside the card (featured only)
        '&::before': plan.isFeatured
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              zIndex: 0,
              background: `radial-gradient(ellipse 130px 90px at var(--mx, 50%) var(--my, 50%), rgba(88,116,255,0.22), rgba(199,75,255,0.15) 40%, rgba(88,116,255,0) 65%)`,
              opacity: hover ? 1 : 0,
              transition: 'opacity 220ms ease',
              filter: 'blur(12px)',
            }
          : {},
        '&:hover': {
          transform: 'translateY(-10px)',
          boxShadow: plan.isFeatured
            ? '0 18px 42px rgba(88, 116, 255, 0.35), 0 12px 32px rgba(199, 75, 255, 0.25)'
            : '0 12px 28px rgba(15, 27, 57, 0.15)',
        },
        '@keyframes glowPulse': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 0.9 },
        },
      }}
      style={{
        // Feed CSS vars to the ::before halo
        ['--mx']: mouse.x,
        ['--my']: mouse.y,
      }}
    >
      {plan.isFeatured && (
        <Chip
          label="Más popular"
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #5868FF 0%, #C74BFF 100%)',
            color: 'white',
            boxShadow: '0 0 12px rgba(199, 75, 255, 0.35)',
          }}
        />
      )}
      <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{plan.title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>{plan.summary}</Typography>

        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{priceLabel}</Typography>
          {hasDiscount && (
            <Chip
              label={`Ahorra ${discountPercent}%`}
              color="success"
              size="small"
              sx={{ fontWeight: 700, height: 24, alignSelf: 'flex-start' }}
            />
          )}
          {plan.tier === 'professional' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                Precio de lista: {formatUF(listValue)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tarifa de plataforma: {formatUF(plan.platformFee ?? 0)}
              </Typography>
            </Box>
          )}
          {plan.tier !== 'professional' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Valor en UF + IVA.
            </Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <List dense sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0 }}>
            {plan.features.map((feature) => (
              <ListItem key={feature} disableGutters sx={{ pb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'primary.main' }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={feature} primaryTypographyProps={{ sx: { fontSize: 14 } }} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            fullWidth
            variant={plan.isFeatured ? 'contained' : 'outlined'}
            color={plan.isFeatured ? 'primary' : 'primary'}
            size="large"
            sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 1.4 }}
            onClick={onSelect}
          >
            {plan.tier === 'professional' ? 'Calcular mi plan' : 'Seleccionar plan'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PricingCard;
