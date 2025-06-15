import React, { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress, Typography, Chip, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
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
      await tourService.uploadTour(form);
      setLoading(false);
      onUploaded && onUploaded();
      onClose();
    } catch (e) {
      console.error('Error uploading tour', e);
      alert('Error subiendo el tour: ' + (e.response?.data?.error || e.message));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Subir Tour 360°</DialogTitle>
      <DialogContent>
        <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
          <FileDropArea onFileSelected={handleFileSelect} disabled={loading} file={file} />
          {file && <Chip label={`${(file.size/1024/1024).toFixed(2)} MB`} variant="outlined" />}
          <TextField label="Nombre" value={name} onChange={(e)=>setName(e.target.value)} fullWidth size="small" disabled={loading}/>
          <TextField label="Descripción" value={description} onChange={(e)=>setDescription(e.target.value)} fullWidth size="small" multiline rows={2} disabled={loading}/>
          {loading && <LinearProgress />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleUpload} variant="contained" disabled={!file || loading}>{loading ? <CircularProgress size={20} /> : 'Subir'}</Button>
      </DialogActions>
    </Dialog>
  );
} 