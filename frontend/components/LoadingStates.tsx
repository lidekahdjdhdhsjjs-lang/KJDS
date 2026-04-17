'use client';

import { colors, borderRadius, spacing } from '@/lib/design-system';

export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          <div
            style={{
              height: 20,
              width: '40%',
              backgroundColor: colors.border,
              borderRadius: borderRadius.sm,
              marginBottom: spacing[3],
            }}
          />
          <div
            style={{
              height: 14,
              width: '60%',
              backgroundColor: colors.border,
              borderRadius: borderRadius.sm,
              marginBottom: spacing[2],
            }}
          />
          <div
            style={{
              height: 14,
              width: '50%',
              backgroundColor: colors.border,
              borderRadius: borderRadius.sm,
            }}
          />
        </div>
      ))}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[12],
        gap: spacing[4],
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${colors.border}`,
          borderTop: `3px solid ${colors.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: colors.textSecondary, fontSize: 14, margin: 0 }}>{message}</p>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function InlineLoading({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid rgba(255, 255, 255, 0.3)`,
        borderTop: '2px solid #fff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: 8,
        verticalAlign: 'middle',
      }}
    />
  );
}

export function SkeletonDetail() {
  return (
    <div style={{ padding: spacing[6] }}>
      <div
        style={{
          height: 32,
          width: '30%',
          backgroundColor: colors.border,
          borderRadius: borderRadius.base,
          marginBottom: spacing[6],
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: spacing[5],
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <div style={{ height: 14, width: '40%', backgroundColor: colors.border, borderRadius: borderRadius.sm, marginBottom: spacing[2] }} />
            <div style={{ height: 28, width: '60%', backgroundColor: colors.border, borderRadius: borderRadius.sm }} />
          </div>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: spacing[6] }}>
          <div
            style={{
              height: 24,
              width: '20%',
              backgroundColor: colors.border,
              borderRadius: borderRadius.sm,
              marginBottom: spacing[4],
            }}
          />
          <div
            style={{
              padding: spacing[4],
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ height: 14, width: '80%', backgroundColor: colors.border, borderRadius: borderRadius.sm, marginBottom: spacing[2] }} />
            <div style={{ height: 14, width: '60%', backgroundColor: colors.border, borderRadius: borderRadius.sm }} />
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: spacing[4],
          padding: `${spacing[3]}px ${spacing[4]}px`,
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              width: '60%',
              backgroundColor: colors.border,
              borderRadius: borderRadius.sm,
            }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: spacing[4],
            padding: `${spacing[3]}px ${spacing[4]}px`,
            borderBottom: `1px solid ${colors.border}`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                height: 14,
                width: colIndex === 0 ? '40%' : '70%',
                backgroundColor: colors.border,
                borderRadius: borderRadius.sm,
              }}
            />
          ))}
        </div>
      ))}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: spacing[12],
        textAlign: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface,
        border: `1px dashed ${colors.borderDark}`,
      }}
    >
      {icon && <div style={{ marginBottom: spacing[4] }}>{icon}</div>}
      <h3 style={{ margin: `0 0 ${spacing[2]}px`, color: colors.text, fontSize: 18 }}>{title}</h3>
      {description && (
        <p style={{ margin: `0 0 ${spacing[4]}px`, color: colors.textSecondary, fontSize: 14 }}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: `${spacing[2] + 2}px ${spacing[5]}px`,
            borderRadius: borderRadius.base,
            backgroundColor: colors.primary,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1], fontSize: 12, color: colors.textSecondary }}>
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: colors.border,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: colors.success,
            borderRadius: borderRadius.full,
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
    </div>
  );
}
