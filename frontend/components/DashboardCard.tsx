import { colors, borderRadius, spacing, shadows } from '@/lib/design-system';

export function DashboardCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        padding: spacing[4] + 2,
        backgroundColor: colors.surface,
        boxShadow: shadows.lg,
      }}
    >
      <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[2] }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: colors.text }}>{value}</div>
    </div>
  );
}
