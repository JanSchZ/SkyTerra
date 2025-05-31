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
  Divider,
  useTheme, // Import useTheme
  alpha // Import alpha
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
  const theme = useTheme(); // Hook to get theme object
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
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.palette.background.default}}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
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
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
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
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        p: 3
      }}>
        <Alert severity="error" sx={{mb: 2, backgroundColor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.light}}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{color: theme.palette.primary.light, borderColor: theme.palette.primary.light}}>
          Reintentar Carga
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: theme.palette.background.default,
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
                color: theme.palette.common.white,
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.2) }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ color: theme.palette.common.white, fontWeight: 300 }}>
                Mi Panel
              </Typography>
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                Bienvenido, {user.username || user.email}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-property')}
            sx={{
              backgroundColor: theme.palette.primary.main,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
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
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: theme.palette.primary.light, fontWeight: 'bold' }}>
                  {properties.length}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Propiedades Publicadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: theme.palette.success.light, fontWeight: 'bold' }}>
                  {properties.reduce((acc, p) => acc + (p.size || 0), 0).toFixed(1)}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Hectáreas Totales
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: theme.palette.warning.light, fontWeight: 'bold' }}>
                  {formatPrice(properties.reduce((acc, p) => acc + (p.price || 0), 0))}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Valor Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2
            }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: theme.palette.info.light, fontWeight: 'bold' }}>
                  {properties.filter(p => p.hasWater || p.has_water).length}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Con Acceso a Agua
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Properties Section */}
        <Paper sx={{ 
          p: 4, 
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          borderRadius: 3
        }}>
          <Typography variant="h5" sx={{ color: theme.palette.text.primary, mb: 3 }}>
            Mis Propiedades
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}> {/* MuiAlert already styled by theme */}
              {error}
            </Alert>
          )}

          {!loading && !error && properties.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HomeIcon sx={{ fontSize: 64, color: theme.palette.divider, mb: 2 }} />
              <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                Aún no has publicado propiedades
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.disabled, mb: 3 }}>
                Comienza creando tu primera propiedad y muéstrala al mundo
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/create-property')}
                sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
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
                    backgroundColor: alpha(theme.palette.background.default, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.light, 0.4),
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
                          backgroundColor: theme.palette.divider,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderTopLeftRadius: '8px',
                          borderTopRightRadius: '8px'
                        }}
                      >
                        <HomeIcon sx={{ fontSize: 60, color: theme.palette.text.secondary }} />
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 0.5 }}>
                        {property.name}
                      </Typography>

                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                          <AttachMoneyIcon sx={{ fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                              {property.price ? formatPrice(Number(property.price)) : 'N/A'}
                          </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                          <StraightenIcon sx={{ fontSize: '1rem' }} />
                          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                             {property.size ? `${Number(property.size).toLocaleString('es-CL')} ha` : 'N/A'}
                          </Typography>
                      </Stack>
                      
                      <Stack direction="row" spacing={1} sx={{mt: 1.5, flexWrap: 'wrap', gap: 0.5}}>
                          {property.type && (
                              <Chip 
                                  label={property.type === 'plot' ? 'Parcela' : property.type === 'farm' ? 'Campo' : property.type} 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{borderColor: theme.palette.divider, color: theme.palette.text.secondary}}
                              />
                          )}
                          {property.has_water && <Chip icon={<WaterDropIcon fontSize="small" />} label="Agua" size="small" variant="filled" sx={{backgroundColor: alpha(theme.palette.info.main,0.2), color: theme.palette.info.light}} />}
                          {property.has_views && <Chip icon={<TerrainIcon fontSize="small" />} label="Vistas" size="small" variant="filled" sx={{backgroundColor: alpha(theme.palette.success.main,0.2), color: theme.palette.success.light}}/>}
                           {property.publication_status && (
                            <Chip 
                              label={property.publication_status === 'pending' ? 'Pendiente' : property.publication_status === 'approved' ? 'Aprobado' : 'Rechazado'}
                              size="small"
                              variant="filled"
                              sx={{
                                  backgroundColor: property.publication_status === 'pending' ? alpha(theme.palette.warning.main, 0.2) : property.publication_status === 'approved' ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.error.main, 0.2),
                                  color: property.publication_status === 'pending' ? theme.palette.warning.light : property.publication_status === 'approved' ? theme.palette.success.light : theme.palette.error.light,
                                  fontWeight: 500
                              }}
                            />
                          )}
                      </Stack>

                    </CardContent>
                    <Divider sx={{borderColor: theme.palette.divider}} />
                    <CardActions sx={{ justifyContent: 'flex-end', backgroundColor: alpha(theme.palette.background.paper, 0.7), p:1 }}>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/property/${property.id}`)}
                        sx={{ color: theme.palette.primary.light, '&:hover': {backgroundColor: alpha(theme.palette.primary.light,0.1)} }}
                        title="Ver Detalles"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/property/edit/${property.id}`)}
                        sx={{ color: theme.palette.info.light, '&:hover': {backgroundColor: alpha(theme.palette.info.light,0.1)} }}
                         title="Editar"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(property)}
                        sx={{ color: theme.palette.error.light, '&:hover': {backgroundColor: alpha(theme.palette.error.light,0.1)} }}
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
          PaperProps={{ // Dialog Paper is already styled by MuiDialog in theme
            sx: {
              // No need to repeat here if global MuiDialog is sufficient
              // backgroundColor: alpha(theme.palette.background.paper, 0.95),
              // border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            }
          }}
        >
          <DialogTitle sx={{ color: theme.palette.text.primary }}>
            Confirmar Eliminación
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: theme.palette.text.secondary }}>
              ¿Estás seguro de que quieres eliminar la propiedad "{deleteDialog.property?.name}"? 
              Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialog({ open: false, property: null })}
              sx={{ color: theme.palette.text.secondary }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              disabled={deleting}
              sx={{ color: theme.palette.error.main }}
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