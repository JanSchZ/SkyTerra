import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, CircularProgress } from '@mui/material';
import { tourService } from '../../services/api';

export default function UploadTourDialog({ open, onClose, propertyId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const handleFileChange = (e) => setFile(e.target.files[0]);

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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Subir Tour 360°</DialogTitle>
      <DialogContent>
        <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
          <Button variant="outlined" component="label">
            Seleccionar archivo (.zip / .ggpkg)
            <input type="file" hidden accept=".zip,.ggpkg" onChange={handleFileChange}/>
          </Button>
          {file && <span>{file.name}</span>}
          <TextField label="Nombre" value={name} onChange={(e)=>setName(e.target.value)} fullWidth size="small"/>
          <TextField label="Descripción" value={description} onChange={(e)=>setDescription(e.target.value)} fullWidth size="small" multiline rows={2}/>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleUpload} variant="contained" disabled={!file || loading}>{loading ? <CircularProgress size={20} /> : 'Subir'}</Button>
      </DialogActions>
    </Dialog>
  );
} 