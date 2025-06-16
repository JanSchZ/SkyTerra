import React from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Menu, MenuItem, Chip, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const GlassPaper = styled(Paper)(({ theme }) => ({
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
    padding: theme.spacing(2),
}));

const propertiesData = [
    {
        id: 1,
        name: 'Fundo Los Aromos',
        location: 'Frutillar, Los Lagos',
        image: 'https://source.unsplash.com/random/400x400?landscape',
        productionStatus: 'Completo (Advanced)',
        statusColor: 'success',
        consultas: 15,
        visualizaciones: 1240,
    },
    {
        id: 2,
        name: 'Parcela El Mirador',
        location: 'Puerto Varas, Los Lagos',
        image: 'https://source.unsplash.com/random/400x401?landscape',
        productionStatus: 'En Producción (Advanced)',
        statusColor: 'warning',
        consultas: 8,
        visualizaciones: 980,
    },
    {
        id: 3,
        name: 'Loteo Vista al Volcán',
        location: 'Pucón, Araucanía',
        image: 'https://source.unsplash.com/random/400x402?landscape',
        productionStatus: 'Pendiente (Basic)',
        statusColor: 'error',
        consultas: 2,
        visualizaciones: 350,
    },
];

const PropertiesTable = () => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <GlassPaper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h3">
                    Mis Propiedades
                </Typography>
                <Button variant="contained" color="primary" sx={{backgroundColor: '#192a56'}}>+ Nueva Propiedad</Button>
            </Box>
            <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>PROPIEDAD</TableCell>
                            <TableCell>ESTADO DE PRODUCCIÓN</TableCell>
                            <TableCell align="right">CONSULTAS</TableCell>
                            <TableCell align="right">VISUALIZACIONES</TableCell>
                            <TableCell align="center">ACCIONES</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {propertiesData.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell component="th" scope="row">
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Avatar src={row.image} sx={{ mr: 2 }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{row.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">{row.location}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell><Chip label={row.productionStatus} color={row.statusColor} size="small" /></TableCell>
                                <TableCell align="right">{row.consultas}</TableCell>
                                <TableCell align="right">{row.visualizaciones}</TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        aria-label="more"
                                        aria-controls="long-menu"
                                        aria-haspopup="true"
                                        onClick={handleClick}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                    <Menu
                                        id="long-menu"
                                        anchorEl={anchorEl}
                                        open={open}
                                        onClose={handleClose}
                                    >
                                        <MenuItem onClick={handleClose}>Editar</MenuItem>
                                        <MenuItem onClick={handleClose}>Ver Estadísticas</MenuItem>
                                        <MenuItem onClick={handleClose}>Desactivar</MenuItem>
                                    </Menu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </GlassPaper>
    );
};

export default PropertiesTable; 