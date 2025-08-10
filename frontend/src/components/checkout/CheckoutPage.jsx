import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, TextField, Button, Grid, IconButton, Divider, CircularProgress, Alert } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { api } from '../../services/api';
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
    setPaymentLoading(true);
    setError('');

    try {
      // Asegurar CSRF antes de enviar POST autenticados
      try {
        const { authService } = await import('../../services/api');
        if (authService?.ensureCsrfCookie) await authService.ensureCsrfCookie();
      } catch (_) {}

      const payload = {};
      if (plan && plan.priceId) payload.priceId = plan.priceId;
      const response = await api.post('/payments/create-checkout-session/', payload);

      const session = response.data;
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: session.id });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleBitcoinPayment = async () => {
    setPaymentLoading(true);
    setError('');
    try {
      // Asegurar CSRF antes de enviar POST autenticados
      try {
        const { authService } = await import('../../services/api');
        if (authService?.ensureCsrfCookie) await authService.ensureCsrfCookie();
      } catch (_) {}

      // Coinbase Commerce para Bitcoin (empresa establecida con compliance)
      const usdAmount = 10; // TODO: mapear plan.price -> USD real si corresponde
      const payload = { amount: usdAmount, currency: 'USD', planTitle: plan?.title };
      const response = await api.post('/payments/bitcoin/create-charge/', payload);
      const { hostedUrl } = response.data;
      window.location.href = hostedUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar pago con Bitcoin.');
    } finally {
      setPaymentLoading(false);
    }
  };
  
  if (!plan) {
    return (
      <Container>
        <Typography>No plan selected. Please go back and select a plan.</Typography>
        <Button onClick={() => navigate('/pricing')}>Go to Pricing</Button>
      </Container>
    );
  }
  
  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 2 }}>
            <IconButton onClick={() => navigate(-1)} aria-label="Volver">
                <ArrowBackIosNewIcon />
            </IconButton>
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