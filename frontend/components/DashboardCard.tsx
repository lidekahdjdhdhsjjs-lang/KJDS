export function DashboardCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: '1px solid #dbe3ef',
        borderRadius: 16,
        padding: 18,
        backgroundColor: '#fff',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
}
