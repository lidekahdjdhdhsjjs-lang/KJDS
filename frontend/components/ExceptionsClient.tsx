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
  P0: '#dc2626',
  P1: '#f97316',
  P2: '#facc15',
};

const STATUS_COLORS = {
  open: '#ef4444',
  acknowledged: '#f59e0b',
  resolved: '#22c55e',
};

const OAUTH_COLORS = {
  connected: '#22c55e',
  disconnected: '#94a3b8',
  expired: '#f59e0b',
  error: '#ef4444',
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
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void loadData();
    }, 30000);
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
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading exceptions center...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Exceptions Center</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            Monitor incidents, blocked tasks, and store health status
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {p0Incidents.length > 0 && (
            <div
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontWeight: 600,
              }}
            >
              {p0Incidents.length} P0 Incident{p0Incidents.length > 1 ? 's' : ''}
            </div>
          )}
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
      </div>

      {error && (
        <ErrorDisplay error={error} onRetry={loadData} onDismiss={() => setError(null)} />
      )}

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: openIncidents.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Open Incidents</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: openIncidents.length > 0 ? '#dc2626' : '#22c55e' }}>
            {openIncidents.length}
          </div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: blockedTasks.length > 0 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Blocked Tasks</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: blockedTasks.length > 0 ? '#f97316' : '#22c55e' }}>
            {blockedTasks.length}
          </div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Stores Monitored</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#2563eb' }}>
            {storeHealth.length}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'incidents', label: `Incidents (${incidents.length})` },
          { key: 'blocked', label: `Blocked Tasks (${blockedTasks.length})` },
          { key: 'health', label: `Store Health (${storeHealth.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: activeTab === tab.key ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: activeTab === tab.key ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'incidents' && (
        <section style={{ display: 'grid', gap: 12 }}>
          {incidents.length === 0 ? (
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
              No incidents. All systems operating normally.
            </div>
          ) : (
            incidents.map((incident) => (
              <article
                key={incident.id}
                style={{
                  padding: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${incident.status === 'open' ? '#fecaca' : '#e2e8f0'}`,
                  boxShadow: incident.severity === 'P0' && incident.status === 'open' ? '0 0 0 2px #dc2626' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 4,
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
                          padding: '4px 8px',
                          borderRadius: 4,
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
                    <div style={{ color: colors.text, marginBottom: 8 }}>{incident.message}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Store: {incident.store_id} · Created: {formatDate(incident.created_at)}
                      {incident.resolved_at && ` · Resolved: ${formatDate(incident.resolved_at)}`}
                    </div>
                  </div>
                  {incident.status !== 'resolved' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {incident.status === 'open' && (
                        <button
                          onClick={() => handleAcknowledge(incident.id)}
                          disabled={actionLoading !== null}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            backgroundColor: '#f59e0b',
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
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: '#22c55e',
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
        <section style={{ display: 'grid', gap: 12 }}>
          {blockedTasks.length === 0 ? (
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
              No blocked tasks. All publish tasks are flowing normally.
            </div>
          ) : (
            blockedTasks.map((task) => (
              <article
                key={task.id}
                style={{
                  padding: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: '1px solid #fed7aa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Link
                      href={`/opportunities/${task.opportunity_item_id}`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {task.id}
                    </Link>
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      Item: {task.opportunity_item_id} · Store: {task.store_id} · Retries: {task.retry_count}
                    </div>
                    {task.last_error && (
                      <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>
                        Error: {task.last_error}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
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
        <section style={{ display: 'grid', gap: 12 }}>
          {storeHealth.length === 0 ? (
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
              No store health data available.
            </div>
          ) : (
            storeHealth.map((health) => (
              <article
                key={health.store_id}
                style={{
                  padding: 16,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{health.store_id}</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>OAuth:</span>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: OAUTH_COLORS[health.oauth_status],
                            color: '#fff',
                            fontSize: 11,
                          }}
                        >
                          {health.oauth_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        API Quota: {health.api_quota_remaining}/{health.api_quota_total} ({((health.api_quota_remaining / health.api_quota_total) * 100).toFixed(0)}%)
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Error Rate: {(health.error_rate * 100).toFixed(1)}%
                      </div>
                      {health.last_error && (
                        <div style={{ fontSize: 12, color: '#b91c1c' }}>Last Error: {health.last_error}</div>
                      )}
                      {health.last_success_at && (
                        <div style={{ fontSize: 12, color: '#22c55e' }}>
                          Last Success: {formatDate(health.last_success_at)}
                        </div>
                      )}
                      {health.risk_flags.length > 0 && (
                        <div style={{ fontSize: 12, color: '#f97316' }}>
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

      <div style={{ marginTop: 24, fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()} · Auto-refreshes every 30 seconds
      </div>
    </main>
  );
}
