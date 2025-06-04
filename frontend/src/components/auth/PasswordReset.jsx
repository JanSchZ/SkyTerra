import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Container,
  Fade
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockResetIcon from '@mui/icons-material/LockReset';
import { authService } from '../../services/api';

const commonTextFieldStyles = {
  '& .MuiInputLabel-root': {
    color: '#8b949e', 
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#58a6ff',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(13, 17, 23, 0.85)',
    color: '#c9d1d9',
    borderRadius: '8px',
    transition: 'background-color 0.3s ease, border-color 0.3s ease',
    '& fieldset': {
      borderColor: 'rgba(88, 166, 255, 0.2)',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(88, 166, 255, 0.4)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#58a6ff',
      borderWidth: '1px',
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#e57373',
    fontSize: '0.75rem',
    fontWeight: 300,
  }
};

const PasswordResetRequest = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('El email es requerido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al solicitar el restablecimiento de contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Fade in={true} timeout={500}>
          <Paper 
            elevation={12} 
            sx={{ 
              p: 4,
              borderRadius: '16px',
              backgroundColor: '#101418',
              border: '1px solid rgba(88, 166, 255, 0.15)',
              textAlign: 'center'
            }}
          >
            <EmailIcon sx={{ fontSize: 48, color: '#58a6ff', mb: 2 }} />
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2, fontWeight: 300 }}>
              Email enviado
            </Typography>
            <Typography variant="body1" sx={{ color: '#8b949e', mb: 3 }}>
              Se ha enviado un enlace de restablecimiento de contraseña a <strong>{email}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: '#8b949e', mb: 3 }}>
              Revisa tu bandeja de entrada y sigue las instrucciones para crear una nueva contraseña.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              sx={{ 
                color: '#58a6ff', 
                borderColor: '#58a6ff',
                '&:hover': { 
                  borderColor: '#4a90e2',
                  backgroundColor: 'rgba(88, 166, 255, 0.1)'
                }
              }}
            >
              Volver al inicio de sesión
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Fade in={true} timeout={500}>
        <Paper 
          elevation={12} 
          sx={{ 
            p: 4,
            borderRadius: '16px',
            backgroundColor: '#101418',
            border: '1px solid rgba(88, 166, 255, 0.15)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockResetIcon sx={{ fontSize: 48, color: '#58a6ff', mb: 2 }} />
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 1, fontWeight: 300 }}>
              Restablecer contraseña
            </Typography>
            <Typography variant="body2" sx={{ color: '#8b949e' }}>
              Ingresa tu email para recibir un enlace de restablecimiento
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              autoFocus
              disabled={loading}
              sx={commonTextFieldStyles}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ 
                mt: 3, mb: 2, py: 1.5, borderRadius: '8px',
                backgroundColor: '#58a6ff', 
                fontWeight: 400,
                letterSpacing: '0.02em',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#4a90e2' }
              }}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: '#8b949e', textTransform: 'none' }}
              >
                Volver al inicio de sesión
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

const PasswordResetConfirm = () => {
  const [searchParams] = useSearchParams();
  const [passwords, setPasswords] = useState({
    new_password1: '',
    new_password2: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const uidb64 = searchParams.get('uidb64');
  const token = searchParams.get('token');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (passwords.new_password1 !== passwords.new_password2) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwords.new_password1.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    setError(null);    try {
      await authService.confirmPasswordReset(uidb64, token, passwords.new_password1);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Fade in={true} timeout={500}>
          <Paper 
            elevation={12} 
            sx={{ 
              p: 4,
              borderRadius: '16px',
              backgroundColor: '#101418',
              border: '1px solid rgba(88, 166, 255, 0.15)',
              textAlign: 'center'
            }}
          >
            <LockResetIcon sx={{ fontSize: 48, color: '#28a745', mb: 2 }} />
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 2, fontWeight: 300 }}>
              Contraseña actualizada
            </Typography>
            <Typography variant="body1" sx={{ color: '#8b949e', mb: 3 }}>
              Tu contraseña ha sido restablecida exitosamente.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ 
                backgroundColor: '#28a745',
                '&:hover': { backgroundColor: '#218838' }
              }}
            >
              Iniciar sesión
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Fade in={true} timeout={500}>
        <Paper 
          elevation={12} 
          sx={{ 
            p: 4,
            borderRadius: '16px',
            backgroundColor: '#101418',
            border: '1px solid rgba(88, 166, 255, 0.15)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockResetIcon sx={{ fontSize: 48, color: '#58a6ff', mb: 2 }} />
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 1, fontWeight: 300 }}>
              Nueva contraseña
            </Typography>
            <Typography variant="body2" sx={{ color: '#8b949e' }}>
              Ingresa tu nueva contraseña
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Nueva contraseña"
              type="password"
              name="new_password1"
              fullWidth
              required
              value={passwords.new_password1}
              onChange={handleChange}
              margin="normal"
              autoFocus
              disabled={loading}
              sx={commonTextFieldStyles}
            />

            <TextField
              label="Confirmar nueva contraseña"
              type="password"
              name="new_password2"
              fullWidth
              required
              value={passwords.new_password2}
              onChange={handleChange}
              margin="normal"
              disabled={loading}
              sx={commonTextFieldStyles}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ 
                mt: 3, mb: 2, py: 1.5, borderRadius: '8px',
                backgroundColor: '#58a6ff', 
                fontWeight: 400,
                letterSpacing: '0.02em',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#4a90e2' }
              }}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

export { PasswordResetRequest, PasswordResetConfirm };
