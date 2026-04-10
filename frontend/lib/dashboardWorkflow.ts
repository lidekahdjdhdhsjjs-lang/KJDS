import type { DashboardSummary, DraftItem, OperatorRole } from './api';

export type DraftStats = {
  total: number;
  reviewable: number;
  approved: number;
  published: number;
};

export type NextStep = {
  title: string;
  description: string;
};

export const ROLE_SEQUENCE: OperatorRole[] = ['operator', 'reviewer', 'admin'];

export const ROLE_ACTIONS: Record<OperatorRole, string[]> = {
  operator: ['Intake fresh candidates', 'Generate draft listings', 'Hand off review-ready items'],
  reviewer: ['Approve strong drafts', 'Reject weak drafts with notes', 'Keep the queue moving'],
  admin: ['Publish approved drafts', 'Unblock any workflow stage', 'Complete the final release gate'],
};

export function getDraftStats(drafts: DraftItem[]): DraftStats {
  return {
    total: drafts.length,
    reviewable: drafts.filter((draft) => draft.status === 'ready_for_review' || draft.status === 'changes_requested').length,
    approved: drafts.filter((draft) => draft.status === 'approved').length,
    published: drafts.filter((draft) => draft.status === 'published').length,
  };
}

export function statusTone(status: string): string {
  switch (status) {
    case 'ready_for_review':
      return '#92400e';
    case 'approved':
      return '#065f46';
    case 'published':
      return '#1d4ed8';
    case 'changes_requested':
      return '#b91c1c';
    default:
      return '#374151';
  }
}

export function formatStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function getNextStep(summary: DashboardSummary, draftStats: DraftStats, activeRole: OperatorRole): NextStep {
  if (draftStats.approved > 0) {
    return activeRole === 'admin'
      ? {
          title: 'Publish the approved drafts',
          description: `${draftStats.approved} approved item${draftStats.approved > 1 ? 's are' : ' is'} waiting for the final admin release step.`,
        }
      : {
          title: 'Switch to admin for the final release step',
          description: `${draftStats.approved} approved item${draftStats.approved > 1 ? 's are' : ' is'} ready, but only admin mode can publish to Shopee.`,
        };
  }

  if (draftStats.reviewable > 0) {
    return activeRole === 'reviewer' || activeRole === 'admin'
      ? {
          title: 'Review the queued drafts',
          description: `${draftStats.reviewable} draft${draftStats.reviewable > 1 ? 's are' : ' is'} ready for approval or rejection right now.`,
        }
      : {
          title: 'Switch to reviewer for manual checks',
          description: `${draftStats.reviewable} draft${draftStats.reviewable > 1 ? 's are' : ' is'} waiting for review before anything can be published.`,
        };
  }

  if (summary.pending_candidates > 0) {
    return activeRole === 'operator' || activeRole === 'admin'
      ? {
          title: 'Generate drafts from pending candidates',
          description: `${summary.pending_candidates} sourced candidate${summary.pending_candidates > 1 ? 's are' : ' is'} waiting to become draft listings.`,
        }
      : {
          title: 'Switch to operator to generate drafts',
          description: `${summary.pending_candidates} pending candidate${summary.pending_candidates > 1 ? 's are' : ' is'} queued, but reviewer mode cannot create drafts.`,
        };
  }

  if (draftStats.total === 0) {
    return activeRole === 'operator' || activeRole === 'admin'
      ? {
          title: 'Start with candidate intake',
          description: 'The queue is empty. Intake candidates first so the workflow has something to process.',
        }
      : {
          title: 'Switch to operator to start a fresh batch',
          description: 'Reviewer mode cannot create work. Intake candidates first, then come back for review.',
        };
  }

  return {
    title: 'Queue is moving normally',
    description: `${draftStats.published} draft${draftStats.published === 1 ? '' : 's'} already published. Start another intake batch when you are ready.`,
  };
}

export function getDraftHint(draft: DraftItem, activeRole: OperatorRole): string {
  if (draft.status === 'approved' && activeRole !== 'admin') {
    return 'This draft is approved. Switch to admin mode to publish it.';
  }

  if ((draft.status === 'ready_for_review' || draft.status === 'changes_requested') && activeRole === 'operator') {
    return 'Operator mode can prepare work, but reviewer or admin mode must make the approval decision.';
  }

  if (draft.status === 'published') {
    return 'This draft is already live. No more action is needed here.';
  }

  if (draft.status === 'approved') {
    return 'Final release gate is open. Publish when the listing is ready to go live.';
  }

  return 'This draft is waiting on the current workflow step shown above.';
}
