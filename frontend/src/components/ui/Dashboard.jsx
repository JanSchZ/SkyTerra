import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Alert,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fab,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StraightenIcon from '@mui/icons-material/Straighten';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import TerrainIcon from '@mui/icons-material/Terrain';
import { propertyService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, property: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await propertyService.getUserProperties();
        setProperties(Array.isArray(data) ? data : (data?.results || []));
      } catch (err) {
        console.error('Error al cargar propiedades:', err);
        setError('No se pudieron cargar tus propiedades. Intenta recargar la página.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user, navigate]);

  const handleDeleteClick = (property) => {
    setDeleteDialog({ open: true, property });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.property) return;
    
    setDeleting(true);
    try {
      await propertyService.deleteProperty(deleteDialog.property.id);
      setProperties(prev => prev.filter(p => p.id !== deleteDialog.property.id));
      setDeleteDialog({ open: false, property: null });
    } catch (err) {
      console.error('Error al eliminar propiedad:', err);
      setError('No se pudo eliminar la propiedad.');
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price) => {
    if (price >= 1000000000) {
      return `$${(price / 1000000000).toFixed(1)}B`;
    } else if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price?.toLocaleString()}`;
  };

  if (!user && !loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d1117'}}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0d1117',
        color: '#c9d1d9'
      }}>
        <CircularProgress color="primary" size={50} sx={{mb: 2}} />
        <Typography variant="h6" sx={{ fontWeight: 300 }}>
          Cargando tu panel...
        </Typography>
      </Box>
    );
  }
  
  if (error && !loading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        p: 3
      }}>
        <Alert severity="error" sx={{mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373'}}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{color: '#58a6ff', borderColor: '#58a6ff'}}>
          Reintentar Carga
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0d1117',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate('/')}
              sx={{ 
                mr: 2, 
                color: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 300 }}>
                Mi Panel
              </Typography>
              <Typography variant="body1" sx={{ color: '#8b949e' }}>
                Bienvenido, {user.username || user.email}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-property')}
            sx={{ borderRadius: 2, px: 3, py: 1, backdropFilter:'blur(8px)', textTransform:'none' }}
          >
            Nueva Propiedad
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card variant="glass" sx={{ p:2 }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: 'primary.light', fontWeight: 600 }}>
                  {properties.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Propiedades Publicadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                  {properties.reduce((acc, p) => acc + (p.size || 0), 0).toFixed(1)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b949e' }}>
                  Hectáreas Totales
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  {formatPrice(properties.reduce((acc, p) => acc + (p.price || 0), 0))}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b949e' }}>
                  Valor Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#8b5cf6', fontWeight: 'bold' }}>
                  {properties.filter(p => p.hasWater || p.has_water).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b949e' }}>
                  Con Acceso a Agua
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Properties Section */}
        <Paper sx={{ 
          p: 4, 
          backgroundColor: 'rgba(22, 27, 34, 0.95)',
          border: '1px solid rgba(30, 41, 59, 0.3)',
          borderRadius: 3
        }}>
          <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 3 }}>
            Mis Propiedades
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#3b82f6' }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && properties.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HomeIcon sx={{ fontSize: 64, color: '#30363d', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#8b949e', mb: 2 }}>
                Aún no has publicado propiedades
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                Comienza creando tu primera propiedad y muéstrala al mundo
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-property')}
                sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}
              >
                Crear Mi Primera Propiedad
              </Button>
            </Box>
          )}

          {!loading && !error && properties.length > 0 && (
            <Grid container spacing={3}>
              {properties.map((property) => (
                <Grid xs={12} sm={6} md={4} lg={3} key={property.id}>
                  <Card sx={{
                    height: '100%',
                    backgroundColor: 'rgba(13, 17, 23, 0.8)',
                    border: '1px solid rgba(30, 41, 59, 0.3)',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0].url}
                        alt={property.name}
                        style={{
                          width: '100%',
                          height: 180,
                          objectFit: 'cover',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: 180,
                          backgroundColor: '#30363d', // Dark placeholder
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }}
                      >
                        <HomeIcon sx={{ fontSize: 60, color: '#8b949e' }} />
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600, color: 'white', mb: 0.5 }}>
                        {property.name}
                      </Typography>

                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#8b949e', mb: 1 }}>
                          <AttachMoneyIcon sx={{ fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#adbac7' }}>
                              {property.price ? formatPrice(Number(property.price)) : 'N/A'}
                          </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#8b949e', mb: 1 }}>
                          <StraightenIcon sx={{ fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ color: '#adbac7' }}>
                             {property.size ? `${Number(property.size).toLocaleString('es-CL')} ha` : 'N/A'}
                          </Typography>
                      </Stack>
                      
                      <Stack direction="row" spacing={1} sx={{mt: 1.5, flexWrap: 'wrap', gap: 0.5}}>
                          {property.type && (
                              <Chip 
                                  label={property.type === 'plot' ? 'Parcela' : property.type === 'farm' ? 'Campo' : property.type} 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{borderColor: '#30363d', color: '#8b949e'}} 
                              />
                          )}
                          {property.has_water && <Chip icon={<WaterDropIcon fontSize="small" />} label="Agua" size="small" variant="filled" sx={{backgroundColor: 'rgba(56,139,253,0.2)', color: '#79c0ff'}} />}
                          {property.has_views && <Chip icon={<TerrainIcon fontSize="small" />} label="Vistas" size="small" variant="filled" sx={{backgroundColor: 'rgba(35,134,54,0.2)', color: '#56d364'}}/>}
                           {property.publication_status && (
                            <Chip 
                              label={property.publication_status === 'pending' ? 'Pendiente' : property.publication_status === 'approved' ? 'Aprobado' : 'Rechazado'}
                              size="small"
                              variant="filled"
                              sx={{
                                  backgroundColor: property.publication_status === 'pending' ? 'rgba(212,162,0,0.2)' : property.publication_status === 'approved' ? 'rgba(35,134,54,0.2)' : 'rgba(248,81,73,0.2)',
                                  color: property.publication_status === 'pending' ? '#d4a200' : property.publication_status === 'approved' ? '#56d364' : '#f85149',
                                  fontWeight: 500
                              }}
                            />
                          )}
                      </Stack>

                    </CardContent>
                    <Divider sx={{borderColor: '#30363d'}} />
                    <CardActions sx={{ justifyContent: 'flex-end', backgroundColor: 'rgba(22, 27, 34, 0.7)', p:1 }}>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/property/${property.id}`)}
                        sx={{ color: '#58a6ff', '&:hover': {backgroundColor: 'rgba(88,166,255,0.1)'} }}
                        title="Ver Detalles"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/property/edit/${property.id}`)}
                        sx={{ color: '#a5d6ff', '&:hover': {backgroundColor: 'rgba(165,214,255,0.1)'} }}
                         title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(property)}
                        sx={{ color: '#f85149', '&:hover': {backgroundColor: 'rgba(248,81,73,0.1)'} }}
                        title="Eliminar"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, property: null })}
          PaperProps={{
            sx: {
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
            }
          }}
        >
          <DialogTitle sx={{ color: '#c9d1d9' }}>
            Confirmar Eliminación
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: '#8b949e' }}>
              ¿Estás seguro de que quieres eliminar la propiedad "{deleteDialog.property?.name}"? 
              Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, property: null })}
              sx={{ color: '#8b949e' }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              disabled={deleting}
              sx={{ color: '#ef4444' }}
            >
              {deleting ? <CircularProgress size={20} /> : 'Eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Dashboard; 