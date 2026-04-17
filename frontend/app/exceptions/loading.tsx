import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

export default function ExceptionsLoading() {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[6] }}>
        <div>
          <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 28, width: 140, marginBottom: spacing[2] }} />
          <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 14, width: 240 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5], minHeight: 80 }}>
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 12, width: '60%', marginBottom: spacing[3] }} />
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 28, width: '40%' }} />
          </div>
        ))}
      </div>
      <div style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5] }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: colors.background, borderRadius: borderRadius.sm, height: 56, marginBottom: spacing[2] }} />
        ))}
      </div>
    </main>
  );
}
