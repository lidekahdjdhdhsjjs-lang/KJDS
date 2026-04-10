import { describe, expect, it } from 'vitest';

import {
  getDraftHint,
  getDraftStats,
  getNextStep,
  type DraftStats,
} from '../dashboardWorkflow';
import type { DashboardSummary, DraftItem } from '../api';

const baseSummary: DashboardSummary = {
  pending_candidates: 0,
  ready_for_review: 0,
  approved_today: 0,
  published_today: 0,
  failed_jobs: 0,
};

function makeDraft(overrides: Partial<DraftItem>): DraftItem {
  return {
    id: 'draft-001',
    candidate_id: 'cand-001',
    title: 'Test draft',
    status: 'ready_for_review',
    draft_version: 1,
    review_comment: null,
    published_at: null,
    ...overrides,
  };
}

function makeStats(overrides: Partial<DraftStats>): DraftStats {
  return {
    total: 0,
    reviewable: 0,
    approved: 0,
    published: 0,
    ...overrides,
  };
}

describe('getDraftStats', () => {
  it('counts reviewable approved and published drafts for the operator flow', () => {
    const stats = getDraftStats([
      makeDraft({ status: 'ready_for_review' }),
      makeDraft({ id: 'draft-002', status: 'changes_requested' }),
      makeDraft({ id: 'draft-003', status: 'approved' }),
      makeDraft({ id: 'draft-004', status: 'published' }),
    ]);

    expect(stats).toEqual({
      total: 4,
      reviewable: 2,
      approved: 1,
      published: 1,
    });
  });
});

describe('getNextStep', () => {
  it('tells non-admin operators to switch roles when approved drafts are waiting', () => {
    const nextStep = getNextStep(baseSummary, makeStats({ approved: 2 }), 'reviewer');

    expect(nextStep).toEqual({
      title: 'Switch to admin for the final release step',
      description: '2 approved items are ready, but only admin mode can publish to Shopee.',
    });
  });

  it('guides reviewers toward queued review work before pending candidate work', () => {
    const nextStep = getNextStep(
      { ...baseSummary, pending_candidates: 3 },
      makeStats({ total: 2, reviewable: 1 }),
      'reviewer',
    );

    expect(nextStep).toEqual({
      title: 'Review the queued drafts',
      description: '1 draft is ready for approval or rejection right now.',
    });
  });

  it('tells reviewers the queue is empty when no work exists yet', () => {
    const nextStep = getNextStep(baseSummary, makeStats({ total: 0 }), 'reviewer');

    expect(nextStep).toEqual({
      title: 'Switch to operator to start a fresh batch',
      description: 'Reviewer mode cannot create work. Intake candidates first, then come back for review.',
    });
  });
});

describe('getDraftHint', () => {
  it('explains that approved drafts need admin mode to publish', () => {
    const hint = getDraftHint(makeDraft({ status: 'approved' }), 'operator');

    expect(hint).toBe('This draft is approved. Switch to admin mode to publish it.');
  });

  it('explains that operator mode cannot approve reviewable drafts', () => {
    const hint = getDraftHint(makeDraft({ status: 'changes_requested' }), 'operator');

    expect(hint).toBe('Operator mode can prepare work, but reviewer or admin mode must make the approval decision.');
  });

  it('tells admins that approved drafts are ready for the final release gate', () => {
    const hint = getDraftHint(makeDraft({ status: 'approved' }), 'admin');

    expect(hint).toBe('Final release gate is open. Publish when the listing is ready to go live.');
  });
});
