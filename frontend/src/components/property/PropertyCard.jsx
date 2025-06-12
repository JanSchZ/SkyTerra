import React from 'react';
import { Card, CardMedia, CardContent, CardActions, Typography, Button, IconButton, Box, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import { useNavigate } from 'react-router-dom';

const PropertyCard = ({ property }) => {
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/property/edit/${property.id}`); // Asumiendo que tendrás una ruta para editar
  };

  const handleViewDetails = () => {
    navigate(`/property/${property.id}`);
  };

  // Intenta obtener la primera imagen de la propiedad o una imagen por defecto
  const imageUrl = property.images && property.images.length > 0 
    ? property.images[0].url 
    : 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'; // Placeholder

  const priceDisplay = property.listing_type === 'rent' || property.listing_type === 'both'
    ? (property.rent_price ? `${Number(property.rent_price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })} /mes` : 'Arriendo no disponible')
    : (property.price ? Number(property.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : 'Precio no disponible');

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, boxShadow: 3 }}>
      <CardMedia
        component="img"
        height="160"
        image={imageUrl}
        alt={property.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography gutterBottom variant="h6" component="div" noWrap sx={{ fontWeight: 'bold' }}>
          {property.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
          <AttachMoneyIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
            {priceDisplay}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          <SquareFootIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2">
            {property.size ? `${Number(property.size).toLocaleString('es-CL')} ha` : 'Tamaño no disponible'}
          </Typography>
        </Box>
        {property.latitude && property.longitude && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, color: 'text.secondary' }}>
            <LocationOnIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="caption">
              {`${Number(property.latitude).toFixed(4)}, ${Number(property.longitude).toFixed(4)}`}
            </Typography>
          </Box>
        )}
         <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap'}}>
            {property.type && <Chip label={property.type === 'farm' ? 'Parcela/Granja' : property.type.charAt(0).toUpperCase() + property.type.slice(1)} size="small" variant="outlined" />}
            {property.has_water && <Chip label="Agua" size="small" color="info" variant="outlined" />}
            {property.has_views && <Chip label="Vistas" size="small" color="success" variant="outlined" />}
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb:1, px:1 }}>
        <IconButton onClick={handleViewDetails} color="primary" title="Ver Detalles">
          <VisibilityIcon />
        </IconButton>
        <IconButton onClick={handleEdit} color="secondary" title="Editar Propiedad">
          <EditIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default PropertyCard; 