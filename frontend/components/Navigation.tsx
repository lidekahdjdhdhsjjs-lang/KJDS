'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius, spacing } from '@/lib/design-system';

const NAV_ITEMS = [
  { href: '/dashboard', label: '🏠 控制台' },
  { href: '/quick-ops', label: '⚡ 一键运营' },
  { href: '/opportunities', label: '📦 商机管理' },
  { href: '/batches', label: '📋 批次管理' },
  { href: '/exceptions', label: '⚠️ 异常中心' },
  { href: '/procurement', label: '🛒 采购单' },
  { href: '/agent-runs', label: '🤖 AI任务' },
  { href: '/settings/config-center', label: '⚙️ 设置' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing[2]}px ${spacing[4]}px`,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
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
          color: colors.text,
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
                padding: `${spacing[1]}px ${spacing[2]}px`,
                borderRadius: borderRadius.md,
                backgroundColor: isActive ? colors.primaryLight : 'transparent',
                color: isActive ? colors.primary : colors.textSecondary,
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
