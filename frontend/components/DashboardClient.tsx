'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ActionButton } from '@/components/ActionButton';
import { DashboardCard } from '@/components/DashboardCard';
import {
  ROLE_ACTIONS,
  ROLE_SEQUENCE,
  formatStatusLabel,
  getDraftHint,
  getDraftStats,
  getNextStep,
  statusTone,
} from '@/lib/dashboardWorkflow';
import {
  ACTOR_PRESETS,
  approveDraft,
  type ActingOperator,
  type DashboardSummary,
  disconnectPlatform,
  type DraftItem,
  fetchPlatformConnections,
  generateDrafts,
  HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE,
  HEADER_AUTH_DISABLED_MESSAGE,
  intakeCandidates,
  publishDraft,
  rejectDraft,
  type OperatorRole,
  type PlatformAuthorizationStatus,
  type PlatformConnectionStatus,
  startPlatformAuthorization,
} from '@/lib/api';

interface DashboardClientProps {
  initialSummary: DashboardSummary;
  initialDrafts: DraftItem[];
  initialAuthorization: PlatformAuthorizationStatus;
  initialLoadError?: string;
  initialFeedback?: FeedbackState;
}

type FeedbackState = {
  tone: 'success' | 'error';
  text: string;
};

const PLATFORM_LABELS: Record<PlatformConnectionStatus['platform'], string> = {
  shopee: 'Shopee',
  '1688': '1688',
};

const DEFAULT_PLATFORM_CONNECTIONS: PlatformConnectionStatus[] = [
  {
    platform: 'shopee',
    connected: false,
    status: 'disconnected',
    account_label: null,
    last_connected_at: null,
    last_error: null,
    authorize_url: null,
  },
  {
    platform: '1688',
    connected: false,
    status: 'disconnected',
    account_label: null,
    last_connected_at: null,
    last_error: null,
    authorize_url: null,
  },
];

function buildInitialPlatformConnections(
  authorization: PlatformAuthorizationStatus,
): PlatformConnectionStatus[] {
  return DEFAULT_PLATFORM_CONNECTIONS.map((connection) => {
    const connected = connection.platform === 'shopee'
      ? authorization.shopee_connected
      : authorization.alibaba_connected;

    return {
      ...connection,
      connected,
      status: connected ? 'connected' : 'disconnected',
    };
  });
}

function getDashboardErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === HEADER_AUTH_DISABLED_MESSAGE) {
    return HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE;
  }

  return error instanceof Error ? error.message : 'Unexpected action failure';
}

function getAuthorizationTone(canLoadLiveData: boolean): { backgroundColor: string; border: string; color: string } {
  if (canLoadLiveData) {
    return {
      backgroundColor: '#ecfdf5',
      border: '1px solid #6ee7b7',
      color: '#065f46',
    };
  }

  return {
    backgroundColor: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
  };
}

