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
  Tabs,
  Tab,
  Grid,
  Avatar,
  Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { propertyService } from '../../services/api';
import PropertyForm from '../property/PropertyForm';
import PropertyCard from '../property/PropertyCard';
import { useNavigate } from 'react-router-dom';

// Panel de propiedades
function PropertiesPanel({ user }) {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await propertyService.getUserProperties();
        setProperties(Array.isArray(data) ? data : (data?.results && Array.isArray(data.results) ? data.results : []));
      } catch (err) {
        console.error('Error al cargar mis propiedades:', err);
        if (err.response && err.response.status === 401) {
          setError('Necesitas iniciar sesión para ver tus propiedades. Redirigiendo a login...');
        } else {
          setError('No se pudieron cargar tus propiedades en este momento. Intenta nuevamente más tarde.');
        }
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProperties();
    } else {
      setLoading(false);
      setError('No hay usuario autenticado.');
      setProperties([]);
    }
  }, [user, navigate]);

  const handleAddNew = () => {
    setEditingProperty(null);
    navigate('/property/create');
    setFormError(null);
  };

  const handleEdit = (property) => {
    navigate(`/property/edit/${property.id}`);
    setFormError(null);
  };

  const handleDelete = (property) => {
    setPropertyToDelete(property);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;
    setSubmitting(true);
    try {
      await propertyService.deleteProperty(propertyToDelete.id);
      setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
      setShowDeleteDialog(false);
      setPropertyToDelete(null);
    } catch (err) {
      console.error('Error al eliminar propiedad:', err);
      setError('No se pudo eliminar la propiedad.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando tus propiedades...</Typography>
      </Box>
    );
  }

  if (error && properties.length === 0) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Mis Propiedades
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ py: 1.5, px: 3, borderRadius: 2, textTransform: 'none' }}
        >
          Publicar Nueva Propiedad
        </Button>
      </Box>
      
      {error && properties.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {properties.length === 0 && !loading && !error && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, boxShadow:1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Aún no has publicado propiedades.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            ¡Comienza ahora y muestra tus terrenos al mundo!
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            size="large"
          >
            Publicar mi primera propiedad
          </Button>
        </Paper>
      )}

      <Grid container spacing={3}>
        {properties.map((property) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={property.id}>
            <PropertyCard property={property} />
          </Grid>
        ))}
      </Grid>
      
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que quieres eliminar la propiedad "{propertyToDelete?.name}"? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="inherit" disabled={submitting}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : null}>
            {submitting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Panel de perfil
function ProfilePanel({ user }) {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Mi Perfil
      </Typography>
      <Paper sx={{ p:3, borderRadius:2, boxShadow:1}}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
              alt={user?.username || 'Usuario'}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5">{user?.username || 'Nombre de Usuario'}</Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.email || 'correo@ejemplo.com'}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Typography variant="body1" gutterBottom>
            <strong>Nombre:</strong> {user?.first_name || 'No especificado'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Apellido:</strong> {user?.last_name || 'No especificado'}
          </Typography>
           <Typography variant="body1" gutterBottom>
            <strong>Miembro desde:</strong> {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('es-CL') : 'N/A'}
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" color="primary" disabled>
              Editar Perfil (Próximamente)
            </Button>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
}

// Componente principal del Dashboard
const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
    }
  }, [user, navigate]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!user) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 4 }}>
        <Alert severity="warning" sx={{display:'inline-flex'}}>
          <Typography>Por favor, <Button color="inherit" size="small" onClick={() => navigate('/login')}>inicia sesión</Button> para acceder a tu panel.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 'xl', mx: 'auto' }}>
      <Paper sx={{ mb: 3, borderRadius: 2, overflow:'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Mis Propiedades" sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem'}} />
          <Tab label="Mi Perfil" sx={{ py: 1.5, textTransform: 'none', fontSize: '1rem' }} />
        </Tabs>
      </Paper>
      
      <Box>
        {activeTab === 0 && <PropertiesPanel user={user} />}
        {activeTab === 1 && <ProfilePanel user={user} />}
      </Box>
    </Box>
  );
};

export default Dashboard; 