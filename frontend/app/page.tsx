export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 32,
        fontFamily: 'Arial, sans-serif',
        background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', paddingTop: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginBottom: 12 }}>Internal operator MVP</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>Shopee AI Ops workflow for sourcing, review, and controlled publish.</h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: '#475569', marginTop: 18, maxWidth: 720 }}>
          This console is designed for beginner operators. Start from the dashboard to intake candidates, generate drafts, approve items, and publish approved listings through a supervised flow.
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            marginTop: 24,
            marginRight: 12,
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Open operator dashboard
        </a>
        <a
          href="/settings/platform-connections"
          style={{
            display: 'inline-block',
            marginTop: 24,
            padding: '12px 18px',
            borderRadius: 12,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Platform connections
        </a>
      </div>
    </main>
  );
}
