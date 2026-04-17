'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ActionButton } from '@/components/ActionButton';
import { DashboardCard } from '@/components/DashboardCard';
import { colors, borderRadius, spacing, typography, shadows } from '@/lib/design-system';
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

const s = {
  page: { padding: spacing[6], fontFamily: typography.fontFamily, backgroundColor: colors.background, minHeight: '100vh' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[6], flexWrap: 'wrap' as const },
  title: { marginBottom: spacing[2] },
  desc: { margin: 0, color: colors.textSecondary, maxWidth: 760 },
  navLink: (bg: string, color: string) => ({
    display: 'inline-block', padding: `${spacing[2]}px ${spacing[4]}px`, borderRadius: borderRadius.base,
    backgroundColor: bg, color, textDecoration: 'none', fontSize: 14, fontWeight: 600,
  }),
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: spacing[4], marginTop: spacing[5] },
  quickNavGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[4], marginTop: spacing[5] },
  quickNavCard: (borderColor: string) => ({
    padding: spacing[5], borderRadius: borderRadius.md, backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`, textDecoration: 'none', boxShadow: shadows.base,
  }),
  quickNavLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing[1] },
  quickNavValue: (color: string) => ({ fontSize: 24, fontWeight: 700, color }),
  authBanner: (bg: string, border: string, color: string) => ({
    marginTop: spacing[5], borderRadius: borderRadius.lg, padding: spacing[4],
    backgroundColor: bg, border, color, boxShadow: shadows.lg,
  }),
  authBannerLabel: { fontSize: 12, fontWeight: 700, marginBottom: spacing[2] },
  authItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3],
    flexWrap: 'wrap' as const, padding: spacing[3], borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.55)', border: '1px solid rgba(148, 163, 184, 0.24)',
  },
  authItemLabel: { display: 'grid', gap: spacing[1], fontSize: 13 },
  reviewQueue: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[5], boxShadow: shadows.lg },
  reviewQueueHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4], gap: spacing[4], flexWrap: 'wrap' as const },
  reviewQueueTitle: { margin: 0 },
  reviewQueueDesc: { color: colors.textSecondary, marginTop: spacing[1], marginBottom: 0 },
  draftCount: { color: colors.textSecondary, fontSize: 14 },
  emptyState: (border: string) => ({
    border: `1px dashed ${border}`, borderRadius: borderRadius.md, padding: spacing[5],
    backgroundColor: colors.background, color: colors.textSecondary,
  }),
  draftCard: {
    border: `1px solid ${colors.border}`, borderRadius: borderRadius.md, padding: spacing[4],
    display: 'grid', gap: spacing[3], backgroundColor: colors.surface,
  },
  draftCardHeader: { display: 'flex', justifyContent: 'space-between', gap: spacing[3], alignItems: 'start' as const },
  draftMeta: { fontSize: 12, color: colors.textSecondary },
  draftTitle: { margin: '6px 0 0', fontSize: 18 },
  draftBadge: (color: string, bg: string, border: string) => ({
    padding: '6px 10px', borderRadius: borderRadius.full, backgroundColor: bg, color, border,
    fontSize: 12, fontWeight: 700, textTransform: 'capitalize' as const,
  }),
  draftComment: { fontSize: 14, color: colors.textSecondary },
  draftHint: { fontSize: 13, color: colors.textSecondary },
  aside: { display: 'grid', gap: spacing[4] },
  roleCard: { backgroundColor: colors.text, color: '#fff', borderRadius: borderRadius.lg, padding: spacing[5], boxShadow: shadows.lg },
  roleCardLabel: { fontSize: 12, color: colors.infoLight, marginBottom: spacing[2] },
  roleCardTitle: { marginTop: 0, marginBottom: spacing[2] },
  roleCardDesc: { marginTop: 0, color: colors.borderDark, lineHeight: 1.6 },
  roleButton: (isActive: boolean) => ({
    borderRadius: borderRadius.full, padding: `${spacing[2]}px ${spacing[3]}px`,
    border: isActive ? `1px solid ${colors.primary}` : '1px solid rgba(255,255,255,0.18)',
    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
    color: '#fff', cursor: 'pointer', opacity: 1, fontWeight: 700,
  }),
  nextStepCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[5], boxShadow: shadows.lg },
  nextStepLabel: { fontSize: 12, color: colors.primary, marginBottom: spacing[2] },
  nextStepTitle: { margin: `0 0 ${spacing[2]}px`, fontSize: 18 },
  nextStepDesc: { margin: 0, color: colors.textSecondary, lineHeight: 1.6 },
  roleActionsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[5], boxShadow: shadows.lg },
  roleActionsLabel: { fontSize: 12, color: colors.primary, marginBottom: spacing[2] },
  roleActionsList: { margin: 0, paddingLeft: 18, lineHeight: 1.7, color: colors.textSecondary },
  snapshotCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[5], boxShadow: shadows.lg },
  snapshotLabel: { fontSize: 12, color: colors.primary, marginBottom: spacing[2] },
  snapshotGrid: { display: 'grid', gap: spacing[1] + 2, fontSize: 14, color: colors.textSecondary },
  feedbackBanner: (bg: string, border: string, color: string) => ({
    marginTop: spacing[4], padding: spacing[3], borderRadius: borderRadius.md,
    backgroundColor: bg, border, color,
  }),
  layout: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing[5], marginTop: spacing[8], alignItems: 'start' as const },
  twoCol: { display: 'grid', gap: spacing[4] },
  warningBanner: {
    marginTop: spacing[5], borderRadius: borderRadius.lg, padding: spacing[4],
    backgroundColor: colors.warningLight, border: `1px solid ${colors.warning}`,
    color: colors.warning, boxShadow: shadows.lg,
  },
  warningLabel: { fontSize: 12, fontWeight: 700, marginBottom: spacing[2] },
  warningText: { lineHeight: 1.6 },
  warningHint: { marginTop: spacing[2], fontSize: 13, lineHeight: 1.5 },
};

function getAuthorizationTone(canLoadLiveData: boolean): { backgroundColor: string; border: string; color: string } {
  if (canLoadLiveData) {
    return {
      backgroundColor: colors.successLight,
      border: `1px solid ${colors.success}`,
      color: colors.success,
    };
  }

  return {
    backgroundColor: colors.warningLight,
    border: `1px solid ${colors.warning}`,
    color: colors.warning,
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
  const [drafts, setDrafts] = useState<DraftItem[]>(initialDrafts);
  const [isPending, startTransition] = useTransition();

  const actingOperator = ACTOR_PRESETS[activeRole];
  const hasQueueData = drafts.length > 0;
  const isBackendUnavailable = Boolean(runtimeLoadError);
  const isPlatformReady = authorizationStatus.can_load_live_data;
  const isLiveActionBlocked = isBackendUnavailable || !isPlatformReady;

  const authorizationTone = getAuthorizationTone(isPlatformReady);
  const draftStats = useMemo(() => getDraftStats(drafts), [drafts]);

  const nextStep = getNextStep(initialSummary, draftStats, activeRole);
  const canOperate = activeRole === 'operator' || activeRole === 'admin';
  const canReview = activeRole === 'reviewer' || activeRole === 'admin';
  const canPublish = activeRole === 'admin';

  const refreshDrafts = async () => {
    try {
      const { fetchDrafts: apiFetchDrafts } = await import('@/lib/api');
      const newDrafts = await apiFetchDrafts(actingOperator);
      setDrafts(newDrafts.items);
    } catch {
      // Silently fail - drafts are supplementary
    }
  };

  const runAction = (action: () => Promise<void>, successMessage: string, actor: ActingOperator) => {
    setFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          await action();
          await refreshDrafts();
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
      // Also refresh drafts when role changes
      try {
        const { fetchDrafts: apiFetchDrafts } = await import('@/lib/api');
        const draftData = await apiFetchDrafts(actingOperator);
        if (isMounted) {
          setDrafts(draftData.items);
        }
      } catch {
        // Silently ignore draft fetch errors here
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
    <main style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Shopee AI Ops Console</h1>
          <p style={s.desc}>
            Single-store operating console for sourcing intake, draft generation, manual review, and controlled publish.
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
          <Link href="/procurement" style={s.navLink(colors.background, colors.textSecondary)}>Procurement</Link>
          <Link href="/training-archive" style={s.navLink(colors.background, colors.textSecondary)}>Archives</Link>
          <Link href="/agent-runs" style={s.navLink(colors.background, colors.textSecondary)}>Agents</Link>
          <Link href="/batches" style={s.navLink(colors.background, colors.textSecondary)}>Batches</Link>
          <Link href="/exceptions" style={s.navLink(colors.background, colors.textSecondary)}>Exceptions</Link>
          <Link href="/settings/platform-connections" style={s.navLink(colors.background, colors.textSecondary)}>Settings</Link>
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

      <section style={s.statsGrid}>
        <DashboardCard label="Pending candidates" value={initialSummary.pending_candidates} />
        <DashboardCard label="Ready for review" value={initialSummary.ready_for_review} />
        <DashboardCard label="Approved today" value={initialSummary.approved_today} />
        <DashboardCard label="Published today" value={initialSummary.published_today} />
        <DashboardCard label="Failed jobs" value={initialSummary.failed_jobs} />
      </section>

      {/* Quick Navigation Cards per spec.md section 7.1 */}
      <section style={s.quickNavGrid}>
        <Link href="/batches" style={s.quickNavCard(colors.primary)}>
          <div style={s.quickNavLabel}>Batch Overview</div>
          <div style={s.quickNavValue(colors.primary)}>Batches</div>
        </Link>
        <Link href="/exceptions" style={s.quickNavCard(colors.error)}>
          <div style={s.quickNavLabel}>Exception Alerts</div>
          <div style={s.quickNavValue(colors.error)}>Exceptions</div>
        </Link>
        <Link href="/batches" style={s.quickNavCard(colors.success)}>
          <div style={s.quickNavLabel}>New Opportunities</div>
          <div style={s.quickNavValue(colors.success)}>Discover</div>
        </Link>
        <Link href="/procurement" style={s.quickNavCard(colors.warning)}>
          <div style={s.quickNavLabel}>Profit & Costs</div>
          <div style={s.quickNavValue(colors.warning)}>Finance</div>
        </Link>
      </section>

      <section style={s.authBanner(authorizationTone.backgroundColor, authorizationTone.border, authorizationTone.color)}>
        <div style={s.authBannerLabel}>Platform authorization</div>
        <div style={{ lineHeight: 1.6 }}>{authorizationStatus.guidance}</div>
        <div style={{ display: 'grid', gap: spacing[3], marginTop: spacing[3] }}>
          {platformConnections.map((connection) => {
            const platformLabel = PLATFORM_LABELS[connection.platform];
            const actionLabel = connection.connected ? `Reconnect ${platformLabel}` : `Connect ${platformLabel}`;
            const statusLabel = connection.status.charAt(0).toUpperCase() + connection.status.slice(1);

            return (
              <div key={connection.platform} style={s.authItem}>
                <div style={s.authItemLabel}>
                  <div style={{ fontWeight: 700 }}>{platformLabel}</div>
                  <div>Status: {statusLabel}</div>
                  {connection.account_label ? <div>Account: {connection.account_label}</div> : null}
                  {connection.last_error ? <div>Error: {connection.last_error}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
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
        <section style={s.warningBanner}>
          <div style={s.warningLabel}>Backend connection warning</div>
          <div style={s.warningText}>{runtimeLoadError}</div>
          <div style={s.warningHint}>
            Live actions stay disabled until the backend connection is restored.
          </div>
        </section>
      ) : null}

      {!isPlatformReady ? (
        <section style={s.warningBanner}>
          <div style={s.warningLabel}>Live action lock</div>
          <div style={s.warningText}>
            Live sourcing, draft generation, review, and publish stay disabled until both Shopee and 1688 are authorized.
          </div>
        </section>
      ) : null}

      <section style={s.layout}>
        <div style={s.reviewQueue}>
          <div style={s.reviewQueueHeader}>
            <div>
              <h2 style={s.reviewQueueTitle}>Review queue</h2>
              <p style={s.reviewQueueDesc}>
                Each row now follows the selected acting role, so beginners can see why a button is available or blocked.
              </p>
            </div>
            <span style={s.draftCount}>{draftStats.total} drafts</span>
          </div>

          <div style={{ display: 'grid', gap: spacing[3] }}>
            {!hasQueueData ? (
              <article style={s.emptyState(colors.borderDark)}>
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
                <article key={draft.id} style={s.draftCard}>
                  <div style={s.draftCardHeader}>
                    <div>
                      <div style={s.draftMeta}>{draft.id} · candidate {draft.candidate_id}</div>
                      <h3 style={s.draftTitle}>{draft.title}</h3>
                    </div>
                    <span style={s.draftBadge(statusTone(draft.status), colors.background, colors.border)}>
                      {formatStatusLabel(draft.status)}
                    </span>
                  </div>

                  {draft.review_comment ? (
                    <div style={s.draftComment}>Review note: {draft.review_comment}</div>
                  ) : null}
                  {draft.published_at ? (
                    <div style={s.draftComment}>Published at: {draft.published_at}</div>
                  ) : null}

                  <div style={s.draftHint}>{getDraftHint(draft, activeRole)}</div>

                  <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
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

        <aside style={s.aside}>
          <section style={s.roleCard}>
            <div style={s.roleCardLabel}>Acting role</div>
            <h2 style={{ marginTop: 0, marginBottom: spacing[2] }}>{actingOperator.label} mode</h2>
            <p style={{ marginTop: 0, color: colors.borderDark, lineHeight: 1.6 }}>{actingOperator.description}</p>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', marginTop: spacing[4] }}>
              {ROLE_SEQUENCE.map((role) => {
                const actor = ACTOR_PRESETS[role];
                const isActive = role === activeRole;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    disabled={isPending}
                    style={s.roleButton(isActive)}
                  >
                    {actor.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section style={s.nextStepCard}>
            <div style={s.nextStepLabel}>What to do next</div>
            <h3 style={s.nextStepTitle}>{nextStep.title}</h3>
            <p style={s.nextStepDesc}>{nextStep.description}</p>
          </section>

          <section style={s.roleActionsCard}>
            <div style={s.roleActionsLabel}>This role can do</div>
            <ul style={s.roleActionsList}>
              {ROLE_ACTIONS[activeRole].map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>

          <section style={s.snapshotCard}>
            <div style={s.snapshotLabel}>Live queue snapshot</div>
            <div style={s.snapshotGrid}>
              <div>Ready for review: {draftStats.reviewable}</div>
              <div>Approved: {draftStats.approved}</div>
              <div>Published: {draftStats.published}</div>
            </div>

            {feedback ? (
              <div style={s.feedbackBanner(
                feedback.tone === 'success' ? colors.successLight : colors.errorLight,
                feedback.tone === 'success' ? `1px solid ${colors.success}` : `1px solid ${colors.error}`,
                feedback.tone === 'success' ? colors.success : colors.error,
              )}>
                {feedback.text}
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
