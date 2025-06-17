import { createTheme, alpha } from '@mui/material/styles';
import { tokens } from './tokens';

export const liquidGlassTheme = (mode = 'light') => {
  const isDark = mode === 'dark'; // currently unused as we force light but kept for flexibility
  const { colors } = tokens;

  const palette = isDark ? {
    mode,
    primary: {
      main: colors.accent,
      light: alpha(colors.accent, 0.7),
      dark: alpha(colors.accent, 0.4),
      contrastText: '#ffffff'
    },
    background: {
      default: colors.surface0,
      paper: 'rgba(22,27,34,0.8)'
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary
    },
    divider: 'rgba(255,255,255,0.12)'
  } : {
    mode,
    primary: {
      main: colors.accent,
      light: alpha(colors.accent,0.7),
      dark: alpha(colors.accent,0.5),
      contrastText: '#ffffff',
    },
    background: {
      default: colors.lightBg,
      paper: colors.lightPaper,
    },
    text: {
      primary: '#212121',
      secondary: '#555555',
    },
    divider: 'rgba(0,0,0,0.12)',
  };

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Clear Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      h1: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 300 },
      h2: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 300 },
      h3: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 500 },
      h6: { fontFamily: '"Source Code Pro", monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 500 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, color: palette.text.secondary },
      caption: { color: palette.text.secondary }
    },
    components: {
      MuiPaper: {
        variants: [
          {
            props: { variant: 'glass' },
            style: {
              backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${alpha('#FFFFFF', mode === 'light' ? 0.3 : 0.25)}`,
              boxShadow: mode === 'light' ? '0 8px 24px rgba(0,0,0,0.05)' : '0 6px 24px rgba(0,0,0,0.05)',
              borderRadius: 16,
            }
          }
        ],
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
          }
        }
      },
      MuiCard: {
        variants: [
          {
            props: { variant: 'glass' },
            style: {
              backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#ffffff', mode === 'light' ? 0.28 : 0.25)}`,
              borderRadius: 12,
              boxShadow: 'none',
            }
          }
        ],
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: alpha(palette.background.paper, 0.7),
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `0 0 2px ${alpha(colors.accent,0.12)}`,
            backgroundImage: 'linear-gradient(270deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01), rgba(255,255,255,0.04))',
            backgroundSize: '400% 400%',
            transition: 'box-shadow 1s cubic-bezier(0.4,0,0.2,1), background-image 1.2s ease-in-out',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
              transition: 'border-color 0.8s ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'transparent',
            },
            '&:hover': {
              boxShadow: `0 0 8px ${alpha('#ffffff',0.25)}`,
              backgroundImage: 'linear-gradient(270deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015), rgba(255,255,255,0.06))',
              backgroundSize: '400% 400%',
              animation: 'glassGlow 12s ease-in-out infinite'
            },
            '&.Mui-focused': {
              boxShadow: `0 0 12px ${alpha('#ffffff',0.35)}`,
              backgroundImage: 'linear-gradient(270deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025), rgba(255,255,255,0.09))',
              backgroundSize: '400% 400%',
              animation: 'glassGlow 10s ease-in-out infinite'
            },
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              pointerEvents: 'none',
              backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.15) 100%)',
              backgroundSize: '200% 100%',
              opacity: 0,
              transform: 'scale(0.97)',
              transition: 'opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1), background-position 5s ease',
            },
            '&:hover::before': {
              opacity: 0.35,
              transform: 'scale(1)',
              backgroundPosition: '180% 0',
            },
            '&.Mui-focused::before': {
              opacity: 0.5,
              transform: 'scale(1)',
              backgroundPosition: '180% 0',
            },
          }
        }
      },
      MuiCssBaseline: {
        styleOverrides: {
          '@keyframes glassGlow': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
          body: {
            backgroundColor: palette.background.default,
          },
          'h1, h2, h3, h4, h5, h6, p': {
            textShadow: 'none',
          },
          '*': { letterSpacing: '0.01em' },
        },
      },
    }
  });
}; 