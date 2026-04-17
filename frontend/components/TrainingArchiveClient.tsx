'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { colors, borderRadius, shadows, spacing } from '@/lib/design-system';
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
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <p>Loading training archives...</p>
      </div>
    );
  }

  return (
    <main style={{ padding: spacing[6], fontFamily: 'Arial, sans-serif', backgroundColor: colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <div>
          <h1 style={{ margin: 0 }}>Training Archive</h1>
          <p style={{ margin: `${spacing[2]} 0 0`, color: colors.textSecondary }}>
            ML training data packages for AI model improvement
          </p>
        </div>
        <Link
          href="/dashboard"
          style={{
            padding: `${spacing[2]} ${spacing[4]}`,
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Total Packages</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.text }}>{packages.length}</div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Batch Archives</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: TYPE_COLORS.batch }}>{batchCount}</div>
        </div>
        <div
          style={{
            padding: spacing[5],
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.infoLight}`,
            boxShadow: shadows.base,
          }}
        >
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Store Archives</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: TYPE_COLORS.store }}>{storeCount}</div>
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
          <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Manual Exports</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: TYPE_COLORS.manual }}>{manualCount}</div>
        </div>
      </section>

      {/* Filter */}
      <div style={{ marginBottom: spacing[6] }}>
        <label style={{ display: 'block', fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] }}>Package Type</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: `${spacing[2]} ${spacing[3]}`,
            borderRadius: borderRadius.base,
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
            padding: spacing[10],
            textAlign: 'center',
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
            border: `1px dashed ${colors.borderDark}`,
            color: colors.textSecondary,
          }}
        >
          No training packages found. Archives are created when batches complete.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: spacing[3] }}>
          {packages.map((pkg) => (
            <article
              key={pkg.id}
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
                        backgroundColor: TYPE_COLORS[pkg.package_type] || colors.textSecondary,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {pkg.package_type}
                    </span>
                    <span style={{ fontWeight: 600, color: colors.text }}>{pkg.id}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing[2] }}>
                    <strong>Storage:</strong> {pkg.storage_uri}
                  </div>
                  {pkg.store_id && (
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      Store: {pkg.store_id}
                    </div>
                  )}
                  {pkg.batch_id && (
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      <Link
                        href={`/batches/${pkg.batch_id}`}
                        style={{ color: colors.primary, textDecoration: 'none' }}
                      >
                        Batch: {pkg.batch_id}
                      </Link>
                    </div>
                  )}
                  <details style={{ marginTop: spacing[3] }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, color: colors.primary }}>
                      View Manifest
                    </summary>
                    <pre style={{
                      fontSize: 11,
                      backgroundColor: colors.background,
                      padding: spacing[3],
                      borderRadius: borderRadius.base,
                      marginTop: spacing[2],
                      overflow: 'auto',
                      maxHeight: 300,
                    }}>
                      {formatJson(pkg.manifest_payload)}
                    </pre>
                  </details>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: spacing[2] }}>
                    Created: {formatDate(pkg.created_at)}
                  </div>
                </div>
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
