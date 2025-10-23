import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Container } from '@mui/material';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useNavigate } from 'react-router-dom';

const PENDING_PLAN_STORAGE_KEY = 'skyterra.pendingPlan';

const PaymentCancelled = () => {
    const navigate = useNavigate();
    const [pendingListingId, setPendingListingId] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem(PENDING_PLAN_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPendingListingId(parsed?.listingId ?? null);
            } catch (error) {
                console.warn('No se pudo leer la compra pendiente cancelada.', error);
            }
        }
        localStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
    }, []);

    return (
        <Box sx={{ backgroundColor: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <CancelOutlinedIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h4" gutterBottom>Pago Cancelado</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Tu pago ha sido cancelado. Puedes volver a la página de precios para intentarlo de nuevo.
                    </Typography>
                    <Button variant="contained" color="primary" onClick={() => navigate('/pricing', { state: { listingId: pendingListingId } })}>
                        Volver a los Planes
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
};

export default PaymentCancelled; 
