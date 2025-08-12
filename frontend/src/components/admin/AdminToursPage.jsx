import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Chip,
  Alert,
  Avatar,
  Grid,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import TourIcon from '@mui/icons-material/Tour';
import StorageIcon from '@mui/icons-material/Storage';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { api, tourService, authService } from '../../services/api';
import UploadTourDialog from '../tours/UploadTourDialog';

// Componente para mostrar estadísticas de tours
const TourStats = ({ stats, loading }) => {
  const statCards = [
    {
      title: 'Total Tours',
      value: stats.totalTours || 0,
      icon: <TourIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Tours Activos',
      value: stats.activeTours || 0,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Tours con Errores',
      value: stats.errorTours || 0,
      icon: <ErrorIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
    },
    {
      title: 'Almacenamiento Usado',
      value: stats.storageUsed || '0 MB',
      icon: <StorageIcon sx={{ fontSize: 40 }} />,
      color: '#7b1fa2',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {statCards.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: stat.color, mr: 2 }}>
                  {stat.icon}
                </Box>
                <Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {stat.title}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Componente para mostrar el estado del tour
const TourStatusChip = ({ tour }) => {
  const hasUrl = tour.url && tour.url.trim() !== '';
  const isProcessing = !hasUrl && tour.package_path;
  const hasError = !hasUrl && !tour.package_path;

  if (isProcessing) {
    return <Chip label="Procesando" color="warning" size="small" />;
  }
  if (hasError) {
    return <Chip label="Error" color="error" size="small" />;
  }
  return <Chip label="Activo" color="success" size="small" />;
};

const AdminToursPage = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTour, setSelectedTour] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  // Logging básico para debugging si es necesario
  // console.log('AdminToursPage renderizando...', { tours, loading, error });

  // Cargar tours
  const loadTours = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tours/');
      const toursData = Array.isArray(response.data) ? response.data : response.data.results || [];
      setTours(toursData);
      setError(null); // Clear any previous errors when loading is successful
    } catch (err) {
      console.error('Error loading tours:', err);
      setError('Error al cargar tours: ' + (err.message || err.toString()));
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      // Intentar endpoint de estadísticas primero
      try {
        const response = await api.get('/tours/stats/');
        setStats({
          totalTours: response.data.total_tours,
          activeTours: response.data.active_tours,
          errorTours: response.data.error_tours,
          storageUsed: response.data.storage_used,
        });
        return; // Si funciona, salir aquí
      } catch (statsErr) {
        // console.warn('Endpoint stats falló, usando fallback:', statsErr);
      }
      
      // Fallback manual si el endpoint falla
      const response = await api.get('/tours/');
      const toursData = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      const totalTours = toursData.length;
      const activeTours = toursData.filter(t => t.url && t.url.trim() !== '').length;
      const errorTours = toursData.filter(t => !t.url || t.url.trim() === '').length;
      
      // Calcular almacenamiento usado (estimación)
      const storageUsed = `${(activeTours * 25).toFixed(1)} MB (estimado)`;
      
      setStats({
        totalTours,
        activeTours,
        errorTours,
        storageUsed,
      });

      
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats({
        totalTours: 0,
        activeTours: 0,
        errorTours: 0,
        storageUsed: 'Error',
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadTours();
    loadStats();
  }, []);

  // Eliminar tour
  const handleDeleteTour = async () => {
    if (!selectedTour) return;
    
    try {
      console.log('Attempting to delete tour:', selectedTour.id);
      
      // Ensure CSRF token is available before making the delete request
      await authService.ensureCsrfCookie();
      
      await api.delete(`/tours/${selectedTour.id}/`);
      await loadTours();
      await loadStats();
      setDeleteDialogOpen(false);
      setSelectedTour(null);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error deleting tour:', err);
      
      if (err.response?.status === 401) {
        setError('Error de autenticación. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para eliminar tours. Solo los administradores pueden eliminar tours.');
      } else {
        setError(`Error al eliminar el tour: ${err.response?.data?.detail || err.message || 'Error desconocido'}`);
      }
    }
  };

  // Actualizar tour
  const handleUpdateTour = async (tourData) => {
    if (!selectedTour) return;
    
    try {
      await api.patch(`/tours/${selectedTour.id}/`, tourData);
      await loadTours();
      setEditDialogOpen(false);
      setSelectedTour(null);
    } catch (err) {
      console.error('Error updating tour:', err);
      setError('Error al actualizar el tour');
    }
  };

  // Definir columnas para el DataGrid
  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
    },
    {
      field: 'property_name',
      headerName: 'Propiedad',
      width: 200,
      valueGetter: (params) => {
        try {
          return params?.row?.property?.name || 'Sin nombre';
        } catch (error) {
          console.warn('Error getting property name:', error);
          return 'Sin nombre';
        }
      },
      renderCell: (params) => {
        try {
          const propertyName = params?.value || 'Sin nombre';
          const imageUrl = params?.row?.property?.images?.[0]?.image;
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                src={imageUrl}
                sx={{ mr: 1, width: 32, height: 32 }}
                variant="rounded"
              />
              <Typography variant="body2">
                {propertyName}
              </Typography>
            </Box>
          );
        } catch (error) {
          console.warn('Error rendering property cell:', error);
          return (
            <Typography variant="body2">
              Error al cargar
            </Typography>
          );
        }
      },
    },
    {
      field: 'name',
      headerName: 'Nombre del Tour',
      width: 200,
      valueGetter: (params) => params?.row?.name || 'Sin nombre',
    },
    {
      field: 'type',
      headerName: 'Tipo',
      width: 120,
      renderCell: (params) => (
        <Chip label={params?.value || 'package'} size="small" variant="outlined" />
      ),
    },
    {
      field: 'status',
      headerName: 'Estado',
      width: 120,
      renderCell: (params) => <TourStatusChip tour={params.row} />,
    },
    {
      field: 'uploaded_at',
      headerName: 'Fecha de Subida',
      width: 180,
      valueFormatter: (params) => {
        if (!params?.value) return 'N/A';
        try {
          return new Date(params.value).toLocaleString('es-CL');
        } catch (error) {
          console.warn('Error formatting date:', error);
          return 'N/A';
        }
      },
    },
    {
      field: 'url',
      headerName: 'URL',
      width: 120,
      renderCell: (params) => (
        params?.value ? (
          <Tooltip title={params.value}>
            <IconButton
              size="small"
              href={params.value}
              target="_blank"
              rel="noopener noreferrer"
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.secondary">
            No disponible
          </Typography>
        )
      ),
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              setSelectedTour(params?.row);
              setEditDialogOpen(true);
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => {
              setSelectedTour(params?.row);
              setDeleteDialogOpen(true);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Early return para debugging
  if (loading && tours.length === 0) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Cargando página de tours...</Typography>
          <Typography variant="body2" color="text.secondary">
            Si esta pantalla persiste, revisa la consola del navegador
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error && tours.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Error cargando página de tours</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => {
            setError(null);
            loadTours();
            loadStats();
          }}
        >
          Reintentar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Administración de Tours Virtuales
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadTours();
              loadStats();
            }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Subir Tour
          </Button>
        </Box>
      </Box>

      {/* Mostrar errores */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <TourStats stats={stats} loading={statsLoading} />

      <Divider sx={{ mb: 3 }} />

      {/* Tabla de tours */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lista de Tours
          </Typography>
          <DataGrid
            rows={tours}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            loading={loading}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{ height: 600 }}
          />
        </CardContent>
      </Card>

      {/* Dialog para editar tour */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Tour</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre"
              defaultValue={selectedTour?.name || ''}
              fullWidth
              id="tour-name"
            />
            <TextField
              label="Descripción"
              defaultValue={selectedTour?.description || ''}
              fullWidth
              multiline
              rows={3}
              id="tour-description"
            />
            {selectedTour?.url && (
              <TextField
                label="URL"
                defaultValue={selectedTour.url}
                fullWidth
                id="tour-url"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              const name = document.getElementById('tour-name').value;
              const description = document.getElementById('tour-description').value;
              const url = document.getElementById('tour-url')?.value;
              handleUpdateTour({ name, description, ...(url && { url }) });
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar el tour "{selectedTour?.name || 'Sin nombre'}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTour}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para subir nuevo tour */}
      <UploadTourDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        propertyId={null} // Para admin, seleccionar propiedad en el dialog
        onUploaded={() => {
          loadTours();
          loadStats();
        }}
      />
    </Box>
  );
};

export default AdminToursPage;
