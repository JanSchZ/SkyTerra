import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Divider,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeIcon from '@mui/icons-material/Home';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TerrainIcon from '@mui/icons-material/Terrain';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GavelIcon from '@mui/icons-material/Gavel';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import { propertyService, tourService, imageService } from '../../services/api';
import TourViewer from '../tours/TourViewer';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [property, setProperty] = useState(null);
  const [tours, setTours] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTour, setSelectedTour] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);

  // Cargar datos de la propiedad
  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        
        // Cargar propiedad
        const propertyData = await propertyService.getProperty(id);
        setProperty(propertyData);
        
        // Cargar tours (simulados)
        const toursData = {
          results: [
            {
              id: 1,
              title: "Vista principal 360°",
              thumbnail: "https://via.placeholder.com/300x200?text=Tour+360",
              url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/cerro-toco-0.jpg",
              property_id: id
            },
            {
              id: 2,
              title: "Recorrido del terreno",
              thumbnail: "https://via.placeholder.com/300x200?text=Tour+2",
              url: "https://cdn.pannellum.org/2.5/pannellum.htm#panorama=https://pannellum.org/images/alma.jpg",
              property_id: id
            }
          ]
        };
        setTours(toursData.results);
        
        // Cargar imágenes (simuladas)
        const imagesData = {
          results: [
            {
              id: 1,
              title: "Vista aérea",
              type: "aerial",
              url: "https://via.placeholder.com/800x600?text=Vista+Aerea",
              property_id: id
            },
            {
              id: 2,
              title: "Mapa topográfico",
              type: "topography",
              url: "https://via.placeholder.com/800x600?text=Mapa+Topografico",
              property_id: id
            },
            {
              id: 3,
              title: "Estudio legal",
              type: "legal",
              url: "https://via.placeholder.com/800x600?text=Documentos+Legales",
              property_id: id
            }
          ]
        };
        setImages(imagesData.results);
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar los datos de la propiedad:', err);
        setError('No se pudo cargar la información de la propiedad. Intente nuevamente más tarde.');
        setLoading(false);
      }
    };
    
    fetchPropertyData();
  }, [id]);

  // Manejar cambio de tab
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Mostrar tour en pantalla completa
  const handleOpenTour = (tour) => {
    setSelectedTour(tour);
    setFullScreen(true);
  };

  // Cerrar tour en pantalla completa
  const handleCloseTour = () => {
    setFullScreen(false);
    setSelectedTour(null);
  };

  // Formateador para precio
  const formatPrice = (price) => {
    return `$${price?.toLocaleString()}`;
  };

  // Botón regresar
  const handleGoBack = () => {
    navigate('/');
  };

  // Renderizar contenido del tab activo
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Información general
        return (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card elevation={2}>
                  <CardMedia
                    component="img"
                    height="300"
                    image="https://via.placeholder.com/600x300?text=Vista+Principal"
                    alt={property?.name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/600x300?text=Imagen+No+Disponible';
                    }}
                  />
                  <CardContent>
                    <Typography variant="h5" component="div">
                      {property?.name}
                    </Typography>
                    <Typography sx={{ mb: 1.5 }} color="text.secondary">
                      {formatPrice(property?.price)} • {property?.size?.toFixed(1)} hectáreas
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      {property?.description || 'Sin descripción disponible.'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Características principales
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOnIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Ubicación" 
                        secondary="Coordenadas" 
                      />
                      <Typography variant="body2">
                        {property?.latitude ? `${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}` : 'No disponible'}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    
                    <ListItem>
                      <ListItemIcon>
                        <SquareFootIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Superficie" 
                        secondary="Hectáreas" 
                      />
                      <Typography variant="body2">
                        {property?.size ? `${property.size.toFixed(1)} ha` : 'No disponible'}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoneyIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Precio" 
                        secondary="Total" 
                      />
                      <Typography variant="body2">
                        {property?.price ? formatPrice(property.price) : 'No disponible'}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    
                    <ListItem>
                      <ListItemIcon>
                        <WaterDropIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Acceso a agua" 
                      />
                      <Typography variant="body2">
                        {property?.hasWater ? 'Sí' : 'No'}
                      </Typography>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    
                    <ListItem>
                      <ListItemIcon>
                        <VisibilityIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Vistas panorámicas" 
                      />
                      <Typography variant="body2">
                        {property?.hasViews ? 'Sí' : 'No'}
                      </Typography>
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 1: // Tours 360°
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Tours Virtuales 360°
            </Typography>
            
            {tours.length === 0 ? (
              <Typography variant="body1">
                No hay tours disponibles para esta propiedad.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {tours.map(tour => (
                  <Grid item xs={12} sm={6} md={4} key={tour.id}>
                    <Card 
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleOpenTour(tour)}
                    >
                      <CardMedia
                        component="img"
                        height="160"
                        image={tour.thumbnail}
                        alt={tour.title}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300x160?text=Tour+No+Disponible';
                        }}
                      />
                      <CardContent>
                        <Typography variant="subtitle1">
                          {tour.title}
                        </Typography>
                        <Button 
                          variant="outlined" 
                          color="primary"
                          size="small"
                          sx={{ mt: 1 }}
                          fullWidth
                        >
                          Ver tour 360°
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
        
      case 2: // Vista aérea
        const aerialImage = images.find(img => img.type === 'aerial');
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vista Aérea
            </Typography>
            
            {!aerialImage ? (
              <Typography variant="body1">
                No hay imágenes aéreas disponibles para esta propiedad.
              </Typography>
            ) : (
              <Card>
                <CardMedia
                  component="img"
                  height="500"
                  image={aerialImage.url}
                  alt="Vista aérea"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x500?text=Imagen+No+Disponible';
                  }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {aerialImage.title}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        );
        
      case 3: // Topografía
        const topoImage = images.find(img => img.type === 'topography');
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mapa Topográfico
            </Typography>
            
            {!topoImage ? (
              <Typography variant="body1">
                No hay mapas topográficos disponibles para esta propiedad.
              </Typography>
            ) : (
              <Card>
                <CardMedia
                  component="img"
                  height="500"
                  image={topoImage.url}
                  alt="Mapa topográfico"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x500?text=Imagen+No+Disponible';
                  }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {topoImage.title}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        );
        
      case 4: // Información legal
        const legalImage = images.find(img => img.type === 'legal');
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Información Legal
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Resumen Legal
              </Typography>
              <Typography variant="body2" paragraph>
                La propiedad cuenta con todos sus documentos legales en regla. Se ha verificado que no tiene gravámenes ni hipotecas vigentes.
              </Typography>
              
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Documento</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Escritura</TableCell>
                      <TableCell>Verificado</TableCell>
                      <TableCell>15/03/2022</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Certificado de dominio</TableCell>
                      <TableCell>Vigente</TableCell>
                      <TableCell>10/05/2022</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Contribuciones</TableCell>
                      <TableCell>Al día</TableCell>
                      <TableCell>01/06/2022</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            
            {legalImage && (
              <Card>
                <CardMedia
                  component="img"
                  height="300"
                  image={legalImage.url}
                  alt="Documentos legales"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/800x300?text=Imagen+No+Disponible';
                  }}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {legalImage.title}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        );
        
      default:
        return null;
    }
  };

  if (fullScreen && selectedTour) {
    return (
      <TourViewer 
        tourUrl={selectedTour.url} 
        title={selectedTour.title}
        onClose={handleCloseTour} 
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 3, backgroundColor: '#ffebee', borderRadius: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <>
          {/* Encabezado */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton 
              onClick={handleGoBack} 
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              {property?.name || 'Detalle de propiedad'}
            </Typography>
          </Box>
          
          {/* Tabs de navegación */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              textColor="primary"
              indicatorColor="primary"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
              }}
            >
              <Tab icon={<HomeIcon />} iconPosition="start" label="General" />
              <Tab icon={<Box component="span" sx={{ height: 24, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>360°</Box>} iconPosition="start" label="Tours" />
              <Tab icon={<AirplanemodeActiveIcon />} iconPosition="start" label="Vista Aérea" />
              <Tab icon={<TerrainIcon />} iconPosition="start" label="Topografía" />
              <Tab icon={<GavelIcon />} iconPosition="start" label="Legal" />
            </Tabs>
          </Paper>
          
          {/* Contenido de la tab activa */}
          {renderTabContent()}
          
          {/* Botón de contacto */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              sx={{ px: 4, py: 1.5, borderRadius: 2, fontSize: '1rem' }}
            >
              Contactar agente
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PropertyDetails; 