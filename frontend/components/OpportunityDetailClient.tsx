'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from './LoadingStates';
import { ErrorDisplay } from './ErrorBoundary';
import { colors, borderRadius, shadows, spacing, commonStyles } from '@/lib/design-system';

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

type SupplyCandidate = {
  id: string;
  opportunity_item_id: string;
  source_platform: string;
  source_item_ref: string;
  supplier_ref?: string | null;
  cost_amount: number;
  moq: number;
  ship_from?: string | null;
  reliability_score: number;
  image_quality_score: number;
  status: string;
  created_at: string;
};

type CategoryMapping = {
  id: string;
  opportunity_item_id: string;
  category_ref: string;
  attributes_payload: string;
  variation_payload?: string | null;
  confidence_score: number;
  evidence_payload?: string | null;
  status: string;
  created_at: string;
};

type ContentVariant = {
  id: string;
  opportunity_item_id: string;
  title: string;
  bullet_points?: string | null;
  image_bundle_ref?: string | null;
  template_ref?: string | null;
  locale: string;
  version_no: number;
  status: string;
  created_at: string;
};

type PricingDecision = {
  id: string;
  opportunity_item_id: string;
  cost_payload: string;
  fee_payload: string;
  exchange_rate_payload: string;
  competitor_band_payload?: string | null;
  suggested_price: number;
  final_price?: number | null;
  min_profit_line: number;
  decision_reason?: string | null;
  status: string;
  created_at: string;
};

type PreflightCheck = {
  id: string;
  opportunity_item_id: string;
  profit_check: string;
  compliance_check: string;
  supply_check: string;
  account_health_check: string;
  overall_result: string;
  detail_payload: string;
  created_at: string;
};

type DemandSignal = {
  id: string;
  opportunity_item_id: string;
  signal_type: string;
  source: string;
  payload: string;
  snapshot_time: string;
};

type ItemDetail = {
  item: Item;
  supply_candidates: SupplyCandidate[];
  current_supply_candidate?: SupplyCandidate | null;
  mappings: CategoryMapping[];
  current_mapping?: CategoryMapping | null;
  content_variants: ContentVariant[];
  current_content_variant?: ContentVariant | null;
  pricing_decisions: PricingDecision[];
  current_pricing_decision?: PricingDecision | null;
  preflight_checks: PreflightCheck[];
  demand_signals: DemandSignal[];
};

