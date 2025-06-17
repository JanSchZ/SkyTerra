import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Fade
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';
import { GoogleLogin } from '@react-oauth/google';
import LoginWithTwitter from 'react-login-with-twitter';
import XIcon from '@mui/icons-material/X';
import AppleLogin from 'react-apple-login';

// Estilos comunes para los TextField
const commonTextFieldStyles = {
  '& .MuiInputLabel-root': {
    color: '#c9d1d9',
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#c9d1d9',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#e5e5e5',
    borderRadius: '10px',
    transition: 'box-shadow 0.4s ease',
    '& fieldset': {
      borderColor: 'transparent',
    },
    '&:hover fieldset': {
      borderColor: 'transparent',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'transparent',
    },
    '&.Mui-focused': {
      boxShadow: '0 0 8px rgba(255,255,255,0.35)',
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#e57373',
    fontSize: '0.75rem',
    fontWeight: 300,
  }
};

// Componente de formulario de inicio de sesión
export const LoginForm = ({ onLogin, loading, error, onSwitchToRegister, onClose, onGoogleLoginSuccess, onGoogleLoginError, onTwitterLoginSuccess, onTwitterLoginError, onAppleLoginSuccess }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) onLogin({ login_identifier: loginIdentifier, password });
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 300, color: '#c9d1d9', mb: 1, textAlign: 'center' }}>
        Iniciar Sesión
      </Typography>
      <Typography variant="body2" sx={{ color: '#8b949e', mb: 4, textAlign: 'center', fontWeight: 300 }}>
        Bienvenido de nuevo a SkyTerra.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
          {typeof error === 'object' ? JSON.stringify(error) : error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
        <TextField
          label="Email o Nombre de Usuario"
          type="text"
          fullWidth
          required
          value={loginIdentifier}
          onChange={(e) => setLoginIdentifier(e.target.value)}
          margin="normal"
          autoFocus
          disabled={loading}
          sx={commonTextFieldStyles}
        />
        
        <TextField
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          disabled={loading}
          sx={commonTextFieldStyles}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#8b949e' }}>
                  {showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '8px', textTransform: 'none', fontWeight: 500 }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Button>
        
        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }}>O</Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <GoogleLogin
            onSuccess={onGoogleLoginSuccess}
            onError={onGoogleLoginError}
            width="100%"
            useOneTap
          />
          <LoginWithTwitter
            authCallback={onTwitterLoginSuccess}
            onFailure={onTwitterLoginError}
            consumerKey={import.meta.env.VITE_X_CONSUMER_KEY}
            consumerSecret={import.meta.env.VITE_X_CONSUMER_SECRET}
            style={{ width: '100%' }}
          >
            <Button
              fullWidth
              variant="outlined"
              startIcon={<XIcon />}
              sx={{
                justifyContent: 'center',
                textTransform: 'none',
                height: '40px',
                color: '#000000',
                borderColor: '#000000',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  borderColor: '#000000',
                },
              }}
            >
              Iniciar sesión con X
            </Button>
          </LoginWithTwitter>
          <AppleLogin 
            clientId={import.meta.env.VITE_APPLE_CLIENT_ID}
            redirectURI={import.meta.env.VITE_APPLE_CALLBACK_URL}
            responseType={"code id_token"}
            responseMode={"form_post"}
            usePopup={true}
            callback={onAppleLoginSuccess}
            scope="email name"
            render={renderProps => (
              <Button
                onClick={renderProps.onClick}
                disabled={renderProps.disabled}
                fullWidth
                variant="outlined"
                sx={{
                  justifyContent: 'center',
                  textTransform: 'none',
                  height: '40px',
                  color: '#000',
                  backgroundColor: '#fff',
                  borderColor: '#000',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    borderColor: '#000',
                  },
                }}
              >
                <Box component="span" sx={{ fontFamily: '-apple-system, BlinkMacSystemFont', fontSize: '18px', mr: 1 }}></Box>
                Iniciar sesión con Apple
              </Button>
            )}
          />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
        <Typography variant="body2" align="center" sx={{ color: '#8b949e', fontWeight: 300 }}>
          ¿No tienes una cuenta?
          <Button onClick={onSwitchToRegister} sx={{ color: '#c9d1d9', fontWeight: 400, textTransform: 'none', p:0.5, '&:hover':{textDecoration:'underline'} }}>
            Crear cuenta
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

