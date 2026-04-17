import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

interface SkeletonCardProps {
  lines?: number;
  minHeight?: string;
}

export function SkeletonCard({ lines = 3, minHeight = '80px' }: SkeletonCardProps) {
  return (
    <div style={{
      background: colors.surface,
      borderRadius: borderRadius.base,
      border: `1px solid ${colors.border}`,
      padding: spacing[5],
      minHeight,
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            background: colors.background,
            borderRadius: borderRadius.sm,
            height: i === 0 ? 12 : i === lines - 1 ? 14 : 20,
            width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%',
            marginBottom: i < lines - 1 ? spacing[2] : 0,
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonLineProps {
  width?: string;
  height?: number;
  mb?: keyof typeof spacing;
}

export function SkeletonLine({ width = '100%', height = 16, mb = 4 }: SkeletonLineProps) {
  return (
    <div style={{
      background: colors.background,
      borderRadius: borderRadius.sm,
      height,
      width,
      marginBottom: spacing[mb],
    }} />
  );
}

export function SkeletonStatCard() {
  return (
    <div style={{
      background: colors.surface,
      borderRadius: borderRadius.base,
      border: `1px solid ${colors.border}`,
      padding: spacing[5],
      minHeight: 80,
    }}>
      <div style={{
        background: colors.background,
        borderRadius: borderRadius.sm,
        height: 12,
        width: '60%',
        marginBottom: spacing[3],
      }} />
      <div style={{
        background: colors.background,
        borderRadius: borderRadius.sm,
        height: 28,
        width: '40%',
      }} />
    </div>
  );
}
