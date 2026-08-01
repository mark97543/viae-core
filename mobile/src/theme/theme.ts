export const COLORS = {
  background: '#0a0f1d',
  surface: '#121a2d',
  surfaceBorder: '#1e293b',
  card: '#162036',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  primary: '#38bdf8',       // Tactical cyan
  primaryGlow: 'rgba(56, 189, 248, 0.2)',
  success: '#22c55e',       // Emerald green
  warning: '#eab308',       // Warning yellow
  danger: '#ef4444',        // Red
  accent: '#a855f7',         // Purple accent
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FONTS = {
  monospace: 'monospace',
  bold: '700',
  semiBold: '600',
  medium: '500',
  regular: '400',
} as const;
