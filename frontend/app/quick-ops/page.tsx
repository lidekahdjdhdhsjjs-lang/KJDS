'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, borderRadius, spacing, shadows } from '@/lib/design-system';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PipelineStep {
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'running' | 'pending';
  reason?: string;
  [key: string]: unknown;
}

interface PipelineResult {
  item_id: string;
  status: 'success' | 'needs_human' | 'error';
  steps: PipelineStep[];
}

interface OpportunityItem {
  id: string;
  batch_id: string;
  store_id: string;
  status: string;
  score_total: number;
  risk_level: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  discovered: '🔍 已发现',
  shortlisted: '📌 已入围',
  sourcing_scored: '📊 已评分',
  mapping_in_progress: '🗺️ 类目映射中',
  mapping_confirmed: '✅ 类目已确认',
  content_generating: '✍️ 内容生成中',
  pricing_ready: '💰 定价就绪',
  review_passed: '✅ 审核通过',
  preflight_passed: '🚀 预检通过',
  publish_queued: '📤 排队发布中',
  publishing: '📤 发布中',
  published: '🎉 已发布',
  blocked: '🚫 已阻塞',
  manual_required: '👤 需人工处理',
  rejected: '❌ 已拒绝',
  archived: '📦 已归档',
};

const STEP_LABELS: Record<string, string> = {
  auto_score: 'AI自动评分',
  auto_map_category: 'AI类目映射',
  auto_generate_content: 'AI内容生成',
  auto_pricing: 'AI自动定价',
  auto_review: 'AI合规审核',
  preflight_check: '发布预检',
  auto_publish: '自动发布',
};

