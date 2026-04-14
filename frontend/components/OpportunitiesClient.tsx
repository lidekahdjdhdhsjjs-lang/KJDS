'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowRight, Package } from 'lucide-react';
import { colors, borderRadius, shadows } from '@/lib/design-system';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type OpportunityItem = {
  id: string;
  batch_id: string;
  store_id: string;
  status: string;
  risk_level: number;
  score_total: number;
  current_supply_candidate_id: string | null;
  current_mapping_id: string | null;
  current_content_variant_id: string | null;
  current_pricing_decision_id: string | null;
  preflight_status: string | null;
  created_at: string;
  updated_at: string;
};

type OpportunityList = {
  items: OpportunityItem[];
  total: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  discovered: { label: 'Discovered', color: '#6366f1', bg: '#eef2ff', icon: <Package size={14} /> },
  supply_mapping: { label: 'Supply Mapping', color: '#f59e0b', bg: '#fffbeb', icon: <ArrowRight size={14} /> },
  content_variants: { label: 'Content Variants', color: '#3b82f6', bg: '#eff6ff', icon: <ArrowRight size={14} /> },
  pricing_decision: { label: 'Pricing Decision', color: '#8b5cf6', bg: '#f5f3ff', icon: <ArrowRight size={14} /> },
  preflight_check: { label: 'Preflight Check', color: '#06b6d4', bg: '#ecfeff', icon: <ArrowRight size={14} /> },
  pending_publish: { label: 'Pending Publish', color: '#f97316', bg: '#fff7ed', icon: <Clock size={14} /> },
  published: { label: 'Published', color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle size={14} /> },
  failed: { label: 'Failed', color: '#ef4444', bg: '#fef2f2', icon: <AlertTriangle size={14} /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: '#64748b', bg: '#f8fafc', icon: null };
}

async function fetchOpportunities(batchId?: string): Promise<OpportunityList> {
  const url = batchId ? `${API_BASE}/opportunities?batch_id=${batchId}` : `${API_BASE}/opportunities`;
  const response = await fetch(url, { cache: 'no-store' });
  const body: ApiResponse<OpportunityList> = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error || 'Failed to fetch opportunities');
  return body.data;
}

export function OpportunitiesClient() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated_at' | 'score_total' | 'created_at'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadData = async () => {
    try {
      setError(null);
      const data = await fetchOpportunities();
      setOpportunities(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = opportunities
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });

  const statusCounts = opportunities.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: colors.text }}>Opportunities</h1>
          <p style={{ color: colors.textSecondary, marginTop: 4 }}>共 {opportunities.length} 个商机，{statusCounts['published'] || 0} 个已发布</p>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '10px 20px',
            borderRadius: borderRadius.md,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RefreshCw size={16} /> 刷新
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, backgroundColor: colors.errorLight, border: `1px solid #fecaca`, borderRadius: borderRadius.md, marginBottom: 24 }}>
          <span style={{ color: colors.error, fontWeight: 600 }}>Error: {error}</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(STATUS_CONFIG).slice(0, 6).map(([status, config]) => (
          <div key={status} style={{ boxShadow: shadows.sm, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: 16, cursor: 'pointer', border: filterStatus === status ? `2px solid ${config.color}` : '2px solid transparent', transition: 'all 0.15s' }} onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: config.color }}>{config.icon}</span>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>{config.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: config.color }}>{statusCounts[status] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, fontSize: 14 }}
        >
          <option value="all">全部状态</option>
          {Object.entries(STATUS_CONFIG).map(([s, c]) => (
            <option key={s} value={s}>{c.label} ({statusCounts[s] || 0})</option>
          ))}
        </select>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={e => { const [b, o] = e.target.value.split('-'); setSortBy(b as typeof sortBy); setSortOrder(o as typeof sortOrder); }}
          style={{ padding: '8px 12px', borderRadius: borderRadius.md, border: `1px solid ${colors.border}`, fontSize: 14 }}
        >
          <option value="updated_at-desc">最近更新</option>
          <option value="created_at-desc">最新创建</option>
          <option value="score_total-desc">评分最高</option>
          <option value="score_total-asc">评分最低</option>
        </select>
        <span style={{ marginLeft: 'auto', color: colors.textSecondary, fontSize: 14 }}>
          显示 {filtered.length} / {opportunities.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: colors.surface, borderRadius: borderRadius.lg, boxShadow: shadows.sm, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>状态</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>店铺</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>批次</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>评分</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>更新时间</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: colors.textSecondary }}>暂无商机</td>
              </tr>
            ) : filtered.map((item, idx) => {
              const statusConfig = getStatusConfig(item.status);
              return (
                <tr key={item.id} style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, backgroundColor: statusConfig.bg, color: statusConfig.color, fontSize: 12, fontWeight: 600 }}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: colors.textSecondary }}>{item.store_id}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary }}>{item.batch_id.slice(0, 12)}...</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{item.score_total.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: colors.textSecondary }}>{new Date(item.updated_at).toLocaleString('zh-CN')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/opportunities/${item.id}`}
                      style={{ color: colors.primary, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                    >
                      查看 →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
