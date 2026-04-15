'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '80px auto' }}>
        <div style={{
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #fecaca',
          padding: 24,
        }}>
          <h2 style={{ color: '#991b1b', marginBottom: 12 }}>Dashboard Error</h2>
          <p style={{ color: '#7f1d1d', marginBottom: 16 }}>
            Something went wrong while loading the dashboard.
          </p>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