export default function QuickOpsPage() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PipelineResult>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/opportunities?limit=50`);
      if (!res.ok) throw new Error('获取数据失败');
      const json = await res.json();
      setItems(json.data?.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const runPipeline = async (itemId: string) => {
    setRunning(itemId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/pipeline/run/${itemId}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setResults(prev => ({ ...prev, [itemId]: json.data }));
      } else {
        setError(json.detail || '执行失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setRunning(null);
      fetchItems();
    }
  };

  const runBatchPipeline = async () => {
    const pendingItems = items.filter(i =>
      !['published', 'archived', 'rejected'].includes(i.status)
    );
    if (pendingItems.length === 0) {
      setError('没有可处理的商品');
      return;
    }
    setRunning('batch');
    setError(null);
    try {
      const batchId = pendingItems[0].batch_id;
      const res = await fetch(`${API_BASE}/api/v1/pipeline/run-batch/${batchId}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const batchResults: Record<string, PipelineResult> = {};
        (json.data.results || []).forEach((r: PipelineResult) => {
          batchResults[r.item_id] = r;
        });
        setResults(prev => ({ ...prev, ...batchResults }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
    } finally {
      setRunning(null);
      fetchItems();
    }
  };

  const pendingCount = items.filter(i =>
    !['published', 'archived', 'rejected'].includes(i.status)
  ).length;

  const publishedCount = items.filter(i => i.status === 'published').length;
  const needsHumanCount = items.filter(i =>
    ['blocked', 'manual_required'].includes(i.status)
  ).length;

  if (loading) {
    return (
      <div style={{ padding: spacing[8], textAlign: 'center' }}>
        <p style={{ fontSize: 18, color: colors.textSecondary }}>⏳ 加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing[6], maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: colors.text, marginBottom: spacing[2] }}>
        ⚡ 一键运营中心
      </h1>
      <p style={{ fontSize: 16, color: colors.textSecondary, marginBottom: spacing[6] }}>
        全自动：选品评分 → AI生成内容 → 合规审核 → 发布到Shopee。有问题自动通知人工处理。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[6] }}>
        <StatCard label="待处理" value={pendingCount} icon="📦" color={colors.primary} />
        <StatCard label="已发布" value={publishedCount} icon="🎉" color="#22c55e" />
        <StatCard label="需人工处理" value={needsHumanCount} icon="👤" color="#f59e0b" />
        <StatCard label="总商品数" value={items.length} icon="📊" color={colors.textSecondary} />
      </div>

      <div style={{ marginBottom: spacing[6] }}>
        <button
          onClick={runBatchPipeline}
          disabled={running === 'batch' || pendingCount === 0}
          style={{
            padding: `${spacing[3]}px ${spacing[6]}px`,
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: running === 'batch' ? colors.textSecondary : colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: borderRadius.lg,
            cursor: running === 'batch' ? 'not-allowed' : 'pointer',
            boxShadow: shadows.md,
            transition: 'all 0.2s ease',
          }}
        >
          {running === 'batch' ? '⏳ 正在批量处理...' : `🚀 一键处理全部 (${pendingCount}个商品)`}
        </button>
      </div>

      {error && (
        <div style={{
          padding: spacing[3],
          backgroundColor: '#fef2f2',
          border: `1px solid #fecaca`,
          borderRadius: borderRadius.md,
          color: '#dc2626',
          marginBottom: spacing[4],
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              running={running === item.id}
              result={results[item.id]}
              onRun={() => runPipeline(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div style={{
      padding: spacing[4],
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      boxShadow: shadows.sm,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, marginBottom: spacing[1] }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 14, color: colors.textSecondary }}>{label}</div>
    </div>
  );
}

function ItemCard({ item, running, result, onRun }: {
  item: OpportunityItem;
  running: boolean;
  result?: PipelineResult;
  onRun: () => void;
}) {
  const statusLabel = STATUS_LABELS[item.status] || item.status;
  const isDone = ['published', 'archived', 'rejected'].includes(item.status);
  const needsHuman = ['blocked', 'manual_required'].includes(item.status);

  return (
    <div style={{
      padding: spacing[4],
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      boxShadow: shadows.sm,
      borderLeft: `4px solid ${needsHuman ? '#f59e0b' : isDone ? '#22c55e' : colors.primary}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
            商品 {item.id.slice(0, 8)}...
            <span style={{
              marginLeft: spacing[2],
              fontSize: 13,
              padding: '2px 8px',
              borderRadius: borderRadius.full,
              backgroundColor: needsHuman ? '#fef3c7' : isDone ? '#dcfce7' : `${colors.primaryLight}`,
              color: needsHuman ? '#92400e' : isDone ? '#166534' : colors.primary,
            }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            店铺: {item.store_id} | 评分: {item.score_total.toFixed(1)} | 风险: {item.risk_level}
          </div>
        </div>

        {!isDone && (
          <button
            onClick={onRun}
            disabled={running}
            style={{
              padding: `${spacing[2]}px ${spacing[4]}px`,
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: running ? colors.textSecondary : colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: running ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? '⏳ 处理中...' : needsHuman ? '👤 重新处理' : '▶️ 自动处理'}
          </button>
        )}
      </div>

      {result && (
        <div style={{ marginTop: spacing[3], padding: spacing[3], backgroundColor: colors.background, borderRadius: borderRadius.md }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: spacing[2] }}>
            处理结果: {result.status === 'success' ? '✅ 全部通过' : result.status === 'needs_human' ? '⚠️ 需要人工处理' : '❌ 失败'}
          </div>
          {result.steps.map((step, i) => (
            <div key={i} style={{ fontSize: 13, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : step.status === 'skipped' ? '⏭️' : '⏳'}</span>
              <span style={{ color: colors.text }}>{STEP_LABELS[step.name] || step.name}</span>
              {step.reason && (
                <span style={{ color: colors.textSecondary, fontSize: 12 }}>({step.reason})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      padding: spacing[8],
      textAlign: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      boxShadow: shadows.sm,
    }}>
      <div style={{ fontSize: 48, marginBottom: spacing[4] }}>📦</div>
      <h3 style={{ fontSize: 18, color: colors.text, marginBottom: spacing[2] }}>还没有商品数据</h3>
      <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
        先去控制台采集商品，然后回来一键处理
      </p>
      <a
        href="/dashboard"
        style={{
          display: 'inline-block',
          padding: `${spacing[2]}px ${spacing[4]}px`,
          backgroundColor: colors.primary,
          color: 'white',
          borderRadius: borderRadius.md,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        去控制台采集 →
      </a>
    </div>
  );
}
