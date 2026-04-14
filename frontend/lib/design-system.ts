/**
 * Design System - Centralized styling tokens and components
 *
 * This module provides consistent styling across all pages.
 * Import from this file instead of hardcoding values.
 */

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Primary
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#dbeafe',

  // Semantic
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f97316',
  warningLight: '#fed7aa',
  error: '#dc2626',
  errorLight: '#fef2f2',
  info: '#0ea5e9',
  infoLight: '#e0f2fe',

  // Neutrals
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderDark: '#cbd5e1',

  // Status colors
  status: {
    draft: '#94a3b8',
    queued: '#60a5fa',
    running: '#22c55e',
    paused: '#f59e0b',
    blocked: '#ef4444',
    completed: '#10b981',
    completed_with_issues: '#f97316',
    failed: '#dc2626',
    archived: '#6b7280',
  },
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  fontFamily: 'Arial, sans-serif',
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// Spacing
// ============================================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

// ============================================================================
// Shadows
// ============================================================================

export const shadows = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
  base: '0 2px 8px rgba(15, 23, 42, 0.04)',
  md: '0 4px 12px rgba(15, 23, 42, 0.08)',
  lg: '0 8px 24px rgba(15, 23, 42, 0.12)',
} as const;

// ============================================================================
// Transitions
// ============================================================================

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const;

// ============================================================================
// Common Styles
// ============================================================================

export const commonStyles = {
  // Page container
  pageContainer: {
    padding: spacing[6],
    fontFamily: typography.fontFamily,
    backgroundColor: colors.background,
    minHeight: '100vh',
  },

  // Card
  card: {
    padding: spacing[5],
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.sm,
  },

  // Page header section
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
    flexWrap: 'wrap',
    gap: spacing[3],
  },

  // Page title
  pageTitle: {
    margin: 0,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  // Page description
  pageDescription: {
    margin: `${spacing[2]} 0 0`,
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    maxWidth: '760px',
  },

  // Loading container
  loadingContainer: {
    padding: spacing[6],
    textAlign: 'center',
    color: colors.textSecondary,
  },

  // Button base
  buttonBase: {
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borderRadius.base,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    transition: transitions.fast,
  },

  // Primary button
  primaryButton: {
    backgroundColor: colors.primary,
    color: '#fff',
  },

  // Secondary button
  secondaryButton: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },

  // Success button
  successButton: {
    backgroundColor: colors.success,
    color: '#fff',
  },

  // Warning button
  warningButton: {
    backgroundColor: colors.warning,
    color: '#fff',
  },

  // Error button
  errorButton: {
    backgroundColor: colors.error,
    color: '#fff',
  },

  // Input base
  inputBase: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    borderRadius: borderRadius.base,
    border: `1px solid ${colors.borderDark}`,
    fontSize: typography.fontSize.sm,
    outline: 'none',
    transition: transitions.fast,
  },

  // Label
  label: {
    display: 'block',
    marginBottom: spacing[1],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  // Error message
  errorMessage: {
    margin: `${spacing[1]} 0 0`,
    fontSize: typography.fontSize.xs,
    color: colors.error,
  },

  // Badge
  badge: {
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase' as const,
  },

  // Section header
  sectionHeader: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing[4],
  },

  // Subsection header
  subsectionHeader: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing[3],
  },
} as const;

// ============================================================================
// Status Color Helper
// ============================================================================

export function getStatusColor(status: string): string {
  return colors.status[status as keyof typeof colors.status] || colors.status.draft;
}

export function getStatusStyle(status: string): React.CSSProperties {
  return {
    ...commonStyles.badge,
    backgroundColor: getStatusColor(status),
    color: '#fff',
  };
}

// ============================================================================
// CSS Properties Type Helper
// ============================================================================

export type CSSProperties = React.CSSProperties;
