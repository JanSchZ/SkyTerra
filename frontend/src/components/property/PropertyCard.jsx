import React from 'react';
import { Card, CardMedia, CardContent, CardActions, Typography, Button, IconButton, Box, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { useNavigate } from 'react-router-dom';
import { favoritesService } from '../../services/api';

const PropertyCard = ({ property }) => {
  const navigate = useNavigate();
  const [isFav, setIsFav] = React.useState(false);

  React.useEffect(() => {
    const fetchFavStatus = async () => {
      if (!localStorage.getItem('auth_token')) return;
      try {
        const favs = await favoritesService.list();
        setIsFav(!!favs.find((f) => f.property === property.id));
      } catch (err) { console.error('Error fetching favorites', err); }
    };
    fetchFavStatus();
  }, [property.id]);

  const handleEdit = () => {
    navigate(`/property/edit/${property.id}`); // Asumiendo que tendrás una ruta para editar
  };

  const handleViewDetails = () => {
    // Avoid triggering auto-flight again on detail page
    localStorage.setItem('skipAutoFlight', 'true');
    navigate(`/property/${property.id}`);
  };

  const handleAddToCompare = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Token ${token}` } : {};
      // post to compare endpoint
      await fetch('/api/compare/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ property_ids: [property.id] }),
      });
      // navigate to compare view with query param appended
      navigate(`/compare?ids=${property.id}`);
    } catch (err) { console.error('Error adding to compare', err); }
  };

  const toggleFavorite = async () => {
    if (!localStorage.getItem('auth_token')) {
       navigate('/login');
       return;
    }
    try {
      if (isFav) {
        await favoritesService.removeByProperty(property.id);
        setIsFav(false);
      } else {
        await favoritesService.add(property.id);
        setIsFav(true);
      }
    } catch (err) { console.error('Fav error', err); }
  };

  // Intenta obtener la primera imagen de la propiedad o una imagen por defecto
  const imageUrl = property.images && property.images.length > 0 
    ? property.images[0].url 
    : 'https://via.placeholder.com/300x200.png?text=Sin+Imagen'; // Placeholder

  const priceDisplay = property.listing_type === 'rent' || property.listing_type === 'both'
    ? (property.rent_price ? `${Number(property.rent_price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })} /mes` : 'Arriendo no disponible')
    : (property.price ? Number(property.price).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' }) : 'Precio no disponible');

  const listingLabel = property.listing_type === 'rent' ? 'Arriendo' : (property.listing_type === 'both' ? 'Venta / Arriendo' : 'Venta');

  return (
    <Card variant="glass" sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2 }}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary', gap: 0.5 }}>
          <AttachMoneyIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
            {priceDisplay}
          </Typography>
          <Chip label={listingLabel} size="small" color={property.listing_type === 'rent' ? 'warning' : 'primary'} variant="outlined" />
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
            {property.has_tour && (
                <Chip icon={<ViewInArIcon />} label="Tour 360°" size="small" color="success" variant="outlined" />
            )}
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb:1, px:1 }} className="no-shine">
        <IconButton onClick={handleViewDetails} color="primary" title="Ver Detalles">
          <VisibilityIcon />
        </IconButton>
        <IconButton onClick={handleEdit} color="secondary" title="Editar Propiedad">
          <EditIcon />
        </IconButton>
        <IconButton onClick={toggleFavorite} color="warning" title={isFav ? 'Quitar de Favoritos' : 'Guardar'}>
          {isFav ? <BookmarkIcon /> : <BookmarkBorderIcon />}
        </IconButton>
        <IconButton onClick={handleAddToCompare} color="info" title="Comparar Propiedad">
          <CompareArrowsIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default PropertyCard; 