// Componente de formulario de registro
export const RegisterForm = ({ onRegister, loading, error, onSwitchToLogin, onClose, onGoogleLoginSuccess, onGoogleLoginError, onTwitterLoginSuccess, onTwitterLoginError, onAppleLoginSuccess }) => {
  // Paso 1: tipo de vendedor (null, 'individual', 'professional')
  const [sellerType, setSellerType] = useState(null);

  // Datos del formulario – se agregan campos adicionales dependiendo del tipo de vendedor
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    /* Básicos */
    name: '',
    rut: '',
    phone: '',
    /* Profesionales */
    companyName: '',
    companyRUT: '',
    certification: '',
    listingCount: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!sellerType) {
      errors.sellerType = 'Selecciona un tipo de vendedor';
      return errors;
    }
    
    // Validación del email
    if (!formData.email) {
      errors.email = 'El correo es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Correo no válido';
    }
    
    // Validaciones específicas según tipo de vendedor
    if (sellerType === 'individual') {
      if (!formData.name) errors.name = 'Nombre obligatorio';
      if (!formData.rut) errors.rut = 'RUT obligatorio';
      if (!formData.phone) errors.phone = 'Teléfono obligatorio';
    } else if (sellerType === 'professional') {
      if (!formData.companyName) errors.companyName = 'Nombre de empresa obligatorio';
      if (!formData.companyRUT) errors.companyRUT = 'RUT de empresa obligatorio';
      if (!formData.listingCount) errors.listingCount = 'Número de listados obligatorio';
    }
    
    // Validación de la contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      errors.password = 'Mínimo 8 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Debe contener al menos una minúscula, una mayúscula y un número';
    }
    
    // Validación de confirmación de contraseña
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🔄 Formulario de registro enviado:', {
      sellerType,
      ...formData,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });
    
    const errors = validateForm();
    if (Object.keys(errors).length === 0) {
      console.log('✅ Validación exitosa, enviando datos...');
      const autoUsername = formData.email ? formData.email.split('@')[0] : undefined;
      const userData = {
        seller_type: sellerType,
        email: formData.email,
        username: autoUsername,
        password: formData.password,
        name: formData.name,
        rut: formData.rut,
        phone: formData.phone,
        company_name: formData.companyName,
        company_rut: formData.companyRUT,
        certification: formData.certification,
        listing_count: formData.listingCount
      };
      if (onRegister) onRegister(userData);
    } else {
      console.log('❌ Errores de validación:', errors);
      setFormErrors(errors);
    }
  };

  // UI para seleccionar tipo de vendedor
  if (!sellerType) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 300, color: '#c9d1d9', mb: 3, textAlign: 'center' }}>
          ¿Qué tipo de vendedor eres?
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
            {typeof error === 'object' ? JSON.stringify(error) : error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Paper onClick={() => setSellerType('individual')} sx={{ flex: 1, p: 3, cursor: 'pointer', '&:hover': { boxShadow: 6, backgroundColor: 'rgba(255,255,255,0.08)' } }}>
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 1 }}>Vendo mi terreno</Typography>
            <Typography variant="body2" sx={{ color: '#8b949e' }}>Para dueños que quieren publicar 1-3 terrenos propios.</Typography>
          </Paper>
          <Paper onClick={() => setSellerType('professional')} sx={{ flex: 1, p: 3, cursor: 'pointer', '&:hover': { boxShadow: 6, backgroundColor: 'rgba(255,255,255,0.08)' } }}>
            <Typography variant="h5" sx={{ color: '#c9d1d9', mb: 1 }}>Vendedor profesional</Typography>
            <Typography variant="body2" sx={{ color: '#8b949e' }}>Para corredores, inmobiliarias o proyectos con múltiples terrenos.</Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.15)' }} />
        <Typography variant="body2" align="center" sx={{ color: '#8b949e', fontWeight: 300 }}>
          ¿Ya tienes una cuenta?{' '}
          <Button onClick={onSwitchToLogin} sx={{ color: '#c9d1d9', fontWeight: 400, textTransform: 'none', p:0.5, '&:hover':{textDecoration:'underline'} }}>
            Iniciar sesión
          </Button>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 300, color: '#c9d1d9', mb: 1, textAlign: 'center' }}>
        {sellerType === 'individual' ? 'Registro: Vendo mi terreno' : 'Registro: Vendedor profesional'}
      </Typography>
      <Typography variant="body2" sx={{ color: '#8b949e', mb: 4, textAlign: 'center', fontWeight: 300 }}>
        {sellerType === 'individual'
          ? 'Para dueños que quieren publicar 1-3 terrenos propios.'
          : 'Para corredores, inmobiliarias o proyectos con múltiples terrenos.'}
      </Typography>

      <Button onClick={() => setSellerType(null)} size="small" startIcon={<PersonAddIcon />} sx={{ mb: 2, textTransform: 'none', color: '#c9d1d9' }}>
        Cambiar tipo de vendedor
      </Button>
      
      {error && (
         <Alert severity="error" sx={{ mb: 2, backgroundColor: 'rgba(229,115,115,0.1)', color: '#e57373' }}>
           {typeof error === 'object' ? JSON.stringify(error) : error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
        {/* Campos específicos según tipo */}
        {sellerType === 'individual' && (
          <>
            <TextField label="Nombre Completo" type="text" name="name" fullWidth required value={formData.name} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.name} helperText={formErrors.name} sx={commonTextFieldStyles} />
            <TextField label="RUT" type="text" name="rut" fullWidth required value={formData.rut} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.rut} helperText={formErrors.rut} sx={commonTextFieldStyles} />
            <TextField label="Teléfono" type="tel" name="phone" fullWidth required value={formData.phone} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.phone} helperText={formErrors.phone} sx={commonTextFieldStyles} />
          </>
        )}

        {sellerType === 'professional' && (
          <>
            <TextField label="Nombre de Empresa" type="text" name="companyName" fullWidth required value={formData.companyName} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.companyName} helperText={formErrors.companyName} sx={commonTextFieldStyles} />
            <TextField label="RUT de Empresa" type="text" name="companyRUT" fullWidth required value={formData.companyRUT} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.companyRUT} helperText={formErrors.companyRUT} sx={commonTextFieldStyles} />
            <TextField label="Certificación (opcional)" type="text" name="certification" fullWidth value={formData.certification} onChange={handleChange} margin="normal" disabled={loading} sx={commonTextFieldStyles} />
            <TextField label="Número de Listados" type="number" name="listingCount" fullWidth required value={formData.listingCount} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.listingCount} helperText={formErrors.listingCount} sx={commonTextFieldStyles} />
          </>
        )}

        <TextField label="Correo Electrónico" type="email" name="email" fullWidth required value={formData.email} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.email} helperText={formErrors.email} sx={commonTextFieldStyles} />
        <TextField label="Contraseña" type={showPassword ? 'text' : 'password'} name="password" fullWidth required value={formData.password} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.password} helperText={formErrors.password} sx={commonTextFieldStyles} InputProps={{ endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#8b949e' }}>{showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}</IconButton></InputAdornment>)}} />
        <TextField label="Confirmar Contraseña" type={showPassword ? 'text' : 'password'} name="confirmPassword" fullWidth required value={formData.confirmPassword} onChange={handleChange} margin="normal" disabled={loading} error={!!formErrors.confirmPassword} helperText={formErrors.confirmPassword} sx={commonTextFieldStyles} />
        
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '8px', textTransform: 'none', fontWeight: 500 }} disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null} >
          {loading ? 'Registrando...' : 'Crear Cuenta'}
        </Button>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }}>O</Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <GoogleLogin
            onSuccess={onGoogleLoginSuccess}
            onError={onGoogleLoginError}
            width="100%"
          />
          <LoginWithTwitter
            authCallback={onTwitterLoginSuccess}
            onFailure={onTwitterLoginError}
            consumerKey={import.meta.env.VITE_X_CONSUMER_KEY}
            consumerSecret={import.meta.env.VITE_X_CONSUMER_SECRET}
            style={{ width: '100%' }}
          >
            <Button
              fullWidth
              variant="outlined"
              startIcon={<XIcon />}
              sx={{
                justifyContent: 'center',
                textTransform: 'none',
                height: '40px',
                color: '#000000',
                borderColor: '#000000',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  borderColor: '#000000',
                },
              }}
            >
              Registrarse con X
            </Button>
          </LoginWithTwitter>
          <AppleLogin 
            clientId={import.meta.env.VITE_APPLE_CLIENT_ID}
            redirectURI={import.meta.env.VITE_APPLE_CALLBACK_URL}
            responseType={"code id_token"}
            responseMode={"form_post"}
            usePopup={true}
            callback={onAppleLoginSuccess}
            scope="email name"
            render={renderProps => (
              <Button
                onClick={renderProps.onClick}
                disabled={renderProps.disabled}
                fullWidth
                variant="outlined"
                sx={{
                  justifyContent: 'center',
                  textTransform: 'none',
                  height: '40px',
                  color: '#000',
                  backgroundColor: '#fff',
                  borderColor: '#000',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    borderColor: '#000',
                  },
                }}
              >
                <Box component="span" sx={{ fontFamily: '-apple-system, BlinkMacSystemFont', fontSize: '18px', mr: 1 }}></Box>
                Registrarse con Apple
              </Button>
            )}
          />
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.15)' }} />
        <Typography variant="body2" align="center" sx={{ color: '#8b949e', fontWeight: 300 }}>
          ¿Ya tienes una cuenta?
          <Button onClick={onSwitchToLogin} sx={{ color: '#c9d1d9', fontWeight: 400, textTransform: 'none', p: 0.5, '&:hover':{textDecoration:'underline'} }}>
            Iniciar sesión
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

