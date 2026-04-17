import { colors, borderRadius, spacing } from '@/lib/design-system';

export default function AgentRunsLoading() {
  const skeleton = {
    background: colors.background,
    borderRadius: borderRadius.base,
  };
  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[6] }}>
        <div>
          <div style={{ ...skeleton, height: 28, width: 120, marginBottom: spacing[2] }} />
          <div style={{ ...skeleton, height: 14, width: 200 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5], minHeight: 80 }}>
            <div style={{ ...skeleton, height: 12, width: '60%', marginBottom: spacing[3] }} />
            <div style={{ ...skeleton, height: 28, width: '40%' }} />
          </div>
        ))}
      </div>
      <div style={{ background: colors.surface, borderRadius: borderRadius.base, border: `1px solid ${colors.border}`, padding: spacing[5] }}>
        <div style={{ ...skeleton, height: 16, width: '30%', marginBottom: spacing[4] }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ ...skeleton, height: 48, marginBottom: spacing[2], background: colors.background }} />
        ))}
      </div>
    </main>
  );
}
