import React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Componente para renderizar un tour de Pano2VR en un iframe.
 * @param {string} src - La URL del index.html del tour.
 * @param {string} title - El título para el iframe (accesibilidad).
 * @param {object} sx - Estilos para el contenedor Box.
 */
const Pano2VRViewer = ({ src, title, sx }) => {
  const [loading, setLoading] = React.useState(true);

  // Asegurarse de que la URL tiene los parámetros para una mejor UX embebida.
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set('autoLoad', 'true');
    urlObj.searchParams.set('autoRotate', '0');
    return urlObj.toString();
  };
  
  const embedSrc = getEmbedUrl(src);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', ...sx }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.2)'
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <iframe
        src={embedSrc}
        title={title}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          visibility: loading ? 'hidden' : 'visible',
        }}
        allow="fullscreen; accelerometer; gyroscope; magnetometer; vr; xr-spatial-tracking"
        onLoad={() => setLoading(false)}
        allowFullScreen
      />
    </Box>
  );
};

export default Pano2VRViewer; 