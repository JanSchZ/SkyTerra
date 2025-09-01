import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { authService } from '../../services/api';

export default function UserProfile({ user }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await authService.updateProfile(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" sx={{ mb: 2 }}>Mi Perfil</Typography>
      <TextField
        label="Nombre"
        name="first_name"
        value={formData.first_name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        autoComplete="off"
      />
      <TextField
        label="Apellido"
        name="last_name"
        value={formData.last_name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        autoComplete="off"
      />
      <TextField
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        autoComplete="off"
        disabled
      />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>Perfil actualizado correctamente.</Alert>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Guardar Cambios'}
      </Button>
    </Box>
  );
}
