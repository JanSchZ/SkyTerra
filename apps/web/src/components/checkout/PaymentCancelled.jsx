import React from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useNavigate } from 'react-router-dom';

const PaymentCancelled = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <CancelOutlinedIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>Pago Cancelado</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Tu pago ha sido cancelado. Puedes volver a la página de precios para intentarlo de nuevo.
                    </Typography>
                    <Button variant="contained" color="primary" onClick={() => navigate('/pricing')}>
                        Volver a los Planes
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
};

export default PaymentCancelled; 