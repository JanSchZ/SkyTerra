import { createTheme, alpha } from '@mui/material/styles';
import { tokens } from './tokens';

export const liquidGlassTheme = (mode = 'dark') => {
  const isDark = mode === 'dark';
  const { colors } = tokens;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent,
        light: alpha(colors.accent, 0.7),
        dark: alpha(colors.accent, 0.4),
        contrastText: isDark ? '#ffffff' : '#000000'
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
    },
    typography: {
      fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
      h1: { fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 300 },
      h2: { fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', fontWeight: 300 },
      h3: { fontWeight: 400 },
    },
    components: {
      MuiPaper: {
        variants: [
          {
            props: { variant: 'glass' },
            style: {
              backgroundColor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `1px solid ${alpha('#ffffff',0.25)}`,
            }
          }
        ],
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${alpha('#ffffff',0.15)}`
          }
        }
      },
      MuiCard: {
        variants: [
          {
            props: { variant: 'glass' },
            style: {
              backgroundColor: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: `1px solid ${alpha('#ffffff',0.25)}`,
              borderRadius: 12,
            }
          }
        ]
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
            backgroundColor: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
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
        },
      },
    }
  });
}; 