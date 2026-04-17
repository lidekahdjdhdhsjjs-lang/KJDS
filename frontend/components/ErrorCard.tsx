import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

interface ErrorCardProps {
  title: string;
  description: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorCard({ title, description, error, reset }: ErrorCardProps) {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 600 }}>
        <div style={{
          background: colors.surface,
          borderRadius: borderRadius.base,
          border: `1px solid ${colors.errorLight}`,
          padding: spacing[6],
        }}>
          <h2 style={{ color: colors.error, marginBottom: spacing[3], fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
            {title}
          </h2>
          <p style={{ color: colors.text, marginBottom: spacing[4] }}>
            {description}
          </p>
          <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing[4] }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`,
              backgroundColor: colors.primary,
              color: '#fff',
              border: 'none',
              borderRadius: borderRadius.base,
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
