import React, { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress, Typography, Chip, LinearProgress, Alert, Snackbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { tourService } from '../../services/api';

// Simple drag-and-drop wrapper
function FileDropArea({ onFileSelected, disabled, file }) {
  const theme = useTheme();
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  }, [disabled, onFileSelected]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      sx={{
        p: 3,
        border: `2px dashed ${theme.palette.primary.main}`,
        borderRadius: 2,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        bgcolor: 'action.hover',
      }}
      component="label"
    >
      <input
        type="file"
        hidden
        disabled={disabled}
        accept=".zip,.ggpkg"
        onChange={(e) => onFileSelected(e.target.files?.[0])}
      />
      {file ? (
        <Typography variant="body2" noWrap>{file.name}</Typography>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <CloudUploadIcon color="primary" />
          <Typography variant="body2">Arrastra y suelta o haz clic para seleccionar (.zip / .ggpkg)</Typography>
        </Box>
      )}
    </Box>
  );
}

export default function UploadTourDialog({ open, onClose, propertyId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'uploading', 'processing', 'success', 'error'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const handleFileSelect = (f) => {
    if (!f) return;
    // Validar tipo de archivo
    const allowedExtensions = ['.zip', '.ggpkg'];
    const isValidFile = allowedExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
    
    if (!isValidFile) {
      setError(`Tipo de archivo no válido. Solo se permiten archivos: ${allowedExtensions.join(', ')}`);
      return;
    }
    
    // Validación de tamaño removida - permitir archivos de cualquier tamaño
    
    setFile(f);
    setError('');
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
  };

  const resetForm = () => {
    setFile(null);
    setName('');
    setDescription('');
    setUploadProgress(0);
    setUploadStatus('');
    setError('');
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return; // No permitir cerrar durante la subida
    resetForm();
    onClose();
  };

  const handleUpload = async () => {
    if (!file) return;
    
    const form = new FormData();
    form.append('property', propertyId);
    form.append('package_file', file);
    if (name) form.append('name', name);
    if (description) form.append('description', description);
    
    try {
      setLoading(true);
      setUploadStatus('uploading');
      setUploadProgress(0);
      setError('');
      
      // Simular progreso de subida
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);
      
      await tourService.uploadTour(form);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('processing');
      
      // Simular tiempo de procesamiento
      setTimeout(() => {
        setUploadStatus('success');
        setSuccess(true);
        setTimeout(() => {
          onUploaded && onUploaded();
          handleClose();
        }, 1500);
      }, 1000);
      
    } catch (e) {
      console.error('Error uploading tour', e);
      setLoading(false);
      setUploadStatus('error');
      
      // Mejores mensajes de error
      let errorMessage = 'Error desconocido al subir el tour';
      
      if (e.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e.response?.data?.package_file) {
        errorMessage = Array.isArray(e.response.data.package_file) 
          ? e.response.data.package_file[0] 
          : e.response.data.package_file;
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      // Mensajes específicos para errores comunes
      if (errorMessage.includes('not a valid zip')) {
        errorMessage = 'El archivo no es un ZIP válido. Por favor, verifica que el archivo no esté corrupto.';
      } else if (errorMessage.includes('file too large')) {
        errorMessage = 'El archivo es demasiado grande.';
      } else if (errorMessage.includes('permission')) {
        errorMessage = 'No tienes permisos para subir tours a esta propiedad.';
      } else if (e.response?.status === 401) {
        errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
      } else if (e.response?.status === 403) {
        errorMessage = 'No tienes permisos para subir tours.';
      }
      
      setError(errorMessage);
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return `Subiendo archivo... ${Math.round(uploadProgress)}%`;
      case 'processing':
        return 'Procesando y extrayendo archivos...';
      case 'success':
        return '¡Tour subido exitosamente!';
      case 'error':
        return 'Error al subir el tour';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Subir Tour 360°
            {getStatusIcon()}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
            {/* Mostrar errores */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {/* Mostrar éxito */}
            {uploadStatus === 'success' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                ¡Tour subido y procesado exitosamente!
              </Alert>
            )}
            
            <FileDropArea onFileSelected={handleFileSelect} disabled={loading} file={file} />
            
            {file && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${(file.size/1024/1024).toFixed(2)} MB`} variant="outlined" />
                <Chip label={file.type || 'ZIP'} variant="outlined" color="primary" />
              </Box>
            )}
            
            <TextField 
              label="Nombre" 
              value={name} 
              onChange={(e)=>setName(e.target.value)} 
              fullWidth 
              size="small" 
              disabled={loading}
              helperText="Nombre descriptivo para el tour"
            />
            
            <TextField 
              label="Descripción" 
              value={description} 
              onChange={(e)=>setDescription(e.target.value)} 
              fullWidth 
              size="small" 
              multiline 
              rows={2} 
              disabled={loading}
              helperText="Descripción opcional del tour"
            />
            
            {/* Barra de progreso mejorada */}
            {loading && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {getStatusMessage()}
                  </Typography>
                  {uploadStatus === 'uploading' && (
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(uploadProgress)}%
                    </Typography>
                  )}
                </Box>
                
                {uploadStatus === 'uploading' ? (
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                ) : uploadStatus === 'processing' ? (
                  <LinearProgress 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                ) : null}
                
                {uploadStatus === 'processing' && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Esto puede tomar algunos minutos dependiendo del tamaño del archivo
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            {uploadStatus === 'success' ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!file || loading || uploadStatus === 'success'}
            startIcon={loading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {loading ? 'Subiendo...' : 'Subir Tour'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para mensajes de éxito */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Tour subido exitosamente
        </Alert>
      </Snackbar>
    </>
  );
} 