import { colors, borderRadius, spacing, shadows } from '@/lib/design-system';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: spacing[8],
        fontFamily: 'Arial, sans-serif',
        background: `linear-gradient(180deg, ${colors.primaryLight} 0%, ${colors.background} 100%)`,
        color: colors.text,
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', paddingTop: spacing[12] }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginBottom: spacing[3] }}>
          跨境电商 AI 运营系统
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>
          全自动选品、AI审核、一键发布到Shopee
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.7, color: colors.textSecondary, marginTop: spacing[4], maxWidth: 720 }}>
          无需编程经验！系统自动完成：采集1688商品 → AI评分选品 → 生成商品信息 → 合规审核 → 发布到Shopee店铺。有问题自动通知人工处理。
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spacing[4], marginTop: spacing[8] }}>
          <GuideCard
            step="1"
            title="🔗 连接店铺"
            desc="先连接你的Shopee店铺和1688账号"
            href="/settings/platform-connections"
            color={colors.warning}
          />
          <GuideCard
            step="2"
            title="📦 采集商品"
            desc="从1688自动采集商品数据"
            href="/dashboard"
            color={colors.primary}
          />
          <GuideCard
            step="3"
            title="⚡ 一键运营"
            desc="AI自动评分、生成内容、审核、发布"
            href="/quick-ops"
            color="#22c55e"
          />
          <GuideCard
            step="4"
            title="⚠️ 处理异常"
            desc="AI发现问题时通知你处理"
            href="/exceptions"
            color="#f59e0b"
          />
        </div>

        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginTop: spacing[8] }}>
          <a
            href="/quick-ops"
            style={{
              display: 'inline-block',
              padding: `${spacing[3]}px ${spacing[6]}px`,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.primary,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 18,
              boxShadow: shadows.md,
            }}
          >
            ⚡ 一键运营中心
          </a>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              padding: `${spacing[3]}px ${spacing[5]}px`,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              color: colors.text,
              textDecoration: 'none',
              fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}
          >
            📊 控制台
          </a>
          <a
            href="/opportunities"
            style={{
              display: 'inline-block',
              padding: `${spacing[3]}px ${spacing[5]}px`,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              color: colors.text,
              textDecoration: 'none',
              fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}
          >
            📦 商机管理
          </a>
        </div>
      </div>
    </main>
  );
}

function GuideCard({ step, title, desc, href, color }: { step: string; title: string; desc: string; href: string; color: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'block',
        padding: spacing[5],
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.sm,
        textDecoration: 'none',
        color: colors.text,
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color, marginBottom: spacing[1] }}>
        Step {step}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: spacing[1] }}>{title}</div>
      <div style={{ fontSize: 14, color: colors.textSecondary }}>{desc}</div>
    </a>
  );
}
