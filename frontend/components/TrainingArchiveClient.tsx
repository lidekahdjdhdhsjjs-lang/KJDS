'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { colors, borderRadius, shadows, spacing, commonStyles } from '@/lib/design-system';
import { LoadingSpinner } from './LoadingStates';
import { ErrorDisplay, getUserFriendlyError } from './ErrorBoundary';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string | null;
};

type TrainingPackage = {
  id: string;
  store_id?: string | null;
  batch_id?: string | null;
  package_type: string;
  storage_uri: string;
  manifest_payload: string;
  created_at: string;
};

type PackageList = {
  items: TrainingPackage[];
  total: number;
};

const TYPE_COLORS: Record<string, string> = {
  batch: '#8b5cf6',
  store: '#06b6d4',
  manual: '#f59e0b',
};

async function fetchPackages(filters?: {
  store_id?: string;
  batch_id?: string;
  package_type?: string;
}): Promise<PackageList> {
  const params = new URLSearchParams();
  if (filters?.store_id) params.append('store_id', filters.store_id);
  if (filters?.batch_id) params.append('batch_id', filters.batch_id);
  if (filters?.package_type) params.append('package_type', filters.package_type);

  const url = `${API_BASE}/training-packages${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  const body: ApiResponse<PackageList> = await response.json();
  if (!response.ok || !body.success) {
    return { items: [], total: 0 };
  }
  return body.data;
}

function formatJson(jsonStr: string | null | undefined): string {
  if (!jsonStr) return '-';
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

export function TrainingArchiveClient() {
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await fetchPackages({
        package_type: filterType !== 'all' ? filterType : undefined,
      });
      setPackages(data.items);
      setError(null);
    } catch (err: unknown) {
      setError(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPackages();
  }, [filterType]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Stats
  const batchCount = packages.filter((p) => p.package_type === 'batch').length;
  const storeCount = packages.filter((p) => p.package_type === 'store').length;
  const manualCount = packages.filter((p) => p.package_type === 'manual').length;

  if (loading && packages.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Loading training archives...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Training Archive</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            ML training data packages for AI model improvement
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Total Packages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>{packages.length}</div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: '1px solid #ede9fe',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Batch Archives</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{batchCount}</div>
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: '1px solid #cffafe',
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Store Archives</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#06b6d4' }}>{storeCount}</div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Manual Exports</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{manualCount}</div>
        </div>
      </section>

      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Package Type</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          <option value="batch">Batch Archives</option>
          <option value="store">Store Archives</option>
          <option value="manual">Manual Exports</option>
        </select>
      </div>

      {/* Packages List */}
      {packages.length === 0 ? (
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
          No training packages found. Archives are created when batches complete.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {packages.map((pkg) => (
            <article
              key={pkg.id}
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
                        backgroundColor: TYPE_COLORS[pkg.package_type] || '#64748b',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {pkg.package_type}
                    </span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{pkg.id}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                    <strong>Storage:</strong> {pkg.storage_uri}
                  </div>
                  {pkg.store_id && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Store: {pkg.store_id}
                    </div>
                  )}
                  {pkg.batch_id && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      <Link
                        href={`/batches/${pkg.batch_id}`}
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        Batch: {pkg.batch_id}
                      </Link>
                    </div>
                  )}
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, color: '#2563eb' }}>
                      View Manifest
                    </summary>
                    <pre style={{
                      fontSize: 11,
                      backgroundColor: '#f8fafc',
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 8,
                      overflow: 'auto',
                      maxHeight: 300,
                    }}>
                      {formatJson(pkg.manifest_payload)}
                    </pre>
                  </details>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    Created: {formatDate(pkg.created_at)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: colors.textMuted }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </main>
  );
}
