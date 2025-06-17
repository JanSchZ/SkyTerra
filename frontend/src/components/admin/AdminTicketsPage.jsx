import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Chip, Avatar, Dialog, DialogTitle, DialogContent, TextField, Button, List, ListItem, ListItemText } from '@mui/material';
import { styled } from '@mui/material/styles';
import { mockTickets } from './tickets/mockTickets';

const priorityColors = {
    high: 'error',
    medium: 'warning',
    low: 'info',
};

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiPaper-root': {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        width: '600px',
    }
}));

const AdminTicketsPage = () => {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [open, setOpen] = useState(false);

    const handleOpen = (ticket) => {
        setSelectedTicket(ticket);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedTicket(null);
    };

    const ticketsByStatus = {
        new: mockTickets.filter(t => t.status === 'new'),
        'in-progress': mockTickets.filter(t => t.status === 'in-progress'),
        resolved: mockTickets.filter(t => t.status === 'resolved'),
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                Gestión de Tickets de Soporte
            </Typography>

            <Grid container spacing={3}>
                {Object.entries(ticketsByStatus).map(([status, tickets]) => (
                    <Grid item xs={12} md={4} key={status}>
                        <Typography variant="h6" sx={{ textTransform: 'capitalize', mb: 2 }}>{status.replace('-', ' ')}</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {tickets.map(ticket => (
                                <Paper 
                                  key={ticket.id} 
                                  onClick={() => handleOpen(ticket)}
                                  elevation={0} 
                                  sx={{
                                    p: 2, 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        transform: 'scale(1.02)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    }
                                  }}>
                                    <Typography variant="body1" sx={{mb: 2}}>{ticket.title}</Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1}}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }}>{ticket.user.name.charAt(0)}</Avatar>
                                            <Typography variant="body2">{ticket.user.name}</Typography>
                                        </Box>
                                        <Chip label={ticket.priority} color={priorityColors[ticket.priority]} size="small" sx={{ textTransform: 'capitalize' }} />
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    </Grid>
                ))}
            </Grid>
            {selectedTicket && (
                <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                    <DialogTitle>{selectedTicket.title}</DialogTitle>
                    <DialogContent>
                        <List sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                            {selectedTicket.messages.map(msg => (
                                <ListItem key={msg.id} sx={{ textAlign: msg.author === 'user' ? 'left' : 'right' }}>
                                    <ListItemText primary={msg.text} secondary={msg.author} />
                                </ListItem>
                            ))}
                        </List>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Escribe tu respuesta..."
                            variant="outlined"
                        />
                        <Button variant="contained" sx={{ mt: 2 }}>Enviar Respuesta</Button>
                    </DialogContent>
                </Dialog>
            )}
        </Box>
    );
};

export default AdminTicketsPage; 