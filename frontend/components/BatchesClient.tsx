'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorDisplay, getUserFriendlyError } from './ErrorBoundary';
import { colors, borderRadius, shadows } from '@/lib/design-system';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type Batch = {
  id: string;
  store_id: string;
  trigger_type: string;
  trigger_payload?: string | null;
  status: string;
  priority: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

type BatchList = {
  items: Batch[];
  total: number;
};

const STATUS_COLORS: Record<string, string> = {
  draft: colors.status.draft,
  queued: colors.status.queued,
  running: colors.status.running,
  paused: colors.status.paused,
  blocked: colors.status.blocked,
  completed: colors.status.completed,
  completed_with_issues: colors.status.completed_with_issues,
  failed: colors.status.failed,
  archived: colors.status.archived,
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || colors.status.draft;
}

async function fetchBatches(): Promise<BatchList> {
  const response = await fetch(`${API_BASE}/batches`, { cache: 'no-store' });
  const body: ApiResponse<BatchList> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to fetch batches');
  }
  return body.data;
}

async function createBatch(storeId: string): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store_id: storeId, trigger_type: 'manual' }),
  });
  const body: ApiResponse<Batch> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to create batch');
  }
  return body.data;
}

async function startBatch(batchId: string): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/start`, { method: 'POST' });
  const body: ApiResponse<Batch> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to start batch');
  }
  return body.data;
}

async function pauseBatch(batchId: string): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/pause`, { method: 'POST' });
  const body: ApiResponse<Batch> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to pause batch');
  }
  return body.data;
}

async function resumeBatch(batchId: string): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/resume`, { method: 'POST' });
  const body: ApiResponse<Batch> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to resume batch');
  }
  return body.data;
}

async function completeBatch(batchId: string): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/complete`, { method: 'POST' });
  const body: ApiResponse<Batch> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to complete batch');
  }
  return body.data;
}

export function BatchesClient() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await fetchBatches();
      setBatches(data.items);
      setError(null);
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBatches();
  }, []);

  const handleCreateBatch = async () => {
    try {
      setActionLoading('create');
      await createBatch('shopee-default-store');
      await loadBatches();
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchAction = async (batchId: string, action: 'start' | 'pause' | 'resume' | 'complete') => {
    try {
      setActionLoading(`${batchId}-${action}`);
      switch (action) {
        case 'start':
          await startBatch(batchId);
          break;
        case 'pause':
          await pauseBatch(batchId);
          break;
        case 'resume':
          await resumeBatch(batchId);
          break;
        case 'complete':
          await completeBatch(batchId);
          break;
      }
      await loadBatches();
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading batches...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Batch Dashboard</h1>
          <p style={{ margin: '8px 0 0', color: colors.textSecondary }}>
            Manage sourcing batches for opportunity item processing
          </p>
        </div>
        <button
          onClick={handleCreateBatch}
          disabled={actionLoading !== null}
          style={{
            padding: '10px 20px',
            borderRadius: borderRadius.base,
            backgroundColor: colors.primary,
            color: '#fff',
            border: 'none',
            cursor: actionLoading ? 'not-allowed' : 'pointer',
            opacity: actionLoading ? 0.7 : 1,
            fontWeight: 600,
          }}
        >
          {actionLoading === 'create' ? 'Creating...' : 'Create New Batch'}
        </button>
      </div>

      {error && (
        <ErrorDisplay error={error} onRetry={loadBatches} onDismiss={() => setError(null)} />
      )}

      {batches.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px dashed ${colors.borderDark}`,
            color: colors.textSecondary,
          }}
        >
          No batches yet. Create a new batch to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {batches.map((batch) => (
            <article
              key={batch.id}
              style={{
                padding: 20,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.base,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <Link
                    href={`/batches/${batch.id}`}
                    style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}
                  >
                    <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{batch.id}</h3>
                  </Link>
                  <div style={{ fontSize: 14, color: colors.textSecondary, display: 'grid', gap: 4 }}>
                    <div>Store: {batch.store_id}</div>
                    <div>Trigger: {batch.trigger_type}</div>
                    <div>Created: {formatDate(batch.created_at)}</div>
                    {batch.started_at && <div>Started: {formatDate(batch.started_at)}</div>}
                    {batch.completed_at && <div>Completed: {formatDate(batch.completed_at)}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      backgroundColor: getStatusColor(batch.status),
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {batch.status}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {batch.status === 'draft' && (
                      <button
                        onClick={() => handleBatchAction(batch.id, 'start')}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.success,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === `${batch.id}-start` ? 'Starting...' : 'Start'}
                      </button>
                    )}
                    {batch.status === 'running' && (
                      <button
                        onClick={() => handleBatchAction(batch.id, 'pause')}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.warning,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === `${batch.id}-pause` ? 'Pausing...' : 'Pause'}
                      </button>
                    )}
                    {batch.status === 'paused' && (
                      <button
                        onClick={() => handleBatchAction(batch.id, 'resume')}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.info,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === `${batch.id}-resume` ? 'Resuming...' : 'Resume'}
                      </button>
                    )}
                    {(batch.status === 'running' || batch.status === 'paused') && (
                      <button
                        onClick={() => handleBatchAction(batch.id, 'complete')}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.status.completed,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === `${batch.id}-complete` ? 'Completing...' : 'Complete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
