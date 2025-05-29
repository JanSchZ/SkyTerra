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
            startIcon={<AddIcon />}
            onClick={() => navigate('/property/create')}
            sx={{
              backgroundColor: '#3b82f6',
              '&:hover': { backgroundColor: '#2563eb' },
              borderRadius: 2,
              px: 3,
              py: 1
            }}
          >
            Nueva Propiedad
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: 'rgba(22, 27, 34, 0.95)',
              border: '1px solid rgba(30, 41, 59, 0.3)',
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
                  {properties.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8b949e' }}>
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
                onClick={() => navigate('/property/create')}
                sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}
              >
                Crear Mi Primera Propiedad
              </Button>
            </Box>
          )}

          {!loading && !error && properties.length > 0 && (
            <Grid container spacing={3}>
              {properties.map((property) => (
                <Grid xs={12} sm={6} lg={4} key={property.id}>
                  <Card sx={{ 
                    backgroundColor: 'rgba(13, 17, 23, 0.8)',
                    border: '1px solid rgba(30, 41, 59, 0.3)',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#c9d1d9', mb: 1 }}>
                        {property.name}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ color: '#8b949e', mb: 2, minHeight: 40 }}>
                        {property.description?.length > 100 
                          ? `${property.description.substring(0, 100)}...` 
                          : property.description || 'Sin descripción'}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip 
                          label={property.type || property.propertyType || 'Propiedad'} 
                          size="small" 
                          sx={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                        />
                        {(property.has_water || property.hasWater) && (
                          <Chip 
                            icon={<WaterDropIcon sx={{ fontSize: 14 }} />}
                            label="Agua" 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}
                          />
                        )}
                        {(property.has_views || property.hasViews) && (
                          <Chip 
                            icon={<TerrainIcon sx={{ fontSize: 14 }} />}
                            label="Vistas" 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}
                          />
                        )}
                      </Stack>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ color: '#3b82f6' }}>
                            {formatPrice(property.price)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#8b949e' }}>
                            Precio
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" sx={{ color: '#10b981' }}>
                            {property.size?.toFixed(1) || '0'} ha
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#8b949e' }}>
                            Tamaño
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/property/${property.id}`)}
                        sx={{ color: '#8b949e', '&:hover': { color: '#c9d1d9' } }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/property/edit/${property.id}`)}
                        sx={{ color: '#8b949e', '&:hover': { color: '#c9d1d9' } }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(property)}
                        sx={{ 
                          color: '#f87171', 
                          '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' } 
                        }}
                      >
                        Eliminar
                      </Button>
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