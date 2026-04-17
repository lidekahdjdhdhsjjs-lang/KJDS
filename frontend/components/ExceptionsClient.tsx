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

type Incident = {
  id: string;
  store_id: string;
  incident_type: string;
  severity: 'P0' | 'P1' | 'P2';
  message: string;
  context_payload?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
};

type IncidentList = {
  items: Incident[];
  total: number;
};

type StoreHealth = {
  store_id: string;
  platform: string;
  oauth_status: 'connected' | 'disconnected' | 'expired' | 'error';
  api_quota_remaining: number;
  api_quota_total: number;
  last_success_at?: string | null;
  last_error?: string | null;
  error_rate: number;
  risk_flags: string[];
};

type StoreHealthList = {
  items: StoreHealth[];
  total: number;
};

type PublishTask = {
  id: string;
  opportunity_item_id: string;
  store_id: string;
  status: string;
  channel: string;
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};

type PublishTaskList = {
  items: PublishTask[];
  total: number;
};

const SEVERITY_COLORS = {
  P0: colors.error,
  P1: colors.warning,
  P2: '#facc15',
};

const STATUS_COLORS = {
  open: colors.error,
  acknowledged: colors.warning,
  resolved: colors.success,
};

const OAUTH_COLORS = {
  connected: colors.success,
  disconnected: colors.textMuted,
  expired: colors.warning,
  error: colors.error,
};

