'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from './LoadingStates';
import { ErrorDisplay, getUserFriendlyError } from './ErrorBoundary';
import { colors, borderRadius, shadows, typography, spacing, commonStyles } from '@/lib/design-system';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type Item = {
  id: string;
  batch_id: string;
  store_id: string;
  status: string;
  risk_level: number;
  score_total: number;
  current_supply_candidate_id?: string | null;
  current_mapping_id?: string | null;
  current_content_variant_id?: string | null;
  current_pricing_decision_id?: string | null;
  preflight_status?: string | null;
  created_at: string;
  updated_at: string;
};

type ItemList = {
  items: Item[];
  total: number;
};

type BatchWithStatusCounts = {
  id: string;
  store_id: string;
  trigger_type: string;
  status: string;
  priority: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  status_counts: Record<string, number>;
};

const STATUS_STAGES = [
  'discovered',
  'shortlisted',
  'sourcing_scored',
  'mapping_in_progress',
  'mapping_confirmed',
  'content_generating',
  'pricing_ready',
  'review_passed',
  'preflight_passed',
  'publish_queued',
  'publishing',
  'published',
];

const STAGE_COLORS: Record<string, string> = {
  discovered: colors.status.draft,
  shortlisted: colors.status.queued,
  sourcing_scored: '#a78bfa',
  mapping_in_progress: '#f472b6',
  mapping_confirmed: colors.status.running,
  content_generating: colors.status.paused,
  pricing_ready: colors.status.completed,
  review_passed: '#22d3ee',
  preflight_passed: colors.status.completed,
  publish_queued: colors.warning,
  publishing: '#f43f5e',
  published: colors.status.completed,
  blocked: colors.status.blocked,
  rejected: colors.status.failed,
  manual_required: colors.status.archived,
};

const RISK_COLORS: Record<number, string> = {
  0: colors.success,
  1: colors.warning,
  2: colors.warning,
  3: colors.error,
};

function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] || '#94a3b8';
}

function getRiskColor(risk: number): string {
  return RISK_COLORS[Math.min(risk, 3)] || '#22c55e';
}

async function fetchBatch(batchId: string): Promise<BatchWithStatusCounts> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/status`, { cache: 'no-store' });
  const body: ApiResponse<BatchWithStatusCounts> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to fetch batch');
  }
  return body.data;
}

async function fetchItems(batchId: string): Promise<ItemList> {
  const response = await fetch(`${API_BASE}/opportunities?batch_id=${batchId}`, { cache: 'no-store' });
  const body: ApiResponse<ItemList> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to fetch items');
  }
  return body.data;
}

async function advanceItem(itemId: string, status: string): Promise<Item> {
  const response = await fetch(`${API_BASE}/opportunities/${itemId}/advance/${status}`, { method: 'POST' });
  const body: ApiResponse<Item> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || `Failed to advance item to ${status}`);
  }
  return body.data;
}

export function BatchDetailClient() {
  const params = useParams();
  const batchId = params?.id as string;

  const [batch, setBatch] = useState<BatchWithStatusCounts | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      const [batchData, itemsData] = await Promise.all([fetchBatch(batchId), fetchItems(batchId)]);
      setBatch(batchData);
      setItems(itemsData.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [batchId]);

  const handleAdvance = async (itemId: string, status: string) => {
    try {
      setActionLoading(`${itemId}-${status}`);
      await advanceItem(itemId, status);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance item');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const filteredItems = stageFilter === 'all'
    ? items
    : items.filter((item) => item.status === stageFilter);

  const totalItems = items.length;
  const statusCounts = batch?.status_counts || {};

  if (loading) {
    return <LoadingSpinner message="Loading batch details..." />;
  }

  if (!batch) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Batch not found</p>
        <Link href="/batches" style={{ color: '#2563eb' }}>Back to Batches</Link>
      </div>
    );
  }

  return (
    <main style={commonStyles.pageContainer as React.CSSProperties}>
      <div style={{ marginBottom: spacing[6] }}>
        <Link href="/batches" style={{ color: colors.textSecondary, textDecoration: 'none' }}>
          ← Back to Batches
        </Link>
      </div>

      <div style={{ ...commonStyles.pageHeader, marginBottom: spacing[6] } as React.CSSProperties}>
        <div>
          <h1 style={commonStyles.pageTitle as React.CSSProperties}>{batch.id}</h1>
          <div style={{ ...commonStyles.pageDescription, marginTop: spacing[2] } as React.CSSProperties}>
            <div>Store: {batch.store_id} · Trigger: {batch.trigger_type}</div>
            <div>Created: {formatDate(batch.created_at)}</div>
            {batch.started_at && <div>Started: {formatDate(batch.started_at)}</div>}
            {batch.completed_at && <div>Completed: {formatDate(batch.completed_at)}</div>}
          </div>
        </div>
        <span
          style={{
            ...commonStyles.badge,
            backgroundColor: getStageColor(batch.status),
            color: '#fff',
          }}
        >
          {batch.status}
        </span>
      </div>

      {error && (
        <ErrorDisplay error={error} onRetry={loadData} onDismiss={() => setError(null)} />
      )}

      {/* Stage Overview */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Stage Overview</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_STAGES.map((stage) => {
            const count = statusCounts[stage] || 0;
            const isActive = stageFilter === stage;

            return (
              <button
                key={stage}
                onClick={() => setStageFilter(isActive ? 'all' : stage)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: isActive ? `2px solid ${getStageColor(stage)}` : '1px solid #e2e8f0',
                  backgroundColor: isActive ? `${getStageColor(stage)}20` : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>
                  {stage.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: getStageColor(stage) }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Items List */}
      <section>
        <div style={{ ...commonStyles.pageHeader, marginBottom: spacing[4] } as React.CSSProperties}>
          <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Items ({filteredItems.length}/{totalItems})</h2>
          {stageFilter !== 'all' && (
            <button
              onClick={() => setStageFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                backgroundColor: '#f1f5f9',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Clear filter
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              borderRadius: borderRadius.lg,
              backgroundColor: colors.surface,
              border: `1px dashed ${colors.border}`,
              color: colors.textSecondary,
            }}
          >
            {stageFilter === 'all' ? 'No items in this batch yet.' : `No items in "${stageFilter}" stage.`}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {filteredItems.map((item) => (
              <article
                key={item.id}
                style={{
                  padding: spacing[4],
                  borderRadius: borderRadius.lg,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  display: 'grid',
                  gap: spacing[3],
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Link
                      href={`/opportunities/${item.id}`}
                      style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {item.id}
                    </Link>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing[1] }}>
                      Score: {item.score_total.toFixed(1)} · Created: {formatDate(item.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: borderRadius.sm,
                        backgroundColor: getRiskColor(item.risk_level),
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Risk {item.risk_level}
                    </span>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: borderRadius.sm,
                        backgroundColor: getStageColor(item.status),
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {item.status === 'discovered' && (
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <button
                      onClick={() => handleAdvance(item.id, 'shortlisted')}
                      disabled={actionLoading !== null}
                      style={{
                        padding: '6px 12px',
                        borderRadius: borderRadius.md,
                        backgroundColor: colors.success,
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      {actionLoading === `${item.id}-shortlisted` ? 'Advancing...' : 'Shortlist'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
