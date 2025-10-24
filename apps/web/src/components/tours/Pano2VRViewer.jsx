import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

/**
 * Componente para renderizar un tour de Pano2VR en un iframe con timeout y retry.
 * @param {string} src - La URL del index.html del tour.
 * @param {string} title - El título para el iframe (accesibilidad).
 * @param {object} sx - Estilos para el contenedor Box.
 */
const Pano2VRViewer = ({ src, title, sx }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const timeoutRef = useRef(null);

  // Asegurarse de que la URL tiene los parámetros para una mejor UX embebida.
  const getEmbedUrl = useCallback((url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set('autoLoad', 'true');
      urlObj.searchParams.set('autoRotate', '0');
      return urlObj.toString();
    } catch (err) {
      console.warn('Invalid tour URL:', url, err);
      return '';
    }
  }, []);

  const embedSrc = getEmbedUrl(src);

  // Enhanced iframe load handler with timeout cleanup
  const handleIframeLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Enhanced error handler with retry logic
  const handleIframeError = useCallback(() => {
    setLoading(false);
    setError(true);

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Retry logic: up to 2 retries
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        setLoading(true);
        setError(false);
        setIframeKey(prev => prev + 1);
      }, 1000 * (retryCount + 1));
    }
  }, [retryCount]);

  // Timeout for iframe loading (10 seconds for Pano2VR)
  useEffect(() => {
    if (loading && embedSrc) {
      timeoutRef.current = setTimeout(() => {
        if (loading) {
          console.warn('Pano2VR iframe loading timeout');
          handleIframeError();
        }
      }, 10000); // 10 second timeout for Pano2VR tours
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loading, embedSrc, handleIframeError]);

  // Reset states when src changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
  }, [src]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', ...sx }}>
      {/* Enhanced loading state */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 10
          }}
        >
          <CircularProgress color="primary" size={50} />
          <Typography variant="body1" color="white" sx={{ mt: 2, mb: 1 }}>
            {retryCount > 0 ? `Reintentando... (${retryCount}/2)` : 'Cargando tour Pano2VR...'}
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            {retryCount === 0 ? 'Preparando visualización 360°' : 'Verificando tour...'}
          </Typography>
        </Box>
      )}

      {/* Error state with retry option */}
      {error && retryCount >= 2 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 10
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Error al cargar el tour
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 2, textAlign: 'center' }}>
            No se pudo cargar el tour Pano2VR.<br />
            Verifique que el archivo sea compatible.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setRetryCount(0);
              setLoading(true);
              setError(false);
              setIframeKey(prev => prev + 1);
            }}
          >
            Reintentar
          </Button>
        </Box>
      )}

      {/* Main iframe with enhanced error handling */}
      {embedSrc && (
        <iframe
          key={iframeKey}
          src={embedSrc}
          title={title || 'Tour Virtual Pano2VR'}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            visibility: loading ? 'hidden' : 'visible',
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
          allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking; deviceorientation; geolocation"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allowFullScreen
        />
      )}

      {/* Fallback message if no valid source */}
      {!embedSrc && !loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.8)'
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Tour no disponible
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            La URL del tour no es válida o el archivo no está disponible.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Pano2VRViewer; 