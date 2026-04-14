'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/batches', label: 'Batches' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/exceptions', label: 'Exceptions' },
  { href: '/agent-runs', label: 'Agents' },
  { href: '/procurement', label: 'Procurement' },
  { href: '/training-archive', label: 'Archive' },
  { href: '/settings/browser-profiles', label: 'Browser' },
  { href: '/settings/platform-connections', label: 'Settings' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <Link
        href="/"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
          textDecoration: 'none',
        }}
      >
        Shopee AI Ops
      </Link>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
