import React from 'react';
import { Box, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { glassCard } from '../adminV2Theme';

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
        <Box sx={{ ...glassCard({ height: '100%' }), color: '#f8fbff', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Cola de Producción y Marketing</Typography>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Producciones Pendientes</Typography>
                    <List dense>
                        {Object.entries(productionData).map(([plan, properties]) => (
                            <React.Fragment key={plan}>
                                <ListItem>
                                    <ListItemText primary={<Typography sx={{ fontWeight: 600 }}>{plan}</Typography>} />
                                </ListItem>
                                {properties.map(prop => (
                                    <ListItem key={prop} sx={{ pl: 4 }}>
                                        <ListItemText primary={prop} primaryTypographyProps={{ color: 'rgba(248,251,255,0.82)' }} />
                                    </ListItem>
                                ))}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>Compromisos de Marketing</Typography>
                    <List dense>
                        {marketingData.map((item, index) => (
                             <ListItem key={index}>
                                <ListItemText
                                  primary={item.task}
                                  secondary={item.property}
                                  primaryTypographyProps={{ color: '#f8fbff', fontWeight: 500 }}
                                  secondaryTypographyProps={{ color: 'rgba(248,251,255,0.6)' }}
                                />
                             </ListItem>
                        ))}
                    </List>
                </Box>
        </Box>
    );
};

export default ProductionQueue; 
