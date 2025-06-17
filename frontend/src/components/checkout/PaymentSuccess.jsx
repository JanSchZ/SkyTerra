import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>¡Pago Exitoso!</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Gracias por tu compra. Hemos procesado tu pago correctamente.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/dashboard')}>
                        Ir al Dashboard
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
};

export default PaymentSuccess; 