import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Fade from '@mui/material/Fade';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { api, authService } from '../../services/api';
import { loadStripe } from '@stripe/stripe-js';
import paymentsService from '../../services/paymentsService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const UF_TO_USD = Number(import.meta.env.VITE_UF_TO_USD || 33);
const formatUF = (value) => `${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} UF`;
const PENDING_PLAN_STORAGE_KEY = 'skyterra.pendingPlan';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, listingId: locationListingId = null, from: origin = null } = location.state || {};

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [zeroCheckoutOpen, setZeroCheckoutOpen] = useState(false);
  const [zeroCheckoutProcessing, setZeroCheckoutProcessing] = useState(false);
  const [zeroCheckoutError, setZeroCheckoutError] = useState('');
  const [zeroCheckoutSuccess, setZeroCheckoutSuccess] = useState(false);

  const listingId = locationListingId ?? null;
  const planKey = plan?.listingPlanKey || plan?.id || plan?.key || null;
  const planId = plan?.listingPlanId ?? null;
  const planTitle = plan?.title || plan?.backendPlanName || plan?.name || null;
  const planSource = origin || 'pricing';

  const pricing = plan?.pricing;

  const totalUF = pricing?.totalUF || parseFloat(plan?.priceLabel || '0');

  const computeDiscountedUF = (baseUF, couponData) => {
    const base = Number.isFinite(baseUF) ? baseUF : 0;
    if (!couponData) {
      return Number(base.toFixed(2));
    }
    const couponValue = Number(couponData.value || 0);
    let result = base;
    if (couponData.discount_type === 'percentage') {
      result = base * (1 - couponValue / 100);
    } else if (couponData.discount_type === 'fixed') {
      result = base - couponValue;
    }
    if (!Number.isFinite(result)) {
      result = base;
    }
    if (result < 0) {
      result = 0;
    }
    return Number(result.toFixed(2));
  };

  const discountedUF = useMemo(() => computeDiscountedUF(totalUF, coupon), [totalUF, coupon]);
  const discountAmountUF = useMemo(
    () => Number(Math.max(totalUF - discountedUF, 0).toFixed(2)),
    [totalUF, discountedUF]
  );
  const usdAmount = useMemo(() => Number((discountedUF * UF_TO_USD).toFixed(2)), [discountedUF]);

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
        console.error('Auth verification failed', err);
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

  const buildActivationPayload = useCallback(
    (overrides = {}) => ({
      listingId,
      planId,
      planKey,
      planTitle,
      couponCode: (overrides.couponCode ?? coupon?.code ?? couponCode) || null,
      source: overrides.source || planSource,
    }),
    [listingId, planId, planKey, planTitle, coupon?.code, couponCode, planSource]
  );

  const startZeroCheckout = useCallback(
    async (couponData, updatedTotalUF) => {
      setZeroCheckoutOpen(true);
      setZeroCheckoutProcessing(true);
      setZeroCheckoutError('');
      setZeroCheckoutSuccess(false);
      setError('');
      setSuccess('');

      try {
        if (!planKey) {
          throw new Error('No pudimos identificar el plan seleccionado.');
        }
        if (!plan) {
          throw new Error('No se encontró la información del plan seleccionado.');
        }
        await authService.ensureCsrfCookie();
        await api.post('/payments/zero-checkout/', {
          planId,
          planKey,
          planTitle,
          totalUF,
          discountedUF: updatedTotalUF,
          listingId,
          couponCode: couponData?.code ?? couponCode,
        });
        await paymentsService.activatePlan(
          buildActivationPayload({
            couponCode: couponData?.code ?? couponCode,
            source: 'zero-checkout',
          })
        );
        setZeroCheckoutSuccess(true);
        setSuccess(
          `Cupón "${couponData?.code || ''}" aplicado correctamente. ¡Invita la casa! Activamos tu plan sin costo.`
        );
        setTimeout(() => {
          setZeroCheckoutOpen(false);
          navigate('/payment-success', {
            replace: true,
            state: {
              fromZeroCheckout: true,
              planActivation: buildActivationPayload({
                couponCode: couponData?.code ?? couponCode,
                source: 'zero-checkout',
              }),
            },
          });
        }, 1200);
      } catch (err) {
        const message = err?.response?.data?.error || err?.message || 'No se pudo activar el plan con el cupón.';
        setZeroCheckoutError(message);
        setError(message);
      } finally {
        setZeroCheckoutProcessing(false);
      }
    },
    [plan, planKey, planTitle, planId, listingId, totalUF, couponCode, navigate, buildActivationPayload]
  );

  const handleRetryZeroCheckout = () => {
    if (coupon && discountedUF === 0 && !zeroCheckoutProcessing) {
      startZeroCheckout(coupon, discountedUF);
    }
  };

  const handleCloseZeroCheckout = () => {
    if (!zeroCheckoutProcessing) {
      setZeroCheckoutOpen(false);
      setZeroCheckoutError('');
      setZeroCheckoutSuccess(false);
    }
  };

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
      const updatedTotal = computeDiscountedUF(totalUF, response.data);
      setCoupon(response.data);
      if (updatedTotal === 0) {
        await startZeroCheckout(response.data, updatedTotal);
      } else {
        setSuccess(`Cupón "${response.data.code}" aplicado con éxito. Nuevo total: ${formatUF(updatedTotal)}.`);
        setZeroCheckoutOpen(false);
        setZeroCheckoutError('');
        setZeroCheckoutSuccess(false);
      }
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
    if (!planKey) {
      setError('No pudimos identificar el plan seleccionado. Intenta nuevamente.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      await authService.ensureCsrfCookie();
      const response = await api.post('/payments/create-checkout-session/', { priceId: plan.stripePriceId });
      const pendingPayload = buildActivationPayload();
      localStorage.setItem(
        PENDING_PLAN_STORAGE_KEY,
        JSON.stringify({
          ...pendingPayload,
          createdAt: Date.now(),
        })
      );
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: response.data.id });
      if (error) setError(error.message);
    } catch (err) {
      localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
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
    if (!planKey) {
      setError('No pudimos identificar el plan seleccionado. Intenta nuevamente.');
      return;
    }

    setPaymentLoading(true);
    setError('');
    try {
      await authService.ensureCsrfCookie();
      const payload = { amount: usdAmount, currency: 'USD', planTitle: plan?.title };
      const response = await api.post('/payments/bitcoin/create-charge/', payload);
      const pendingPayload = buildActivationPayload({ source: 'bitcoin' });
      localStorage.setItem(
        PENDING_PLAN_STORAGE_KEY,
        JSON.stringify({
          ...pendingPayload,
          createdAt: Date.now(),
        })
      );
      window.location.href = response.data.hostedUrl;
    } catch (err) {
      localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
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
            <Button
              variant="contained"
              onClick={() => navigate('/pricing', { state: { listingId } })}
              sx={{ borderRadius: 2, fontWeight: 'bold' }}
            >
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
          <Grid xs={12} md={6} lg={5}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: '#E5E8F1', boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Resumen del plan</Typography>
              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ fontWeight: 600 }}>{plan.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.audience}</Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
                <Typography variant="subtitle1">Total mensual</Typography>
                <Box sx={{ textAlign: 'right' }}>
                  {discountAmountUF > 0 ? (
                    <>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {formatUF(discountedUF)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                        {formatUF(totalUF)}
                      </Typography>
                      <Typography variant="caption" color="success.main">
                        Cupón aplicado: -{formatUF(discountAmountUF)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {formatUF(totalUF)}
                    </Typography>
                  )}
                </Box>
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

          <Grid xs={12} md={6} lg={5}>
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

      <Modal open={zeroCheckoutOpen} onClose={handleCloseZeroCheckout} closeAfterTransition BackdropProps={{ timeout: 300 }}>
        <Fade in={zeroCheckoutOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: { xs: '90%', sm: 420 },
              p: 4,
              borderRadius: 4,
              textAlign: 'center',
              color: 'text.primary',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(236,242,255,0.98) 100%)',
              boxShadow: '0 32px 80px rgba(18, 47, 122, 0.3)',
              overflow: 'hidden',
              '@keyframes pulseGlow': {
                '0%, 100%': { boxShadow: '0 0 0 rgba(99, 102, 241, 0.0)' },
                '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.28)' },
              },
              animation: zeroCheckoutProcessing && !zeroCheckoutSuccess ? 'pulseGlow 2.4s ease-in-out infinite' : 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: '-160px -140px auto auto',
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle at center, rgba(99,102,241,0.18), rgba(236,72,153,0.12), transparent 70%)',
                filter: 'blur(0px)',
                pointerEvents: 'none',
              }}
            />
            <CelebrationIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              ¡Invita la casa!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Tu cupón cubrió el 100% del plan. Estamos activándolo automáticamente sin costo.
            </Typography>
            {zeroCheckoutProcessing && !zeroCheckoutSuccess && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography variant="caption" color="text.secondary">
                  Confirmando la activación del plan…
                </Typography>
              </Box>
            )}
            {!zeroCheckoutProcessing && zeroCheckoutSuccess && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 40 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Plan activado. Te redirigiremos en un momento.
                </Typography>
              </Box>
            )}
            {!zeroCheckoutProcessing && zeroCheckoutError && !zeroCheckoutSuccess && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="error">{zeroCheckoutError}</Alert>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button variant="contained" onClick={handleRetryZeroCheckout}>
                    Reintentar activación
                  </Button>
                  <Button variant="text" onClick={handleCloseZeroCheckout}>
                    Cerrar
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default CheckoutPage;
