import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

export default function DashboardLoading() {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[5], flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: spacing[2] }}>Shopee AI Ops Console</h1>
          <p style={{ margin: 0, color: colors.textSecondary, maxWidth: 760 }}>
            Loading dashboard data...
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[4], marginTop: spacing[5] }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: colors.surface,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border}`,
              padding: spacing[4],
              minHeight: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        ))}
      </div>
    </main>
  );
}
