import { colors, borderRadius, spacing, typography } from '@/lib/design-system';
import { SkeletonCard } from '@/components/SkeletonPage';

export default function BatchesLoading() {
  return (
    <main style={{ padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[6] }}>
        <div>
          <SkeletonCard lines={2} minHeight="28px" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[4] }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5], minHeight: 120 }}>
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 20, width: '50%', marginBottom: spacing[3] }} />
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 14, width: '80%', marginBottom: spacing[2] }} />
            <div style={{ background: colors.background, borderRadius: borderRadius.sm, height: 14, width: '60%' }} />
          </div>
        ))}
      </div>
    </main>
  );
}
