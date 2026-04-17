'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { colors, borderRadius, shadows, spacing } from '@/lib/design-system';
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
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <p>Loading procurement drafts...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0 }}>Procurement Drafts</h1>
          <p style={{ margin: `${spacing[2]} 0 0`, color: colors.textSecondary }}>
            Manage procurement orders pending confirmation
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: `${spacing[2]} ${spacing[4]}`,
            borderRadius: borderRadius.base,
            backgroundColor: colors.primaryLight,
            color: colors.text,
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
            padding: spacing[4],
            marginBottom: spacing[4],
            borderRadius: borderRadius.base,
            backgroundColor: colors.errorLight,
            border: `1px solid ${colors.error}`,
            color: colors.error,
          }}
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Total Drafts</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.text }}>{drafts.length}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.warningLight}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Awaiting Confirmation</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.warning }}>{awaitingCount}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.successLight}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Confirmed</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.success }}>{confirmedCount}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Pending Value</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>
            ¥{totalValue.toLocaleString()}
          </div>
        </div>
      </section>

      {/* Filter */}
      <div style={{ marginBottom: spacing[6] }}>
        <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            borderRadius: borderRadius.base,
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
            padding: spacing[10],
            textAlign: 'center',
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px dashed ${colors.borderDark}`,
            color: colors.textSecondary,
          }}
        >
          No procurement drafts found. Drafts are created when opportunity items reach procurement stage.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: spacing[3] }}>
          {drafts.map((draft) => (
            <article
              key={draft.id}
              style={{
                padding: spacing[4],
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                boxShadow: shadows.base,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[4] }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', marginBottom: spacing[2] }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: borderRadius.sm,
                        backgroundColor: STATUS_COLORS[draft.status] || colors.textMuted,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {draft.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ marginBottom: spacing[2] }}>
                    <Link
                      href={`/opportunities/${draft.opportunity_item_id}`}
                      style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}
                    >
                      Item: {draft.opportunity_item_id}
                    </Link>
                  </div>
                  <div style={{ fontSize: 13, color: colors.text, display: 'grid', gap: spacing[1] }}>
                    <div><strong>Supplier:</strong> {draft.supplier_ref}</div>
                    <div><strong>Quantity:</strong> {draft.qty} units</div>
                    <div><strong>Unit Price:</strong> ¥{draft.purchase_price.toFixed(2)}</div>
                    <div><strong>Total:</strong> ¥{(draft.purchase_price * draft.qty).toFixed(2)}</div>
                  </div>
                  {draft.sku_payload && (
                    <details style={{ marginTop: spacing[3] }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, color: colors.primary }}>
                        View SKU Details
                      </summary>
                      <pre style={{
                        fontSize: 11,
                        backgroundColor: colors.background,
                        padding: spacing[3],
                        borderRadius: borderRadius.base,
                        marginTop: spacing[2],
                        overflow: 'auto',
                      }}>
                        {formatJson(draft.sku_payload)}
                      </pre>
                    </details>
                  )}
                  {draft.invalid_reason && (
                    <div style={{ marginTop: spacing[2], padding: spacing[2], borderRadius: borderRadius.sm, backgroundColor: colors.errorLight, color: colors.error, fontSize: 12 }}>
                      <strong>Invalidation Reason:</strong> {draft.invalid_reason}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: spacing[2] }}>
                    Created: {formatDate(draft.created_at)} · Updated: {formatDate(draft.updated_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {(draft.status === 'draft' || draft.status === 'awaiting_confirmation') && (
                    <>
                      <button
                        onClick={() => handleConfirm(draft.id)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: `${spacing[2]} ${spacing[4]}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: colors.success,
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
                          padding: `${spacing[2]} ${spacing[4]}`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: colors.error,
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
              padding: spacing[6],
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: `0 0 ${spacing[4]}` }}>Invalidate Draft</h3>
            <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
              Please provide a reason for invalidating this procurement draft:
            </p>
            <textarea
              value={invalidateReason}
              onChange={(e) => setInvalidateReason(e.target.value)}
              placeholder="e.g., Price increased, profit margin compromised"
              style={{
                width: '100%',
                padding: spacing[3],
                borderRadius: borderRadius.base,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                minHeight: 100,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[4], justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowInvalidateModal(null);
                  setInvalidateReason('');
                }}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.primaryLight,
                  color: colors.text,
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
                  padding: `${spacing[2]} ${spacing[4]}`,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.error,
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

      <div style={{ marginTop: spacing[6], fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </main>
  );
}
