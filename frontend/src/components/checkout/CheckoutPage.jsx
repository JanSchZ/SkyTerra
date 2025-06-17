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
      const response = await api.post('/payments/create-checkout-session/', {
        plan: plan,
        coupon_code: coupon ? coupon.code : null,
      });

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
  
  const calculateDiscount = () => {
    if (!coupon || !plan) return { discountedPrice: plan.price, discountAmount: 0 };

    const originalPrice = parseFloat(plan.price.replace(/[^0-9.-]+/g, ""));
    let discountAmount = 0;
    
    if (coupon.discount_type === 'percentage') {
      discountAmount = (originalPrice * parseFloat(coupon.value)) / 100;
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = parseFloat(coupon.value);
    }
    
    const discountedPriceValue = originalPrice - discountAmount;
    
    // Format back to UF string, assuming UF is the currency
    const finalPrice = `UF ${discountedPriceValue.toFixed(2)}`;
    
    return { discountedPrice: finalPrice, discountAmount: `UF ${discountAmount.toFixed(2)}` };
  };

  if (!plan) {
    return (
      <Container>
        <Typography>No plan selected. Please go back and select a plan.</Typography>
        <Button onClick={() => navigate('/pricing')}>Go to Pricing</Button>
      </Container>
    );
  }
  
  const { discountedPrice, discountAmount } = calculateDiscount();

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
                    <Typography color="text.secondary">{plan.price_period} + IVA</Typography>
                    
                    {coupon && (
                        <Box sx={{ mt: 2, color: 'success.main' }}>
                            <Typography>Descuento aplicado: -{discountAmount}</Typography>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" sx={{fontWeight: 'bold'}}>Total a Pagar</Typography>
                    <Typography variant="h4" sx={{fontWeight: 'bold'}}>{discountedPrice}</Typography>

                    <Box component="form" noValidate sx={{ mt: 3 }}>
                        <Typography variant="body1" sx={{mb: 1}}>¿Tienes un cupón de descuento?</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                                fullWidth
                                id="coupon"
                                label="Código de Cupón"
                                name="coupon"
                                size="small"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                disabled={loading}
                            />
                            <Button variant="outlined" onClick={handleApplyCoupon} disabled={loading}>
                                {loading ? <CircularProgress size={24} /> : 'Aplicar'}
                            </Button>
                        </Box>
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                    </Box>
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="h5" sx={{fontWeight: 'bold'}} gutterBottom>Información de Pago</Typography>
                    <Typography>
                        Serás redirigido a Stripe para completar el pago de forma segura.
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
                        {paymentLoading ? <CircularProgress size={24} color="inherit" /> : `Pagar ${discountedPrice}`}
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