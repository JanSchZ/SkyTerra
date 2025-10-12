import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { api, authService } from '../../services/api';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const UF_TO_USD = Number(import.meta.env.VITE_UF_TO_USD || 33);
const formatUF = (value) => `${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} UF`;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan } = location.state || {};

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const pricing = plan?.pricing;

  const totalUF = pricing?.totalUF || parseFloat(plan?.priceLabel || '0');
  const usdAmount = useMemo(() => Number((totalUF * UF_TO_USD).toFixed(2)), [totalUF]);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        setAuthChecking(true);
        setError('');
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          setError('Debes iniciar sesión para continuar con el pago.');
        }
      } catch (err) {
        setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    setShowPaymentOptions(false);
    setError('');
  }, [plan?.title]);

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      setError('Por favor, ingresa un código de cupón.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setCoupon(null);
    try {
      const response = await api.post('/payments/validate-coupon/', { code: couponCode });
      setCoupon(response.data);
      setSuccess(`Cupón "${response.data.code}" aplicado con éxito.`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo aplicar el cupón.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      setError('Debes iniciar sesión para realizar pagos.');
      return;
    }
    if (!plan?.stripePriceId) {
      setError('Este plan aún no tiene precio configurado en Stripe. Contáctanos para finalizar la compra.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      await authService.ensureCsrfCookie();
      const response = await api.post('/payments/create-checkout-session/', { priceId: plan.stripePriceId });
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: response.data.id });
      if (error) setError(error.message);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        setError(err.response?.data?.error || 'Error al procesar el pago con tarjeta.');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleBitcoinPayment = async () => {
    if (!user) {
      setError('Debes iniciar sesión para realizar pagos.');
      return;
    }

    setPaymentLoading(true);
    setError('');
    try {
      await authService.ensureCsrfCookie();
      const payload = { amount: usdAmount, currency: 'USD', planTitle: plan?.title };
      const response = await api.post('/payments/bitcoin/create-charge/', payload);
      window.location.href = response.data.hostedUrl;
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        setError(err.response?.data?.error || 'Error al procesar el pago con Bitcoin.');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  if (authChecking) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Verificando autenticación...</Typography>
        </Box>
      </Container>
    );
  }

  if (!plan || !user) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" gutterBottom color="error">
            {!plan ? 'No se seleccionó ningún plan' : 'No estás autenticado'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {!plan
              ? 'Por favor, regresa a la página de precios y selecciona un plan.'
              : 'Debes iniciar sesión para continuar con el proceso de pago.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ borderRadius: 2, fontWeight: 'bold' }}>
              Ir a planes
            </Button>
            {!user && (
              <Button variant="outlined" onClick={() => navigate('/login')} sx={{ borderRadius: 2, fontWeight: 'bold' }}>
                Iniciar sesión
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Volver" sx={{ color: 'text.primary' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">Volver</Typography>
        </Box>

        <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 4 }}>
          Finalizar Compra
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6} lg={5}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: '#E5E8F1', boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Resumen del plan</Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ fontWeight: 600 }}>{plan.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.audience}</Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1">Total mensual</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{formatUF(totalUF)}</Typography>
              </Box>

              {plan.pricing?.originalUF && plan.pricing.originalUF !== plan.pricing.totalUF && (
                <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                  Incluye {Math.round((1 - (plan.pricing.discountMultiplier || 1)) * 100)}% de descuento sobre el valor de lista.
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary">
                El pago se procesa en UF + IVA. Stripe mostrará la conversión a tu moneda local.
              </Typography>

              {plan.pricing?.breakdown && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Distribución de publicaciones</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">UF c/u</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.values(plan.pricing.breakdown).map((item) => (
                        item.quantity > 0 && (
                          <TableRow key={item.key}>
                            <TableCell>{item.label}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">{formatUF(item.unitPrice)}</TableCell>
                            <TableCell align="right">{formatUF(item.subtotalWithDiscount)}</TableCell>
                          </TableRow>
                        )
                      ))}
                      <TableRow>
                        <TableCell colSpan={3}>Tarifa de plataforma</TableCell>
                        <TableCell align="right">{formatUF(plan.pricing.platformFee || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Cupón</Typography>
                <Typography variant="body2" color="text.secondary">Los cupones se ingresan directamente en Stripe.</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Código"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                  />
                  <Button variant="outlined" onClick={handleApplyCoupon} disabled={loading}>Aplicar</Button>
                </Box>
                {success && <Alert severity="success" sx={{ mt: 1 }}>{success}</Alert>}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6} lg={5}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: '#E5E8F1', boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Información de pago</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Revisa los detalles y, cuando estés listo, continúa para elegir tu método de pago.
              </Typography>

              {!showPaymentOptions ? (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 4, borderRadius: 3, fontWeight: 700 }}
                  onClick={() => {
                    setShowPaymentOptions(true);
                    setError('');
                  }}
                >
                  Continuar a opciones de pago
                </Button>
              ) : (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ mt: 3, borderRadius: 3, fontWeight: 700 }}
                    onClick={handlePayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? <CircularProgress size={22} color="inherit" /> : 'Pagar con tarjeta (Stripe)'}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{
                      mt: 2,
                      borderRadius: 3,
                      fontWeight: 700,
                      backgroundColor: '#F7931A',
                      color: '#1a1a1a',
                      '&:hover': { backgroundColor: '#ff9f28' },
                    }}
                    onClick={handleBitcoinPayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? <CircularProgress size={22} color="inherit" /> : 'Pagar con Bitcoin'}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Monto estimado en USD: ${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </>
              )}

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
