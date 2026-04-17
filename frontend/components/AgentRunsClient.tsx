'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ErrorDisplay, getUserFriendlyError } from './ErrorBoundary';
import { colors, borderRadius, shadows, spacing } from '@/lib/design-system';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type AgentRun = {
  id: string;
  agent_name: string;
  model_name?: string | null;
  entity_type: string;
  entity_id: string;
  input_summary?: string | null;
  output_summary?: string | null;
  evidence_payload?: string | null;
  cost_payload?: string | null;
  status: string;
  started_at: string;
  ended_at?: string | null;
};

type AgentRunList = {
  items: AgentRun[];
  total: number;
};

const STATUS_COLORS: Record<string, string> = {
  running: colors.info,
  completed: colors.success,
  failed: colors.error,
};

const AGENT_COLORS: Record<string, string> = {
  opportunity_discovery: '#8b5cf6',
  supply_scorer: '#06b6d4',
  category_mapper: '#f59e0b',
  content_generator: '#ec4899',
  pricing: '#10b981',
  quality_check: '#6366f1',
  publisher: '#f43f5e',
  archiver: '#78716c',
};

function getAgentColor(agentName: string): string {
  return AGENT_COLORS[agentName] || colors.textSecondary;
}

async function fetchAgentRuns(filters?: {
  agent_name?: string;
  entity_type?: string;
  status?: string;
}): Promise<AgentRunList> {
  const params = new URLSearchParams();
  if (filters?.agent_name) params.append('agent_name', filters.agent_name);
  if (filters?.entity_type) params.append('entity_type', filters.entity_type);
  if (filters?.status) params.append('status', filters.status);

  const url = `${API_BASE}/agent-runs${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  const body: ApiResponse<AgentRunList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

export function AgentRunsClient() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await fetchAgentRuns({
        agent_name: filterAgent !== 'all' ? filterAgent : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      setRuns(data.items);
      setError(null);
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRuns();
  }, [filterAgent, filterStatus]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (run: AgentRun) => {
    if (!run.ended_at) return 'Running...';
    const start = new Date(run.started_at).getTime();
    const end = new Date(run.ended_at).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const runningCount = runs.filter((r) => r.status === 'running').length;
  const completedCount = runs.filter((r) => r.status === 'completed').length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;

  if (loading && runs.length === 0) {
    return (
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <p>Loading agent runs...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0 }}>Agent Runs</h1>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textSecondary }}>
            Track AI agent execution history, costs, and performance
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: `${spacing[2]}px ${spacing[4]}px`,
            borderRadius: borderRadius.base,
            backgroundColor: colors.primaryLight,
            color: colors.primaryHover,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Dashboard
        </Link>
      </div>

      {error && (
        <ErrorDisplay error={error} onRetry={loadRuns} onDismiss={() => setError(null)} />
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Total Runs</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.text }}>{runs.length}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.primaryLight}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Running</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.primary }}>{runningCount}</div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Completed</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.success }}>{completedCount}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.errorLight}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Failed</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.error }}>{failedCount}</div>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[6] }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Agent Type</label>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderRadius: borderRadius.base,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Agents</option>
            <option value="opportunity_discovery">Opportunity Discovery</option>
            <option value="supply_scorer">Supply Scorer</option>
            <option value="category_mapper">Category Mapper</option>
            <option value="content_generator">Content Generator</option>
            <option value="pricing">Pricing</option>
            <option value="quality_check">Quality Check</option>
            <option value="publisher">Publisher</option>
            <option value="archiver">Archiver</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderRadius: borderRadius.base,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Runs List */}
      {runs.length === 0 ? (
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
          No agent runs found. Runs will appear here when AI agents process items.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: spacing[3] }}>
          {runs.map((run) => (
            <article
              key={run.id}
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
                        padding: `${spacing[1]}px ${spacing[2] + 2}px`,
                        borderRadius: borderRadius.sm,
                        backgroundColor: getAgentColor(run.agent_name),
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {run.agent_name}
                    </span>
                    <span
                      style={{
                        padding: `${spacing[1]}px ${spacing[2]}px`,
                        borderRadius: borderRadius.sm,
                        backgroundColor: STATUS_COLORS[run.status] || colors.textMuted,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {run.status}
                    </span>
                    {run.model_name && (
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{run.model_name}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: colors.text, marginBottom: spacing[2] }}>
                    <span style={{ fontWeight: 600 }}>{run.entity_type}:</span>{' '}
                    <Link
                      href={`/${run.entity_type === 'opportunity_item' ? 'opportunities' : run.entity_type}/${run.entity_id}`}
                      style={{ color: colors.primary, textDecoration: 'none' }}
                    >
                      {run.entity_id}
                    </Link>
                  </div>
                  {run.input_summary && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>
                      <strong>Input:</strong> {run.input_summary}
                    </div>
                  )}
                  {run.output_summary && (
                    <div style={{ fontSize: 12, color: colors.text, marginBottom: spacing[1] }}>
                      <strong>Output:</strong> {run.output_summary}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: colors.textMuted, display: 'flex', gap: spacing[4] }}>
                    <span>Started: {formatDate(run.started_at)}</span>
                    <span>Duration: {formatDuration(run)}</span>
                  </div>
                </div>
                {run.cost_payload && (
                  <div
                    style={{
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderRadius: borderRadius.base,
                      backgroundColor: colors.background,
                      fontSize: 12,
                      minWidth: 100,
                    }}
                  >
                    <div style={{ color: colors.textSecondary, marginBottom: 2 }}>Cost</div>
                    <div style={{ fontWeight: 600, color: colors.text }}>
                      {(() => {
                        try {
                          const cost = JSON.parse(run.cost_payload);
                          return cost.tokens ? `${cost.tokens} tokens` : cost.amount ? `$${cost.amount}` : 'N/A';
                        } catch {
                          return 'N/A';
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div style={{ marginTop: spacing[6], fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </main>
  );
}
