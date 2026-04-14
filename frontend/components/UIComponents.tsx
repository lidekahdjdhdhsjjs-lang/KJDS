'use client';

import { useEffect, useState } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setError(event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: 12,
          border: '1px solid #fecaca',
          margin: 24,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', color: '#b91c1c' }}>Something went wrong</h2>
        <p style={{ color: '#7f1d1d', marginBottom: 16 }}>
          {error?.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => {
            setHasError(false);
            setError(null);
            window.location.reload();
          }}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            backgroundColor: '#b91c1c',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '3px solid #e2e8f0',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    >
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
      }}
    >
      <LoadingSpinner size={40} />
      <p style={{ color: '#64748b', fontSize: 14 }}>{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
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
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📭</div>
      <h3 style={{ margin: '0 0 8px', color: '#334155' }}>{title}</h3>
      {description && (
        <p style={{ margin: '0 0 16px', color: '#64748b' }}>{description}</p>
      )}
      {action}
    </div>
  );
}

export function StatusBadge({
  status,
  color,
}: {
  status: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 6,
        backgroundColor: color,
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'capitalize',
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Card({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        border: '1px solid #e2e8f0',
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  color,
  subtext,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtext?: string;
}) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 12,
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: color || '#1e293b',
        }}
      >
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{subtext}</div>
      )}
    </div>
  );
}
