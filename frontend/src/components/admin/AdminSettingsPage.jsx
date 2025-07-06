import React from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import { styled } from '@mui/material/styles';

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
}));

const AdminSettingsPage = () => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#192a56' }}>
                Ajustes de la Plataforma
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <GlassPaper>
                        <Typography variant="h6" gutterBottom>General</Typography>
                        <TextField
                            fullWidth
                            label="Nombre de la Plataforma"
                            defaultValue="SkyTerra"
                            variant="outlined"
                            sx={{ mb: 2 }}
                            InputLabelProps={{
                                sx: { color: 'text.secondary' }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Email de Contacto Principal"
                            defaultValue="contacto@skyterra.dev"
                            variant="outlined"
                            InputLabelProps={{
                                sx: { color: 'text.secondary' }
                            }}
                        />
                    </GlassPaper>

                    <GlassPaper>
                        <Typography variant="h6" gutterBottom>Planes y Suscripciones</Typography>
                        <FormControlLabel
                            control={<Switch defaultChecked />}
                            label="Permitir registro de nuevos Vendedores Profesionales"
                        />
                        <FormControlLabel
                            control={<Switch defaultChecked />}
                            label="Permitir registro de nuevos Dueños Particulares"
                        />
                    </GlassPaper>

                </Grid>

                <Grid item xs={12} md={6}>
                    <GlassPaper>
                        <Typography variant="h6" gutterBottom>Notificaciones</Typography>
                         <FormControlLabel
                            control={<Switch defaultChecked />}
                            label="Notificar por email sobre nuevos registros"
                        />
                         <FormControlLabel
                            control={<Switch />}
                            label="Enviar resumen diario de actividad"
                        />
                         <FormControlLabel
                            control={<Switch defaultChecked />}
                            label="Notificar sobre nuevos tickets de soporte"
                        />
                    </GlassPaper>
                </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" size="large">
                    Guardar Cambios
                </Button>
            </Box>
        </Box>
    );
};

export default AdminSettingsPage;