async function fetchItemDetail(itemId: string): Promise<ItemDetail> {
  const response = await fetch(`${API_BASE}/opportunities/${itemId}/detail`, { cache: 'no-store' });
  const body: ApiResponse<ItemDetail> = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(body.error || 'Failed to fetch item detail');
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

const STATUS_COLORS: Record<string, string> = {
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

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#94a3b8';
}

function formatJson(jsonStr: string | null | undefined): string {
  if (!jsonStr) return '-';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

export function OpportunityDetailClient() {
  const params = useParams();
  const itemId = params?.id as string;

  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    if (!itemId) return;
    try {
      setLoading(true);
      const data = await fetchItemDetail(itemId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [itemId]);

  const handleAdvance = async (status: string) => {
    if (!detail) return;
    try {
      setActionLoading(status);
      await advanceItem(detail.item.id, status);
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

  if (loading) {
    return <LoadingSpinner message="Loading item details..." />;
  }

  if (!detail) {
    return (
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <p>Item not found</p>
        <Link href="/batches" style={{ color: colors.primary }}>Back to Batches</Link>
      </div>
    );
  }

  const { item, supply_candidates, mappings, content_variants, pricing_decisions, preflight_checks, demand_signals } = detail;

  return (
    <main style={commonStyles.pageContainer as React.CSSProperties}>
      <div style={{ marginBottom: spacing[6] }}>
        <Link href={`/batches/${item.batch_id}`} style={{ color: colors.textSecondary, textDecoration: 'none' }}>
          ← Back to Batch
        </Link>
      </div>

      {/* Header */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={commonStyles.pageTitle as React.CSSProperties}>{item.id}</h1>
            <div style={{ ...commonStyles.pageDescription, marginTop: spacing[3], display: 'grid', gap: spacing[1] } as React.CSSProperties}>
              <div>Batch: {item.batch_id}</div>
              <div>Store: {item.store_id}</div>
              <div>Score: {item.score_total.toFixed(1)} · Risk Level: {item.risk_level}</div>
              <div>Created: {formatDate(item.created_at)} · Updated: {formatDate(item.updated_at)}</div>
            </div>
          </div>
          <span
            style={{
              ...commonStyles.badge,
              backgroundColor: getStatusColor(item.status),
              color: '#fff',
            }}
          >
            {item.status.replace(/_/g, ' ')}
          </span>
        </div>

        {error && (
          <ErrorDisplay error={error} onRetry={loadData} onDismiss={() => setError(null)} />
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: spacing[4], display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          {item.status === 'discovered' && (
            <button
              onClick={() => handleAdvance('shortlisted')}
              disabled={actionLoading !== null}
              style={{
                padding: '10px 20px',
                borderRadius: borderRadius.md,
                backgroundColor: colors.success,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {actionLoading === 'shortlisted' ? 'Advancing...' : 'Shortlist'}
            </button>
          )}
        </div>
      </section>

      {/* Supply Candidates */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Supply Candidates ({supply_candidates.length})</h2>
        {supply_candidates.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No supply candidates yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {supply_candidates.map((candidate) => (
              <div
                key={candidate.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: detail.current_supply_candidate?.id === candidate.id ? colors.successLight : colors.surface,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{candidate.source_platform}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      Ref: {candidate.source_item_ref} · Cost: ${candidate.cost_amount.toFixed(2)} · MOQ: {candidate.moq}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      Reliability: {(candidate.reliability_score * 100).toFixed(0)}% · Image Quality: {(candidate.image_quality_score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: borderRadius.sm,
                      backgroundColor: candidate.status === 'active' ? colors.success : colors.textMuted,
                      color: '#fff',
                      fontSize: 11,
                    }}
                  >
                    {candidate.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Category Mappings */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Category Mappings ({mappings.length})</h2>
        {mappings.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No category mappings yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {mappings.map((mapping) => (
              <div
                key={mapping.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: detail.current_mapping?.id === mapping.id ? colors.successLight : colors.surface,
                }}
              >
                <div style={{ fontWeight: 600 }}>Category: {mapping.category_ref}</div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing[1] }}>
                  Confidence: {(mapping.confidence_score * 100).toFixed(0)}% · Status: {mapping.status}
                </div>
                <pre style={{ fontSize: 11, marginTop: spacing[2], backgroundColor: colors.background, padding: spacing[2], borderRadius: borderRadius.sm, overflow: 'auto' }}>
                  {formatJson(mapping.attributes_payload)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Content Variants */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Content Variants ({content_variants.length})</h2>
        {content_variants.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No content variants yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {content_variants.map((variant) => (
              <div
                key={variant.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: detail.current_content_variant?.id === variant.id ? colors.successLight : colors.surface,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600 }}>{variant.title}</div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: borderRadius.sm,
                      backgroundColor: variant.status === 'approved' ? colors.success : variant.status === 'rejected' ? colors.error : colors.warning,
                      color: '#fff',
                      fontSize: 11,
                    }}
                  >
                    v{variant.version_no} · {variant.status}
                  </span>
                </div>
                {variant.bullet_points && (
                  <pre style={{ fontSize: 11, marginTop: spacing[2], backgroundColor: colors.background, padding: spacing[2], borderRadius: borderRadius.sm }}>
                    {formatJson(variant.bullet_points)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pricing Decisions */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Pricing Decisions ({pricing_decisions.length})</h2>
        {pricing_decisions.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No pricing decisions yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {pricing_decisions.map((pricing) => (
              <div
                key={pricing.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: detail.current_pricing_decision?.id === pricing.id ? colors.successLight : colors.surface,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Suggested: {pricing.suggested_price.toLocaleString()} · Min: {pricing.min_profit_line.toLocaleString()}
                    </div>
                    {pricing.final_price && (
                      <div style={{ fontSize: 12, color: colors.success, marginTop: spacing[1] }}>
                        Final: {pricing.final_price.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: borderRadius.sm,
                      backgroundColor: pricing.status === 'approved' ? colors.success : colors.warning,
                      color: '#fff',
                      fontSize: 11,
                    }}
                  >
                    {pricing.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preflight Checks */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Preflight Checks ({preflight_checks.length})</h2>
        {preflight_checks.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No preflight checks yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {preflight_checks.map((check) => (
              <div
                key={check.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: check.overall_result === 'passed' ? colors.successLight : colors.errorLight,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: spacing[2] }}>
                  Overall: {check.overall_result.toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[2] }}>
                  {[
                    { label: 'Profit', value: check.profit_check },
                    { label: 'Compliance', value: check.compliance_check },
                    { label: 'Supply', value: check.supply_check },
                    { label: 'Account Health', value: check.account_health_check },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <span style={{ color: colors.textSecondary }}>{label}:</span>{' '}
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: borderRadius.sm,
                          backgroundColor: value === 'passed' ? colors.success : value === 'warning' ? colors.warning : colors.error,
                          color: '#fff',
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Demand Signals */}
      <section
        style={{
          ...commonStyles.card,
          marginBottom: spacing[6],
        } as React.CSSProperties}
      >
        <h2 style={commonStyles.sectionHeader as React.CSSProperties}>Demand Signals ({demand_signals?.length || 0})</h2>
        {!demand_signals || demand_signals.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No demand signals recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: spacing[3] }}>
            {demand_signals.map((signal) => (
              <div
                key={signal.id}
                style={{
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: borderRadius.md,
                      backgroundColor: signal.signal_type === 'hot_keyword' ? colors.warning :
                        signal.signal_type === 'trending' ? '#8b5cf6' :
                        signal.signal_type === 'competitor' ? '#06b6d4' : colors.textSecondary,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {signal.signal_type}
                  </span>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>{signal.source}</span>
                </div>
                <pre style={{ fontSize: 11, backgroundColor: colors.background, padding: spacing[2], borderRadius: borderRadius.sm, overflow: 'auto' }}>
                  {formatJson(signal.payload)}
                </pre>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: spacing[2] }}>
                  Snapshot: {formatDate(signal.snapshot_time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
