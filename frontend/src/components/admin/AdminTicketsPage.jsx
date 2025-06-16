import React from 'react';
import { Box, Typography, Paper, Grid, Chip, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';

const GlassCard = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
}));

const ColumnContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(1),
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: '10px',
    height: '100%',
}));

const mockTickets = [
    { id: 1, title: 'No puedo subir fotos', user: 'Usuario 1', status: 'new', priority: 'high', date: '2023-10-28' },
    { id: 2, title: 'Error al iniciar sesión', user: 'Usuario 5', status: 'new', priority: 'high', date: '2023-10-28' },
    { id: 3, title: '¿Cómo creo un tour 360?', user: 'Usuario 12', status: 'in_progress', priority: 'medium', date: '2023-10-27' },
    { id: 4, title: 'Problema con la facturación', user: 'Usuario 3', status: 'in_progress', priority: 'low', date: '2023-10-26' },
    { id: 5, title: 'El mapa no carga', user: 'Usuario 8', status: 'resolved', priority: 'medium', date: '2023-10-25' },
    { id: 6, title: 'Sugerencia: Filtro por cercanía', user: 'Usuario 2', status: 'resolved', priority: 'low', date: '2023-10-24' },
];

const TicketCard = ({ ticket }) => {
    const priorityColors = {
        high: 'error',
        medium: 'warning',
        low: 'info'
    };
    return (
        <GlassCard elevation={0}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>{ticket.title}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1 }} />
                    <Typography variant="body2">{ticket.user}</Typography>
                </Box>
                <Chip label={ticket.priority} color={priorityColors[ticket.priority]} size="small"/>
            </Box>
        </GlassCard>
    )
}


const AdminTicketsPage = () => {
    const columns = {
        new: mockTickets.filter(t => t.status === 'new'),
        in_progress: mockTickets.filter(t => t.status === 'in_progress'),
        resolved: mockTickets.filter(t => t.status === 'resolved'),
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
                Gestión de Tickets de Soporte
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <ColumnContainer>
                        <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>Nuevos</Typography>
                        {columns.new.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
                    </ColumnContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                    <ColumnContainer>
                        <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>En Progreso</Typography>
                        {columns.in_progress.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
                    </ColumnContainer>
                </Grid>
                <Grid item xs={12} md={4}>
                    <ColumnContainer>
                        <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>Resueltos</Typography>
                        {columns.resolved.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
                    </ColumnContainer>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AdminTicketsPage; 