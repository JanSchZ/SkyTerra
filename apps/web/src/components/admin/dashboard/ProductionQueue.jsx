import React from 'react';
import { Card, CardContent, Typography, Box, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

const GlassCard = styled(Card)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    height: '100%',
}));

const productionData = {
    'Plan Pro': ['Fundo El Carmen', 'Hacienda Las Mercedes'],
    'Plan Advanced': ['Parcela Los Pellines', 'Loteo El Roble'],
    'Plan Standard': ['Sitio Vista Hermosa'],
};

const marketingData = [
    { task: 'Newsletter de Junio', property: 'Fundo El Carmen' },
    { task: 'Campaña RRSS', property: 'Hacienda Las Mercedes' },
];

const ProductionQueue = () => {
    return (
        <GlassCard>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{color: 'text.primary', fontWeight:'bold'}}>Cola de Producción y Marketing</Typography>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }} gutterBottom>Producciones Pendientes</Typography>
                    <List dense>
                        {Object.entries(productionData).map(([plan, properties]) => (
                            <React.Fragment key={plan}>
                                <ListItem>
                                    <ListItemText primary={<Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>{plan}</Typography>} />
                                </ListItem>
                                {properties.map(prop => (
                                    <ListItem key={prop} sx={{ pl: 4 }}>
                                        <ListItemText primary={prop} primaryTypographyProps={{color:'text.primary'}} />
                                    </ListItem>
                                ))}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }} gutterBottom>Compromisos de Marketing</Typography>
                    <List dense>
                        {marketingData.map((item, index) => (
                             <ListItem key={index}>
                                <ListItemText primary={item.task} secondary={item.property} primaryTypographyProps={{color:'text.primary'}} secondaryTypographyProps={{color:'text.secondary'}} />
                             </ListItem>
                        ))}
                    </List>
                </Box>
            </CardContent>
        </GlassCard>
    );
};

export default ProductionQueue; 