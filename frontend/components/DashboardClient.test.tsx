import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DashboardClient } from './DashboardClient';
import {
  ACTOR_PRESETS,
  HEADER_AUTH_DISABLED_MESSAGE,
  type DashboardSummary,
  type DraftItem,
  type PlatformAuthorizationStatus,
  type PlatformConnectionsSummary,
} from '../lib/api';
import * as api from '../lib/api';

const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

  return {
    ...actual,
    intakeCandidates: vi.fn().mockResolvedValue(undefined),
    generateDrafts: vi.fn().mockResolvedValue(undefined),
    approveDraft: vi.fn().mockResolvedValue(undefined),
    rejectDraft: vi.fn().mockResolvedValue(undefined),
    publishDraft: vi.fn().mockResolvedValue(undefined),
    fetchPlatformConnections: vi.fn().mockResolvedValue(undefined),
    startPlatformAuthorization: vi.fn().mockResolvedValue(undefined),
    disconnectPlatform: vi.fn().mockResolvedValue(undefined),
  };
});

const baseSummary: DashboardSummary = {
  pending_candidates: 0,
  ready_for_review: 1,
  approved_today: 0,
  published_today: 0,
  failed_jobs: 0,
};

const reviewableDraft: DraftItem = {
  id: 'draft-001',
  candidate_id: 'cand-001',
  title: 'USB desk fan',
  status: 'ready_for_review',
  draft_version: 1,
  review_comment: null,
  published_at: null,
};

const authorizedStatus: PlatformAuthorizationStatus = {
  shopee_connected: true,
  alibaba_connected: true,
  can_load_live_data: true,
  missing_connections: [],
  guidance: 'Shopee and 1688 are connected. Live actions are available.',
};


const unauthorizedStatus: PlatformAuthorizationStatus = {
  shopee_connected: true,
  alibaba_connected: false,
  can_load_live_data: false,
  missing_connections: ['1688'],
  guidance: 'Connect 1688 through its real authorization flow before running live actions.',
};

