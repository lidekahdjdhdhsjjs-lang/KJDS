import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

export default function OpportunityDetailLoading() {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ marginBottom: spacing[6] }}>
        <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 32, width: '20%', marginBottom: spacing[2] }} />
        <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 16, width: '40%' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: spacing[4] }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5], minHeight: 100 }}>
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 12, width: '50%', marginBottom: spacing[3] }} />
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 20, width: '70%' }} />
          </div>
        ))}
      </div>
    </main>
  );
}
