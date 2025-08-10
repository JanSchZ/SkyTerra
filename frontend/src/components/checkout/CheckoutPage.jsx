import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, TextField, Button, Grid, IconButton, Divider, CircularProgress, Alert } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { api, authService } from '../../services/api';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to put your publishable key here
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Verificar autenticación al cargar la página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthChecking(true);
        setError(''); // Limpiar errores previos
        
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          console.log('✅ [Checkout] Usuario autenticado:', currentUser.email);
        } else {
          console.log('❌ [Checkout] No hay usuario autenticado');
          setError('Debes iniciar sesión para realizar pagos.');
          // No redirigir inmediatamente, dejar que el usuario vea el error
        }
      } catch (err) {
        console.error('❌ [Checkout] Error checking authentication:', err);
        setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
        // No redirigir inmediatamente, dejar que el usuario vea el error
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

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

    setPaymentLoading(true);
    setError('');

    try {
      // Asegurar CSRF antes de enviar POST autenticados
      await authService.ensureCsrfCookie();

      const payload = {};
      if (plan && plan.priceId) payload.priceId = plan.priceId;
      
      console.log('🔐 [Payment] Usuario autenticado:', user.email);
      console.log('🔐 [Payment] Enviando petición a Stripe...');
      
      const response = await api.post('/payments/create-checkout-session/', payload);

      const session = response.data;
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: session.id });

      if (error) {
        setError(error.message);
      }
         } catch (err) {
       console.error('❌ [Payment Error]', err);
       if (err.response?.status === 401) {
         setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
         // No redirigir automáticamente, dejar que el usuario vea el error
       } else {
         setError(err.response?.data?.error || 'Error al procesar el pago.');
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
      // Asegurar CSRF antes de enviar POST autenticados
      await authService.ensureCsrfCookie();

      // Coinbase Commerce para Bitcoin (empresa establecida con compliance)
      const usdAmount = 10; // TODO: mapear plan.price -> USD real si corresponde
      const payload = { amount: usdAmount, currency: 'USD', planTitle: plan?.title };
      
      console.log('🔐 [Bitcoin Payment] Usuario autenticado:', user.email);
      console.log('🔐 [Bitcoin Payment] Enviando petición a Coinbase...');
      
      const response = await api.post('/payments/bitcoin/create-charge/', payload);
      const { hostedUrl } = response.data;
      window.location.href = hostedUrl;
         } catch (err) {
       console.error('❌ [Bitcoin Payment Error]', err);
       if (err.response?.status === 401) {
         setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
         // No redirigir automáticamente, dejar que el usuario vea el error
       } else {
         setError(err.response?.data?.error || 'Error al procesar pago con Bitcoin.');
       }
     } finally {
      setPaymentLoading(false);
    }
  };
  
  // Mostrar loading mientras se verifica la autenticación
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

  // Mostrar error de autenticación con opción de reintentar
  if (error && !user) {
    return (
      <Container>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" gutterBottom color="error">
            Error de Autenticación
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={() => {
                setError('');
                setAuthChecking(true);
                // Reintentar verificación de autenticación
                authService.getCurrentUser().then(currentUser => {
                  if (currentUser) {
                    setUser(currentUser);
                  }
                  setAuthChecking(false);
                }).catch(err => {
                  console.error('❌ [Checkout] Reintento fallido:', err);
                  setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
                  setAuthChecking(false);
                });
              }}
              sx={{ borderRadius: 2, fontWeight: 'bold' }}
            >
              Reintentar
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/login')}
              sx={{ borderRadius: 2, fontWeight: 'bold' }}
            >
              Ir al Login
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  // Mostrar error si no hay plan o usuario
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
              : 'Debes iniciar sesión para continuar con el proceso de pago.'
            }
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={() => navigate('/pricing')}
              sx={{ borderRadius: 2, fontWeight: 'bold' }}
            >
              {!plan ? 'Ir a Precios' : 'Seleccionar Plan'}
            </Button>
            {!user && (
              <Button 
                variant="outlined" 
                onClick={() => navigate('/login')}
                sx={{ borderRadius: 2, fontWeight: 'bold' }}
              >
                Iniciar Sesión
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    );
  }
  
  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} aria-label="Volver">
                <ArrowBackIosNewIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Volver
            </Typography>
        </Box>
        <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
          Finalizar Compra
        </Typography>
        <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h5" gutterBottom sx={{fontWeight: 'bold'}}>Resumen del Plan</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{plan.title}</Typography>
                        <Typography variant="h6" sx={{fontWeight: 'bold'}}>{plan.price}</Typography>
                    </Box>
                    <Typography color="text.secondary">{plan.price_period} + IVA (calculado en el checkout)</Typography>
                    
                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" sx={{fontWeight: 'bold'}}>Total a Pagar</Typography>
                    <Typography variant="h4" sx={{fontWeight: 'bold'}}>{plan.price}</Typography>
                    <Typography color="text.secondary">El desglose final con impuestos y descuentos se mostrará en la página de pago.</Typography>

                    <Box component="form" noValidate sx={{ mt: 3 }}>
                        <Typography variant="body1" sx={{mb: 1}}>¿Tienes un cupón de descuento?</Typography>
                         <Typography variant="body2" color="text.secondary">Podrás ingresarlo directamente en la página de pago de Stripe.</Typography>
                    </Box>
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h5" sx={{fontWeight: 'bold'}} gutterBottom>Información de Pago</Typography>
                    <Typography>
                        Serás redirigido a Stripe para completar tu suscripción de forma segura.
                        Allí podrás usar Tarjeta, Apple Pay o Webpay.
                    </Typography>
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{ mt: 3, borderRadius: 2, fontWeight: 'bold' }}
                        onClick={handlePayment}
                        disabled={paymentLoading}
                    >
                        {paymentLoading ? <CircularProgress size={24} color="inherit" /> : `Ir a Pagar`}
                    </Button>
                    <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        size="large"
                        sx={{ mt: 2, borderRadius: 2, fontWeight: 'bold' }}
                        onClick={handleBitcoinPayment}
                        disabled={paymentLoading}
                    >
                        {paymentLoading ? <CircularProgress size={24} color="inherit" /> : `Pagar con Bitcoin`}
                    </Button>
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                </Paper>
            </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CheckoutPage; 