const platformConnections: PlatformConnectionsSummary = {
  items: [
    {
      platform: 'shopee',
      connected: true,
      status: 'connected',
      account_label: 'shop-001',
      last_connected_at: '2026-04-10T10:00:00Z',
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
  ],
  authorization: unauthorizedStatus,
};

beforeEach(() => {
  refreshMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('DashboardClient', () => {
  it('renders initial callback feedback when provided by the page', async () => {
    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: authorizedStatus,
        initialFeedback: {
          tone: 'success',
          text: '1688 authorization is connected. Live status has been refreshed.',
        },
      }),
    );

    expect(screen.getByText('1688 authorization is connected. Live status has been refreshed.')).toBeTruthy();
  });

  it('shows operator guidance and blocks review actions until reviewer mode is selected', async () => {
    const user = userEvent.setup();

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: authorizedStatus,
      }),
    );

    expect(screen.getByText('Operator mode')).toBeTruthy();
    expect(screen.getByText('Switch to reviewer for manual checks')).toBeTruthy();
    expect(
      screen.getByText('Operator mode can prepare work, but reviewer or admin mode must make the approval decision.'),
    ).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Generate drafts' })).toHaveProperty('disabled', false);

    await user.click(screen.getByRole('button', { name: 'Reviewer' }));

    expect(screen.getByText('Reviewer mode')).toBeTruthy();
    expect(screen.getByText('Review the queued drafts')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Generate drafts' })).toHaveProperty('disabled', true);
  });

  it('shows platform connect and disconnect controls for the operator journey', async () => {
    vi.mocked(api.fetchPlatformConnections).mockResolvedValue(platformConnections);

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: unauthorizedStatus,
      }),
    );

    expect(await screen.findByRole('button', { name: 'Reconnect Shopee' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect 1688' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect Shopee' })).toBeTruthy();
    expect(screen.getByText('Status: Connected')).toBeTruthy();
    expect(screen.getByText('Status: Disconnected')).toBeTruthy();
  });

  it('starts platform authorization and redirects the operator to the provider URL', async () => {
    const user = userEvent.setup();
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignSpy },
    });
    vi.mocked(api.fetchPlatformConnections).mockResolvedValue(platformConnections);
    vi.mocked(api.startPlatformAuthorization).mockResolvedValue({
      platform: '1688',
      status: 'pending',
      authorize_url: 'https://auth.1688.test/oauth?state=abc',
    });

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: unauthorizedStatus,
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Connect 1688' }));

    await waitFor(() => {
      expect(api.startPlatformAuthorization).toHaveBeenCalledWith('1688', ACTOR_PRESETS.operator);
    });
    expect(assignSpy).toHaveBeenCalledWith('https://auth.1688.test/oauth?state=abc');
  });

  it('disconnects a connected platform and refreshes the dashboard', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchPlatformConnections).mockResolvedValue(platformConnections);
    vi.mocked(api.disconnectPlatform).mockResolvedValue({
      platform: 'shopee',
      connected: false,
      status: 'disconnected',
      account_label: null,
      last_connected_at: null,
      last_error: null,
      authorize_url: null,
    });

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: unauthorizedStatus,
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Disconnect Shopee' }));

    await waitFor(() => {
      expect(api.disconnectPlatform).toHaveBeenCalledWith('shopee', ACTOR_PRESETS.operator);
      expect(refreshMock).toHaveBeenCalled();
    });
  });




  it('unlocks live actions when refreshed platform connections show both platforms connected', async () => {
    vi.mocked(api.fetchPlatformConnections).mockResolvedValue({
      items: [
        {
          platform: 'shopee',
          connected: true,
          status: 'connected',
          account_label: 'shop-001',
          last_connected_at: '2026-04-10T10:00:00Z',
          last_error: null,
          authorize_url: null,
        },
        {
          platform: '1688',
          connected: true,
          status: 'connected',
          account_label: 'supplier-001',
          last_connected_at: '2026-04-10T10:05:00Z',
          last_error: null,
          authorize_url: null,
        },
      ],
      authorization: authorizedStatus,
    });

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: unauthorizedStatus,
      }),
    );

    await screen.findByText('Account: supplier-001');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Intake 3 candidates' })).toHaveProperty('disabled', false);
      expect(screen.getByRole('button', { name: 'Generate drafts' })).toHaveProperty('disabled', false);
    });
    expect(screen.queryByText('Live action lock')).toBeNull();
  });

  it('locks the dashboard after a live action hits the auth-disabled error', async () => {
    const user = userEvent.setup();
    vi.mocked(api.generateDrafts).mockRejectedValueOnce(new Error(HEADER_AUTH_DISABLED_MESSAGE));

    render(
      createElement(DashboardClient, {
        initialSummary: baseSummary,
        initialDrafts: [reviewableDraft],
        initialAuthorization: authorizedStatus,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Generate drafts' }));

    await waitFor(() => {
      expect(screen.getByText('Backend connection warning')).toBeTruthy();
    });
    expect(
      screen.getByText('This environment blocks the old header-based operator simulation. Connect Shopee and 1688 through their real authorization flows before opening the dashboard.'),
    ).toBeTruthy();
    expect(screen.getByText('Live actions stay disabled until the backend connection is restored.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Intake 3 candidates' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Generate drafts' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveProperty('disabled', true);
  });

  it('guides approved drafts to admin mode before publish', async () => {
    const user = userEvent.setup();

    render(
      createElement(DashboardClient, {
        initialSummary: { ...baseSummary, ready_for_review: 0, approved_today: 1 },
        initialDrafts: [{ ...reviewableDraft, status: 'approved' }],
        initialAuthorization: authorizedStatus,
      }),
    );

    const queueCard = screen.getByText('USB desk fan').closest('article');
    if (!queueCard) {
      throw new Error('Expected draft article to exist');
    }

    expect(screen.getByText('Switch to admin for the final release step')).toBeTruthy();
    expect(within(queueCard).getByRole('button', { name: 'Publish' })).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('button', { name: 'Admin' }));

    expect(screen.getByText('Admin mode')).toBeTruthy();
    expect(screen.getByText('Publish the approved drafts')).toBeTruthy();
    expect(within(queueCard).getByRole('button', { name: 'Publish' })).toHaveProperty('disabled', false);
  });
});

