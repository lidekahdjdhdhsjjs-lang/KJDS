'use client';

/**
 * Shared design tokens for consistent UI styling across all pages.
 * This ensures visual consistency without CSS-in-JS repetition.
 */

export const colors = {
  // Primary palette
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#dbeafe',

  // Status colors
  success: '#22c55e',
  successLight: '#dcfce7',
  successDark: '#166534',

  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#92400e',

  danger: '#ef4444',
  dangerLight: '#fef2f2',
  dangerDark: '#b91c1c',

  info: '#60a5fa',
  infoLight: '#eff6ff',
  infoDark: '#1e40af',

  // Neutral palette
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textLight: '#94a3b8',

  // Status-specific colors for batch/item states
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
    discovered: '#a78bfa',
    shortlisted: '#818cf8',
    sourcing_scored: '#6366f1',
    mapping_in_progress: '#8b5cf6',
    mapping_confirmed: '#7c3aed',
    content_generating: '#ec4899',
    pricing_ready: '#f472b6',
    review_passed: '#14b8a6',
    preflight_passed: '#10b981',
    publish_queued: '#0ea5e9',
    publishing: '#06b6d4',
    published: '#059669',
    rejected: '#dc2626',
    manual_required: '#ea580c',
    procurement_draft_ready: '#84cc16',
  },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
} as const;

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
  md: '0 2px 8px rgba(15, 23, 42, 0.06)',
  lg: '0 8px 24px rgba(15, 23, 42, 0.08)',
  xl: '0 8px 30px rgba(15, 23, 42, 0.12)',
} as const;

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSizeXs: '11px',
  fontSizeSm: '12px',
  fontSizeMd: '14px',
  fontSizeLg: '16px',
  fontSizeXl: '18px',
  fontSize2xl: '20px',
  fontSize3xl: '24px',
  fontSize4xl: '32px',
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightSemibold: 600,
  fontWeightBold: 700,
} as const;

// Common page layout styles
export const pageStyles = {
  main: {
    padding: spacing.xxl,
    fontFamily: typography.fontFamily,
    backgroundColor: colors.background,
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    flexWrap: 'wrap' as const,
    gap: spacing.lg,
  },
  title: {
    margin: 0,
    fontSize: typography.fontSize4xl,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  subtitle: {
    margin: `${spacing.sm} 0 0`,
    color: colors.textMuted,
    fontSize: typography.fontSizeMd,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    boxShadow: shadows.lg,
    border: `1px solid ${colors.border}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    margin: 0,
    fontSize: typography.fontSizeXl,
    fontWeight: typography.fontWeightSemibold,
    color: colors.textPrimary,
  },
  grid: {
    display: 'grid',
    gap: spacing.xl,
  },
  flexRow: {
    display: 'flex',
    gap: spacing.lg,
    flexWrap: 'wrap' as const,
  },
} as const;

// Button variants
export const buttonStyles = {
  primary: {
    padding: `${spacing.sm} ${spacing.xl}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    color: colors.surface,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeightSemibold,
    fontSize: typography.fontSizeSm,
    transition: 'all 0.15s ease',
  },
  success: {
    padding: `${spacing.sm} ${spacing.xl}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    color: colors.surface,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeightSemibold,
    fontSize: typography.fontSizeSm,
  },
  danger: {
    padding: `${spacing.sm} ${spacing.xl}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger,
    color: colors.surface,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeightSemibold,
    fontSize: typography.fontSizeSm,
  },
  neutral: {
    padding: `${spacing.sm} ${spacing.xl}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    color: colors.textSecondary,
    border: 'none',
    cursor: 'pointer',
    fontWeight: typography.fontWeightSemibold,
    fontSize: typography.fontSizeSm,
  },
  link: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.borderLight,
    color: colors.textSecondary,
    textDecoration: 'none',
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightSemibold,
  },
} as const;

// Get status color for any entity status
export function getStatusColor(status: string): string {
  return colors.status[status as keyof typeof colors.status] || colors.status.draft;
}

// Format status label for display
export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Common error display component style
export const errorStyles = {
  container: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dangerLight,
    border: `1px solid ${colors.dangerLight}`,
    color: colors.dangerDark,
  },
};

// Common loading state style
export const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: spacing.lg,
  },
  text: {
    color: colors.textMuted,
    fontSize: typography.fontSizeMd,
  },
};

// Empty state style
export const emptyStyles = {
  container: {
    padding: '48px',
    textAlign: 'center' as const,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    border: `1px dashed ${colors.border}`,
    color: colors.textMuted,
  },
  icon: {
    fontSize: '48px',
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  title: {
    margin: `0 0 ${spacing.sm}`,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightSemibold,
  },
  description: {
    margin: `0 0 ${spacing.lg}`,
    color: colors.textMuted,
  },
};