// Main AuthPage component that acts as a modal-like container
const AuthPage = ({ formType, onLogin, onRegister }) => {
  // formType can be 'login' or 'register'
  const [currentForm, setCurrentForm] = useState(formType || 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLoginSubmit = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      if (onLogin) await onLogin(credentials);
      // Navigation should be handled by the App component after successful login
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (onRegister) await onRegister(userData);
      // Navigation or message should be handled by App component
    } catch (err) {
      setError(err.message || 'Error al registrar.');
    }
    setIsLoading(false);
  };
  
  const handleClose = () => {
    navigate('/'); // Navigate to home or previous page on close
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      // Aquí iría la lógica para iniciar sesión con Google
      // Por ahora, solo simularé el éxito
      console.log('Simulando inicio de sesión con Google...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga
      console.log('Simulación de Google Login exitosa.');
      // Aquí deberías llamar a la función onGoogleLoginSuccess del prop
      onGoogleLoginSuccess(credentialResponse);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google.');
    }
    setIsLoading(false);
  };

  const handleGoogleLoginError = (error) => {
    setIsLoading(false);
    setError(error.errorMessage || 'Error al iniciar sesión con Google.');
  };

  return (
    <Fade in={true} timeout={500}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(13,17,23,0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconButton
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            color: 'white',
            zIndex: 1301,
          }}
          onClick={handleClose}
        >
          <CloseIcon />
        </IconButton>

        <Paper elevation={6} sx={{
          p: { xs: 3, md: 6 },
          borderRadius: 4,
          background: 'rgba(30, 41, 59, 0.95)',
          color: 'white',
          maxWidth: 480,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(30, 58, 95, 0.25)',
        }}>
          {currentForm === 'login' ? (
            <LoginForm 
              onLogin={handleLoginSubmit} 
              loading={isLoading} 
              error={error}
              onSwitchToRegister={() => { setCurrentForm('register'); setError(null); }}
              onClose={handleClose}
              onGoogleLoginSuccess={handleGoogleLoginSuccess}
              onGoogleLoginError={handleGoogleLoginError}
            />
          ) : (
            <RegisterForm 
              onRegister={handleRegisterSubmit} 
              loading={isLoading} 
              error={error}
              onSwitchToLogin={() => { setCurrentForm('login'); setError(null); }}
              onClose={handleClose}
              onGoogleLoginSuccess={handleGoogleLoginSuccess}
              onGoogleLoginError={handleGoogleLoginError}
            />
          )}
        </Paper>
      </Box>
    </Fade>
  );
};

export default AuthPage; 