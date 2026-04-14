'use client';

import { CSSProperties } from 'react';

// Skeleton loading component for cards
export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          <div
            style={{
              height: 20,
              width: '40%',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              height: 14,
              width: '60%',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 14,
              width: '50%',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
            }}
          />
        </div>
      ))}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

// Full page loading spinner
export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{message}</p>
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Inline loading for buttons
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

// Skeleton for detail pages
export function SkeletonDetail() {
  return (
    <div style={{ padding: 24 }}>
      {/* Header skeleton */}
      <div
        style={{
          height: 32,
          width: '30%',
          backgroundColor: '#e2e8f0',
          borderRadius: 8,
          marginBottom: 24,
        }}
      />

      {/* Info cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            <div style={{ height: 14, width: '40%', backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 28, width: '60%', backgroundColor: '#e2e8f0', borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Section skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div
            style={{
              height: 24,
              width: '20%',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
              marginBottom: 16,
            }}
          />
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ height: 14, width: '80%', backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 14, width: '60%', backgroundColor: '#e2e8f0', borderRadius: 4 }} />
          </div>
        </div>
      ))}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

// Table skeleton
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 16,
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 14,
              width: '60%',
              backgroundColor: '#e2e8f0',
              borderRadius: 4,
            }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 16,
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              style={{
                height: 14,
                width: colIndex === 0 ? '40%' : '70%',
                backgroundColor: '#e2e8f0',
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      ))}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

// Empty state component
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
        padding: 48,
        textAlign: 'center',
        borderRadius: 12,
        backgroundColor: '#fff',
        border: '1px dashed #cbd5e1',
      }}
    >
      {icon && <div style={{ marginBottom: 16 }}>{icon}</div>}
      <h3 style={{ margin: '0 0 8px', color: '#334155', fontSize: 18 }}>{title}</h3>
      {description && (
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            backgroundColor: '#2563eb',
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

// Progress bar for batch status
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#64748b' }}>
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: '#e2e8f0',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: '#22c55e',
            borderRadius: 999,
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
    </div>
  );
}
