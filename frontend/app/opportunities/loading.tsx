import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

export default function OpportunitiesLoading() {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[6] }}>
        <div>
          <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 28, width: 120, marginBottom: spacing[2] }} />
          <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 14, width: 200 }} />
        </div>
      </div>
      <div style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: colors.background, borderRadius: borderRadius.sm, height: 64, marginBottom: spacing[2] }} />
        ))}
      </div>
    </main>
  );
}