async function fetchIncidents(): Promise<IncidentList> {
  const response = await fetch(`${API_BASE}/incidents`, { cache: 'no-store' });
  const body: ApiResponse<IncidentList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

async function fetchStoreHealth(): Promise<StoreHealthList> {
  const response = await fetch(`${API_BASE}/store-health`, { cache: 'no-store' });
  const body: ApiResponse<StoreHealthList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

async function fetchBlockedTasks(): Promise<PublishTaskList> {
  const response = await fetch(`${API_BASE}/publish-tasks?status=blocked`, { cache: 'no-store' });
  const body: ApiResponse<PublishTaskList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

async function acknowledgeIncident(incidentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/acknowledge`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to acknowledge incident');
  }
}

async function resolveIncident(incidentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/resolve`, { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to resolve incident');
  }
}

export function ExceptionsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [storeHealth, setStoreHealth] = useState<StoreHealth[]>([]);
  const [blockedTasks, setBlockedTasks] = useState<PublishTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'blocked' | 'health'>('incidents');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incidentsData, healthData, tasksData] = await Promise.all([
        fetchIncidents(),
        fetchStoreHealth(),
        fetchBlockedTasks(),
      ]);
      setIncidents(incidentsData.items);
      setStoreHealth(healthData.items);
      setBlockedTasks(tasksData.items);
      setError(null);
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => { void loadData(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (incidentId: string) => {
    try {
      setActionLoading(incidentId);
      await acknowledgeIncident(incidentId);
      await loadData();
    } catch (err) {
      setError(getUserFriendlyError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (incidentId: string) => {
    try {
      setActionLoading(incidentId);
      await resolveIncident(incidentId);
      await loadData();
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

  const openIncidents = incidents.filter((i) => i.status === 'open');
  const p0Incidents = openIncidents.filter((i) => i.severity === 'P0');

  if (loading) {
    return (
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <p>Loading exceptions center...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0 }}>Exceptions Center</h1>
          <p style={{ margin: `${spacing[2]}px 0 0`, color: colors.textSecondary }}>
            Monitor incidents, blocked tasks, and store health status
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center' }}>
          {p0Incidents.length > 0 && (
            <div
              style={{
                padding: `${spacing[2]}px ${spacing[4]}px`,
                borderRadius: borderRadius.base,
                backgroundColor: colors.errorLight,
                border: `1px solid ${colors.error}`,
                color: colors.error,
                fontWeight: 600,
              }}
            >
              {p0Incidents.length} P0 Incident{p0Incidents.length > 1 ? 's' : ''}
            </div>
          )}
          <Link
            href="/dashboard"
            style={{
              padding: `${spacing[2]}px ${spacing[4]}px`,
              borderRadius: borderRadius.base,
              backgroundColor: colors.background,
              color: colors.textSecondary,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <ErrorDisplay error={error} onRetry={loadData} onDismiss={() => setError(null)} />
      )}

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4], marginBottom: spacing[6] }}>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: openIncidents.length > 0 ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Open Incidents</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: openIncidents.length > 0 ? colors.error : colors.success }}>
            {openIncidents.length}
          </div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: blockedTasks.length > 0 ? `1px solid ${colors.warning}` : `1px solid ${colors.border}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Blocked Tasks</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: blockedTasks.length > 0 ? colors.warning : colors.success }}>
            {blockedTasks.length}
          </div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Stores Monitored</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.primary }}>
            {storeHealth.length}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
        {[
          { key: 'incidents', label: `Incidents (${incidents.length})` },
          { key: 'blocked', label: `Blocked Tasks (${blockedTasks.length})` },
          { key: 'health', label: `Store Health (${storeHealth.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: `${spacing[2] + 2}px ${spacing[5]}px`,
              borderRadius: borderRadius.base,
              border: activeTab === tab.key ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
              backgroundColor: activeTab === tab.key ? colors.primaryLight : colors.surface,
              cursor: 'pointer',
              fontWeight: 600,
              color: activeTab === tab.key ? colors.primary : colors.textSecondary,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'incidents' && (
        <section style={{ display: 'grid', gap: spacing[3] }}>
          {incidents.length === 0 ? (
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
              No incidents. All systems operating normally.
            </div>
          ) : (
            incidents.map((incident) => (
              <article
                key={incident.id}
                style={{
                  padding: spacing[4],
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${incident.status === 'open' ? colors.error : colors.border}`,
                  boxShadow: incident.severity === 'P0' && incident.status === 'open' ? `0 0 0 2px ${colors.error}` : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[4] }}>
                  <div>
                    <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', marginBottom: spacing[2] }}>
                      <span
                        style={{
                          padding: `${spacing[1]}px ${spacing[2]}px`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: SEVERITY_COLORS[incident.severity],
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {incident.severity}
                      </span>
                      <span
                        style={{
                          padding: `${spacing[1]}px ${spacing[2]}px`,
                          borderRadius: borderRadius.sm,
                          backgroundColor: STATUS_COLORS[incident.status],
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {incident.status}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{incident.incident_type}</span>
                    </div>
                    <div style={{ color: colors.text, marginBottom: spacing[2] }}>{incident.message}</div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      Store: {incident.store_id} · Created: {formatDate(incident.created_at)}
                      {incident.resolved_at && ` · Resolved: ${formatDate(incident.resolved_at)}`}
                    </div>
                  </div>
                  {incident.status !== 'resolved' && (
                    <div style={{ display: 'flex', gap: spacing[2] }}>
                      {incident.status === 'open' && (
                        <button
                          onClick={() => handleAcknowledge(incident.id)}
                          disabled={actionLoading !== null}
                          style={{
                            padding: `${spacing[1] + 2}px ${spacing[3]}px`,
                            borderRadius: borderRadius.base,
                            backgroundColor: colors.warning,
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {actionLoading === incident.id ? '...' : 'Acknowledge'}
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(incident.id)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: `${spacing[1] + 2}px ${spacing[3]}px`,
                          borderRadius: borderRadius.base,
                          backgroundColor: colors.success,
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {actionLoading === incident.id ? '...' : 'Resolve'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === 'blocked' && (
        <section style={{ display: 'grid', gap: spacing[3] }}>
          {blockedTasks.length === 0 ? (
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
              No blocked tasks. All publish tasks are flowing normally.
            </div>
          ) : (
            blockedTasks.map((task) => (
              <article
                key={task.id}
                style={{
                  padding: spacing[4],
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.warning}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Link
                      href={`/opportunities/${task.opportunity_item_id}`}
                      style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {task.id}
                    </Link>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing[1] }}>
                      Item: {task.opportunity_item_id} · Store: {task.store_id} · Retries: {task.retry_count}
                    </div>
                    {task.last_error && (
                      <div style={{ fontSize: 12, color: colors.error, marginTop: spacing[2] }}>
                        Error: {task.last_error}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing[1] }}>
                      Created: {formatDate(task.created_at)} · Updated: {formatDate(task.updated_at)}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === 'health' && (
        <section style={{ display: 'grid', gap: spacing[3] }}>
          {storeHealth.length === 0 ? (
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
              No store health data available.
            </div>
          ) : (
            storeHealth.map((health) => (
              <article
                key={health.store_id}
                style={{
                  padding: spacing[4],
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: spacing[2] }}>{health.store_id}</div>
                    <div style={{ display: 'grid', gap: spacing[2] }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <span style={{ fontSize: 12, color: colors.textSecondary }}>OAuth:</span>
                        <span
                          style={{
                            padding: `${spacing[1]}px ${spacing[2]}px`,
                            borderRadius: borderRadius.sm,
                            backgroundColor: OAUTH_COLORS[health.oauth_status],
                            color: '#fff',
                            fontSize: 11,
                          }}
                        >
                          {health.oauth_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: colors.textSecondary }}>
                        API Quota: {health.api_quota_remaining}/{health.api_quota_total} ({((health.api_quota_remaining / health.api_quota_total) * 100).toFixed(0)}%)
                      </div>
                      <div style={{ fontSize: 12, color: colors.textSecondary }}>
                        Error Rate: {(health.error_rate * 100).toFixed(1)}%
                      </div>
                      {health.last_error && (
                        <div style={{ fontSize: 12, color: colors.error }}>Last Error: {health.last_error}</div>
                      )}
                      {health.last_success_at && (
                        <div style={{ fontSize: 12, color: colors.success }}>
                          Last Success: {formatDate(health.last_success_at)}
                        </div>
                      )}
                      {health.risk_flags.length > 0 && (
                        <div style={{ fontSize: 12, color: colors.warning }}>
                          Flags: {health.risk_flags.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      <div style={{ marginTop: spacing[6], fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()} · Auto-refreshes every 30 seconds
      </div>
    </main>
  );
}
