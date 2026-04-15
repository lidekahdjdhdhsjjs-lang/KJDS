export default function DashboardLoading() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Shopee AI Ops Console</h1>
          <p style={{ margin: 0, color: '#475569', maxWidth: 760 }}>
            Loading dashboard data...
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: 16,
              minHeight: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: 14,
            }}
          >
            Loading...
          </div>
        ))}
      </div>
    </main>
  );
}
