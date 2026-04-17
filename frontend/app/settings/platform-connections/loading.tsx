import { colors, borderRadius, spacing } from '@/lib/design-system';

export default function SettingsLoading() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <div style={{ maxWidth: 896, margin: '0 auto', padding: `${spacing[8]} ${spacing[4]}` }}>
        <header style={{ marginBottom: spacing[8], display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: colors.text }}>
              Platform Connections
            </h1>
            <p style={{ marginTop: spacing[1], fontSize: 14, color: colors.textSecondary }}>
              Loading connection status...
            </p>
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: colors.surface,
                borderRadius: borderRadius.base,
                border: `1px solid ${colors.border}`,
                padding: spacing[6],
                minHeight: 80,
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
      </div>
    </main>
  );
}
