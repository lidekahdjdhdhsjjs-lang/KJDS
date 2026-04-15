export default function SettingsLoading() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 16px' }}>
        <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#111827' }}>
              Platform Connections
            </h1>
            <p style={{ marginTop: 4, fontSize: 14, color: '#6b7280' }}>
              Loading connection status...
            </p>
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                padding: 24,
                minHeight: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              Loading...
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
