import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyService } from '../../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PropertyForm from './PropertyForm'; // Import the generic form component

const CreateProperty = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams();

  const [property, setProperty] = useState(null); // State to hold property data for editing
  const [pageLoading, setPageLoading] = useState(true); // Loading state for initial data fetch
  const [submitLoading, setSubmitLoading] = useState(false); // Loading state for form submission
  const [error, setError] = useState(null); // Error state for initial data fetch
  const [submitError, setSubmitError] = useState(null); // Error state for form submission
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Fetch property data if in edit mode
  useEffect(() => {
    if (propertyId) {
      setPageLoading(true);
      setError(null);
      propertyService.getProperty(propertyId)
        .then(data => {
          setProperty(data);
          setPageLoading(false);
        })
        .catch(err => {
          console.error("Error fetching property details:", err);
          setError("No se pudo cargar la información de la propiedad para editar.");
          setSnackbar({ open: true, message: 'Error al cargar datos para editar.', severity: 'error' });
          setPageLoading(false);
        });
    } else {
      setPageLoading(false); // No propertyId, so not loading for edit
    }
  }, [propertyId]);

  const handleSaveProperty = async (formData) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      let result;
      if (propertyId) {
        result = await propertyService.updateProperty(propertyId, formData);
        setSnackbar({ open: true, message: 'Propiedad actualizada exitosamente', severity: 'success' });
      } else {
        result = await propertyService.createProperty(formData);
        setSnackbar({ open: true, message: 'Propiedad creada exitosamente', severity: 'success' });
      }
      setTimeout(() => {
        navigate('/dashboard'); // Redirect after successful save
      }, 1500);
    } catch (err) {
      console.error('Error saving property:', err.response?.data || err.message);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Error al guardar. Intente nuevamente.';
      setSubmitError(errorMsg);
      setSnackbar({ open: true, message: `Error: ${errorMsg}`, severity: 'error' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard'); // Go back to dashboard or previous page
  };

  if (pageLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0d1117'
      }}>
        <CircularProgress sx={{ color: '#c9d1d9' }} />
        <Typography sx={{ ml: 2, color: 'white' }}>Cargando...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0d1117',
        color: 'white',
        textAlign: 'center',
        p: 3
      }}>
        <Box>
          <Typography variant="h6" gutterBottom>{error}</Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Volver al Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0d1117',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton 
            onClick={() => navigate('/dashboard')}
            sx={{ 
              mr: 2, 
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 300 }}>
            {propertyId ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </Typography>
        </Box>

        <PropertyForm
          property={property} // Pass property data for editing
          onSave={handleSaveProperty}
          onCancel={handleCancel}
          isLoading={submitLoading}
          error={submitError}
        />
        
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={() => setSnackbar(prev => ({...prev, open: false}))}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({...prev, open: false}))} 
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default CreateProperty; 
