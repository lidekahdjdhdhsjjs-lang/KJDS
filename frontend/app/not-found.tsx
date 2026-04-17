import Link from 'next/link';
import { colors, borderRadius, spacing } from '@/lib/design-system';

export default function NotFound() {
  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: colors.border, marginBottom: spacing[4] }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: spacing[3] }}>Page Not Found</h1>
        <p style={{ color: colors.textSecondary, marginBottom: spacing[6] }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{ display: 'inline-block', padding: `${spacing[2]} ${spacing[6]}`, backgroundColor: colors.primary, color: colors.surface, borderRadius: borderRadius.base, textDecoration: 'none', fontWeight: 600 }}
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
