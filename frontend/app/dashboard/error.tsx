'use client';

import { colors, borderRadius, spacing } from '@/lib/design-system';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '80px auto' }}>
        <div style={{
          background: colors.surface,
          borderRadius: borderRadius.base,
          border: `1px solid ${colors.error}`,
          padding: spacing[6],
        }}>
          <h2 style={{ color: colors.error, marginBottom: spacing[3] }}>Dashboard Error</h2>
          <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
            Something went wrong while loading the dashboard.
          </p>
          <p style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing[4] }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              backgroundColor: colors.primary,
              color: colors.surface,
              border: 'none',
              borderRadius: borderRadius.sm,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
