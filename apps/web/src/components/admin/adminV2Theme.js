export const ADMIN_V2_COLORS = {
  gradient: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 45%, #415a77 100%)',
  gradientAccent: 'linear-gradient(120deg, rgba(94,155,255,0.9), rgba(164,221,255,0.35))',
  glow: 'rgba(94, 155, 255, 0.35)',
  textPrimary: '#e6ecf5',
  textSecondary: 'rgba(230, 236, 245, 0.72)',
  border: 'rgba(255, 255, 255, 0.18)',
  surface: 'rgba(13, 27, 42, 0.58)',
  surfaceSubtle: 'rgba(13, 27, 42, 0.42)',
  accent: '#5e9bff',
  accentMuted: 'rgba(94, 155, 255, 0.15)',
};

export const glassPanel = (overrides = {}) => ({
  background: ADMIN_V2_COLORS.surface,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: `1px solid ${ADMIN_V2_COLORS.border}`,
  boxShadow: '0 18px 45px rgba(5, 16, 31, 0.25)',
  borderRadius: 18,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(160deg, rgba(94,155,255,0.14), rgba(255,255,255,0.04))',
    opacity: 0.7,
    pointerEvents: 'none',
  },
  ...overrides,
});

export const glassCard = (overrides = {}) => ({
  ...glassPanel({
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(140deg, rgba(94,155,255,0.22), rgba(255,255,255,0.08))',
      opacity: 0.55,
      pointerEvents: 'none',
    },
  }),
  padding: 24,
  borderRadius: 20,
  border: `1px solid ${ADMIN_V2_COLORS.border}`,
  background: ADMIN_V2_COLORS.surfaceSubtle,
  boxShadow: '0 16px 40px rgba(8, 19, 38, 0.28)',
  ...overrides,
});

export const frostedDivider = {
  height: 1,
  width: '100%',
  background: 'rgba(255,255,255,0.08)',
  border: 0,
};

export const subtleGlow = {
  position: 'absolute',
  filter: 'blur(90px)',
  opacity: 0.4,
  borderRadius: '50%',
  pointerEvents: 'none',
};

export const glassScroll = (overrides = {}) => ({
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(94,155,255,0.5) transparent',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(94,155,255,0.38)',
    borderRadius: 3,
  },
  ...overrides,
});