export function DashboardClient({
  initialSummary,
  initialDrafts,
  initialAuthorization,
  initialLoadError,
  initialFeedback,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<OperatorRole>('operator');
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [runtimeLoadError, setRuntimeLoadError] = useState<string | null>(initialLoadError ?? null);
  const [authorizationStatus, setAuthorizationStatus] = useState<PlatformAuthorizationStatus>(initialAuthorization);
  const [platformConnections, setPlatformConnections] = useState<PlatformConnectionStatus[]>(
    buildInitialPlatformConnections(initialAuthorization),
  );
  const [isPending, startTransition] = useTransition();

  const actingOperator = ACTOR_PRESETS[activeRole];
  const hasQueueData = initialDrafts.length > 0;
  const isBackendUnavailable = Boolean(runtimeLoadError);
  const isPlatformReady = authorizationStatus.can_load_live_data;
  const isLiveActionBlocked = isBackendUnavailable || !isPlatformReady;

  const authorizationTone = getAuthorizationTone(isPlatformReady);
  const draftStats = useMemo(() => getDraftStats(initialDrafts), [initialDrafts]);

  const nextStep = getNextStep(initialSummary, draftStats, activeRole);
  const canOperate = activeRole === 'operator' || activeRole === 'admin';
  const canReview = activeRole === 'reviewer' || activeRole === 'admin';
  const canPublish = activeRole === 'admin';

  const runAction = (action: () => Promise<void>, successMessage: string, actor: ActingOperator) => {
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          await action();
          setFeedback({
            tone: 'success',
            text: `${successMessage} Ran as ${actor.label.toLowerCase()} mode (${actor.id}).`,
          });
          router.refresh();
        } catch (error) {
          const message = getDashboardErrorMessage(error);
          if (message === HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE) {
            setRuntimeLoadError(message);
            return;
          }
          setFeedback({
            tone: 'error',
            text: message,
          });
        }
      })();
    });
  };

  useEffect(() => {
    if (runtimeLoadError) {
      return;
    }

    let isMounted = true;

    void (async () => {
      try {
        const summary = await fetchPlatformConnections(actingOperator);
        if (isMounted) {
          setPlatformConnections(summary.items);
          setAuthorizationStatus(summary.authorization);
        }
      } catch {
        if (isMounted) {
          setPlatformConnections(buildInitialPlatformConnections(initialAuthorization));
          setAuthorizationStatus(initialAuthorization);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [actingOperator, initialAuthorization, runtimeLoadError]);

  const startAuthorization = (platform: PlatformConnectionStatus['platform']) => {
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await startPlatformAuthorization(platform, actingOperator);
          setFeedback({
            tone: 'success',
            text: `${PLATFORM_LABELS[platform]} authorization started. Redirecting now.`,
          });
          window.location.assign(response.authorize_url);
        } catch (error) {
          const message = getDashboardErrorMessage(error);
          if (message === HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE) {
            setRuntimeLoadError(message);
            return;
          }
          setFeedback({
            tone: 'error',
            text: message,
          });
        }
      })();
    });
  };

  const disconnectConnection = (platform: PlatformConnectionStatus['platform']) => {
    runAction(
      async () => {
        await disconnectPlatform(platform, actingOperator);
      },
      `Disconnected ${PLATFORM_LABELS[platform]}.`,
      actingOperator,
    );
  };

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Shopee AI Ops Console</h1>
          <p style={{ margin: 0, color: '#475569', maxWidth: 760 }}>
            Single-store operating console for sourcing intake, draft generation, manual review, and controlled publish.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/settings/platform-connections"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: '#f1f5f9',
              color: '#475569',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Settings
          </Link>
          <ActionButton
            label="Intake 3 candidates"
            tone="neutral"
            disabled={isPending || isLiveActionBlocked || !canOperate}
            onClick={() => runAction(() => intakeCandidates(3, actingOperator), 'Added 3 manual candidates.', actingOperator)}
          />
          <ActionButton
            label="Generate drafts"
            disabled={isPending || isLiveActionBlocked || !canOperate}
            onClick={() => runAction(() => generateDrafts(actingOperator), 'Draft generation finished.', actingOperator)}
          />
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginTop: 24 }}>
        <DashboardCard label="Pending candidates" value={initialSummary.pending_candidates} />
        <DashboardCard label="Ready for review" value={initialSummary.ready_for_review} />
        <DashboardCard label="Approved today" value={initialSummary.approved_today} />
        <DashboardCard label="Published today" value={initialSummary.published_today} />
        <DashboardCard label="Failed jobs" value={initialSummary.failed_jobs} />
      </section>

      <section
        style={{
          marginTop: 20,
          borderRadius: 16,
          padding: 16,
          backgroundColor: authorizationTone.backgroundColor,
          border: authorizationTone.border,
          color: authorizationTone.color,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Platform authorization</div>
        <div style={{ lineHeight: 1.6 }}>{authorizationStatus.guidance}</div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {platformConnections.map((connection) => {
            const platformLabel = PLATFORM_LABELS[connection.platform];
            const actionLabel = connection.connected ? `Reconnect ${platformLabel}` : `Connect ${platformLabel}`;
            const statusLabel = connection.status.charAt(0).toUpperCase() + connection.status.slice(1);

            return (
              <div
                key={connection.platform}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                }}
              >
                <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>{platformLabel}</div>
                  <div>Status: {statusLabel}</div>
                  {connection.account_label ? <div>Account: {connection.account_label}</div> : null}
                  {connection.last_error ? <div>Error: {connection.last_error}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ActionButton
                    label={actionLabel}
                    tone="primary"
                    disabled={isPending || !canOperate}
                    onClick={() => startAuthorization(connection.platform)}
                  />
                  {connection.connected ? (
                    <ActionButton
                      label={`Disconnect ${platformLabel}`}
                      tone="neutral"
                      disabled={isPending || !canOperate}
                      onClick={() => disconnectConnection(connection.platform)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {runtimeLoadError ? (
        <section
          style={{
            marginTop: 20,
            borderRadius: 16,
            padding: 16,
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Backend connection warning</div>
          <div style={{ lineHeight: 1.6 }}>{runtimeLoadError}</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            Live actions stay disabled until the backend connection is restored.
          </div>
        </section>
      ) : null}

      {!isPlatformReady ? (
        <section
          style={{
            marginTop: 20,
            borderRadius: 16,
            padding: 16,
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Live action lock</div>
          <div style={{ lineHeight: 1.6 }}>
            Live sourcing, draft generation, review, and publish stay disabled until both Shopee and 1688 are authorized.
          </div>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 32, alignItems: 'start' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>Review queue</h2>
              <p style={{ color: '#64748b', marginTop: 6, marginBottom: 0 }}>
                Each row now follows the selected acting role, so beginners can see why a button is available or blocked.
              </p>
            </div>
            <span style={{ color: '#475569', fontSize: 14 }}>{draftStats.total} drafts</span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {!hasQueueData ? (
              <article
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 12,
                  padding: 20,
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                }}
              >
                {runtimeLoadError
                  ? 'No live queue data is available because the backend did not respond or the required platform authorization is missing. Restore access, then refresh this page.'
                  : !isPlatformReady
                    ? 'No live queue data is available because Shopee and 1688 must both be authorized before this console can run live actions.'
                    : 'No drafts are in the queue yet. Intake candidates first, then generate drafts for review.'}
              </article>
            ) : null}
            {initialDrafts.map((draft) => {
              const reviewAllowedByState = draft.status === 'ready_for_review' || draft.status === 'changes_requested';
              const publishAllowedByState = draft.status === 'approved';

              return (
                <article
                  key={draft.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    display: 'grid',
                    gap: 12,
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{draft.id} · candidate {draft.candidate_id}</div>
                      <h3 style={{ margin: '6px 0 0', fontSize: 18 }}>{draft.title}</h3>
                    </div>
                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        backgroundColor: '#f8fafc',
                        color: statusTone(draft.status),
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'capitalize',
                      }}
                    >
                      {formatStatusLabel(draft.status)}
                    </span>
                  </div>

                  {draft.review_comment ? (
                    <div style={{ fontSize: 14, color: '#334155' }}>Review note: {draft.review_comment}</div>
                  ) : null}
                  {draft.published_at ? (
                    <div style={{ fontSize: 14, color: '#334155' }}>Published at: {draft.published_at}</div>
                  ) : null}

                  <div style={{ fontSize: 13, color: '#64748b' }}>{getDraftHint(draft, activeRole)}</div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <ActionButton
                      label="Approve"
                      tone="success"
                      disabled={isPending || isLiveActionBlocked || !reviewAllowedByState || !canReview}
                      onClick={() => runAction(() => approveDraft(draft.id, actingOperator), `Approved ${draft.id}.`, actingOperator)}
                    />
                    <ActionButton
                      label="Reject"
                      tone="danger"
                      disabled={isPending || isLiveActionBlocked || !reviewAllowedByState || !canReview}
                      onClick={() => runAction(() => rejectDraft(draft.id, actingOperator), `Rejected ${draft.id}.`, actingOperator)}
                    />
                    <ActionButton
                      label="Publish"
                      tone="primary"
                      disabled={isPending || isLiveActionBlocked || !publishAllowedByState || !canPublish}
                      onClick={() => runAction(() => publishDraft(draft.id, actingOperator), `Published ${draft.id}.`, actingOperator)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <section style={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.18)' }}>
            <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 8 }}>Acting role</div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{actingOperator.label} mode</h2>
            <p style={{ marginTop: 0, color: '#cbd5e1', lineHeight: 1.6 }}>{actingOperator.description}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {ROLE_SEQUENCE.map((role) => {
                const actor = ACTOR_PRESETS[role];
                const isActive = role === activeRole;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    disabled={isPending}
                    style={{
                      borderRadius: 999,
                      padding: '8px 12px',
                      border: isActive ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.18)',
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                      color: '#fff',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      opacity: isPending ? 0.6 : 1,
                      fontWeight: 700,
                    }}
                  >
                    {actor.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 8 }}>What to do next</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{nextStep.title}</h3>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>{nextStep.description}</p>
          </section>

          <section style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 8 }}>This role can do</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#334155' }}>
              {ROLE_ACTIONS[activeRole].map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>

          <section style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)' }}>
            <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 8 }}>Live queue snapshot</div>
            <div style={{ display: 'grid', gap: 6, fontSize: 14, color: '#334155' }}>
              <div>Ready for review: {draftStats.reviewable}</div>
              <div>Approved: {draftStats.approved}</div>
              <div>Published: {draftStats.published}</div>
            </div>

            {feedback ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: feedback.tone === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: feedback.tone === 'success' ? '#065f46' : '#b91c1c',
                  border: feedback.tone === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                }}
              >
                {feedback.text}
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
