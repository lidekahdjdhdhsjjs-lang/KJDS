'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { colors, borderRadius, shadows } from '@/lib/design-system';

import { getUserFriendlyError } from './ErrorBoundary';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type ProcurementDraft = {
  id: string;
  opportunity_item_id: string;
  supplier_ref: string;
  sku_payload?: string | null;
  qty: number;
  purchase_price: number;
  status: string;
  invalid_reason?: string | null;
  created_at: string;
  updated_at: string;
};

type DraftList = {
  items: ProcurementDraft[];
  total: number;
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  awaiting_confirmation: '#f59e0b',
  confirmed: '#22c55e',
  invalidated: '#ef4444',
  cancelled: '#6b7280',
  archived: '#a1a1aa',
};

async function fetchDrafts(filters?: {
  status?: string;
}): Promise<DraftList> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);

  const url = `${API_BASE}/procurement-drafts${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  const body: ApiResponse<DraftList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

async function confirmDraft(draftId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/procurement-drafts/${draftId}/confirm`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to confirm draft');
  }
}

async function invalidateDraft(draftId: string, reason: string): Promise<void> {
  const response = await fetch(`${API_BASE}/procurement-drafts/${draftId}/invalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to invalidate draft');
  }
}

function formatJson(jsonStr: string | null | undefined): string {
  if (!jsonStr) return '-';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

export function ProcurementDraftsClient() {
  const [drafts, setDrafts] = useState<ProcurementDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [invalidateReason, setInvalidateReason] = useState<string>('');
  const [showInvalidateModal, setShowInvalidateModal] = useState<string | null>(null);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const data = await fetchDrafts({
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setDrafts(data.items);
      setError(null);
    } catch (err: unknown) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDrafts();
  }, [filterStatus]);

  const handleConfirm = async (draftId: string) => {
    try {
      setActionLoading(draftId);
      await confirmDraft(draftId);
      await loadDrafts();
    } catch (err: unknown) {
      setError(getUserFriendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvalidate = async (draftId: string) => {
    if (!invalidateReason.trim()) {
      setError('Please provide a reason for invalidation');
      return;
    }
    try {
      setActionLoading(draftId);
      await invalidateDraft(draftId, invalidateReason);
      setShowInvalidateModal(null);
      setInvalidateReason('');
      await loadDrafts();
    } catch (err: unknown) {
      setError(getUserFriendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Stats
  const awaitingCount = drafts.filter((d) => d.status === 'awaiting_confirmation').length;
  const draftCount = drafts.filter((d) => d.status === 'draft').length;
  const confirmedCount = drafts.filter((d) => d.status === 'confirmed').length;
  const totalValue = drafts
    .filter((d) => d.status === 'awaiting_confirmation' || d.status === 'draft')
    .reduce((sum, d) => sum + d.purchase_price * d.qty, 0);

  if (loading && drafts.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading procurement drafts...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Procurement Drafts</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            Manage procurement orders pending confirmation
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            backgroundColor: '#f1f5f9',
            color: '#475569',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Dashboard
        </Link>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Total Drafts</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>{drafts.length}</div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: '1px solid #fef3c7',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Awaiting Confirmation</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{awaitingCount}</div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: '1px solid #d1fae5',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Confirmed</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>{confirmedCount}</div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Pending Value</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            ¥{totalValue.toLocaleString()}
          </div>
        </div>
      </section>

      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="awaiting_confirmation">Awaiting Confirmation</option>
          <option value="confirmed">Confirmed</option>
          <option value="invalidated">Invalidated</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Drafts List */}
      {drafts.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: '1px dashed #cbd5e1',
            color: colors.textSecondary,
          }}
        >
          No procurement drafts found. Drafts are created when opportunity items reach procurement stage.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {drafts.map((draft) => (
            <article
              key={draft.id}
              style={{
                padding: 16,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.base,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: STATUS_COLORS[draft.status] || '#94a3b8',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {draft.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Link
                      href={`/opportunities/${draft.opportunity_item_id}`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Item: {draft.opportunity_item_id}
                    </Link>
                  </div>
                  <div style={{ fontSize: 13, color: colors.text, display: 'grid', gap: 4 }}>
                    <div><strong>Supplier:</strong> {draft.supplier_ref}</div>
                    <div><strong>Quantity:</strong> {draft.qty} units</div>
                    <div><strong>Unit Price:</strong> ¥{draft.purchase_price.toFixed(2)}</div>
                    <div><strong>Total:</strong> ¥{(draft.purchase_price * draft.qty).toFixed(2)}</div>
                  </div>
                  {draft.sku_payload && (
                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, color: '#2563eb' }}>
                        View SKU Details
                      </summary>
                      <pre style={{
                        fontSize: 11,
                        backgroundColor: '#f8fafc',
                        padding: 12,
                        borderRadius: 8,
                        marginTop: 8,
                        overflow: 'auto',
                      }}>
                        {formatJson(draft.sku_payload)}
                      </pre>
                    </details>
                  )}
                  {draft.invalid_reason && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>
                      <strong>Invalidation Reason:</strong> {draft.invalid_reason}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    Created: {formatDate(draft.created_at)} · Updated: {formatDate(draft.updated_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(draft.status === 'draft' || draft.status === 'awaiting_confirmation') && (
                    <>
                      <button
                        onClick={() => handleConfirm(draft.id)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          backgroundColor: '#22c55e',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === draft.id ? 'Processing...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setShowInvalidateModal(draft.id)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Invalidate
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Invalidation Modal */}
      {showInvalidateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowInvalidateModal(null)}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px' }}>Invalidate Draft</h3>
            <p style={{ color: colors.textSecondary, marginBottom: 16 }}>
              Please provide a reason for invalidating this procurement draft:
            </p>
            <textarea
              value={invalidateReason}
              onChange={(e) => setInvalidateReason(e.target.value)}
              placeholder="e.g., Price increased, profit margin compromised"
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                minHeight: 100,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowInvalidateModal(null);
                  setInvalidateReason('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleInvalidate(showInvalidateModal)}
                disabled={actionLoading !== null || !invalidateReason.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: invalidateReason.trim() ? 1 : 0.5,
                }}
              >
                {actionLoading ? 'Processing...' : 'Invalidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </main>
  );
}
