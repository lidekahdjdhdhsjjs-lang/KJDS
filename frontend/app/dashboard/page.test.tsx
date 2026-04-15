import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchDashboardSummaryMock, fetchDraftsMock, fetchDashboardAuthorizationMock } = vi.hoisted(() => ({
  fetchDashboardSummaryMock: vi.fn(),
  fetchDraftsMock: vi.fn(),
  fetchDashboardAuthorizationMock: vi.fn(),
}));

vi.mock('@/components/DashboardClient', () => ({
  DashboardClient: ({
    initialLoadError,
    initialSummary,
    initialDrafts,
    initialAuthorization,
    initialFeedback,
  }: {
    initialLoadError?: string;
    initialSummary: {
      pending_candidates: number;
      failed_jobs: number;
    };
    initialDrafts: Array<{ id: string }>;
    initialAuthorization: {
      guidance: string;
      shopee_connected: boolean;
      alibaba_connected: boolean;
    };
    initialFeedback?: {
      tone: 'success' | 'error';
      text: string;
    };
  }) => (
    <div>
      <div>Mock dashboard client</div>
      <div>{initialAuthorization.guidance}</div>
      <div>Shopee: {initialAuthorization.shopee_connected ? 'Connected' : 'Missing authorization'}</div>
      <div>1688: {initialAuthorization.alibaba_connected ? 'Connected' : 'Missing authorization'}</div>
      <div>Pending candidates: {initialSummary.pending_candidates}</div>
      <div>Failed jobs: {initialSummary.failed_jobs}</div>
      <div>Draft count: {initialDrafts.length}</div>
      {initialFeedback ? <div>{initialFeedback.text}</div> : null}
      {initialLoadError ? <div>{initialLoadError}</div> : null}
    </div>
  ),
}));

vi.mock('@/lib/api', () => ({
  HEADER_AUTH_DISABLED_MESSAGE:
    'Development-only header auth is disabled. Connect Shopee and 1688 through their real authorization flows before using the dashboard.',
  HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE:
    'This environment blocks the old header-based operator simulation. Connect Shopee and 1688 through their real authorization flows before opening the dashboard.',
  fetchDashboardSummary: fetchDashboardSummaryMock,
  fetchDrafts: fetchDraftsMock,
  fetchDashboardAuthorization: fetchDashboardAuthorizationMock,
}));

import DashboardPage from './page';

afterEach(() => {
  cleanup();
});

describe('DashboardPage', () => {
  beforeEach(() => {
    fetchDashboardSummaryMock.mockReset();
    fetchDraftsMock.mockReset();
    fetchDashboardAuthorizationMock.mockReset();
    fetchDashboardSummaryMock.mockResolvedValue({
      pending_candidates: 0,
      ready_for_review: 0,
      approved_today: 0,
      published_today: 0,
      failed_jobs: 0,
    });
    fetchDraftsMock.mockResolvedValue({ items: [] });
    fetchDashboardAuthorizationMock.mockResolvedValue({
      shopee_connected: true,
      alibaba_connected: true,
      can_load_live_data: true,
      missing_connections: [],
      guidance: 'Shopee and 1688 are connected. Live actions are available.',
    });
  });

  it('passes live authorization state to the dashboard client', async () => {
    fetchDraftsMock.mockResolvedValue({ items: [{ id: 'draft-001' }] });
    fetchDashboardAuthorizationMock.mockResolvedValue({
      shopee_connected: true,
      alibaba_connected: false,
      can_load_live_data: false,
      missing_connections: ['1688'],
      guidance: 'Connect 1688 through its real authorization flow before running live actions.',
    });

    const page = await DashboardPage({});
    render(page);

    expect(screen.getByText('Connect 1688 through its real authorization flow before running live actions.')).toBeTruthy();
    expect(screen.getByText('Shopee: Connected')).toBeTruthy();
    expect(screen.getByText('1688: Missing authorization')).toBeTruthy();
    expect(screen.getByText('Pending candidates: 0')).toBeTruthy();
    expect(screen.getByText('Draft count: 1')).toBeTruthy();
  });

  it('shows a real sign-in message when header auth is disabled', async () => {
    fetchDashboardSummaryMock.mockRejectedValue(
      new Error('Development-only header auth is disabled. Connect Shopee and 1688 through their real authorization flows before using the dashboard.'),
    );

    const page = await DashboardPage({});
    render(page);

    expect(
      screen.getByText('This environment blocks the old header-based operator simulation. Connect Shopee and 1688 through their real authorization flows before opening the dashboard.'),
    ).toBeTruthy();
    expect(screen.getByText('Connect Shopee and 1688 through their real authorization flows before running live actions.')).toBeTruthy();
    expect(screen.getByText('Shopee: Missing authorization')).toBeTruthy();
    expect(screen.getByText('1688: Missing authorization')).toBeTruthy();
  });

  it('shows a success banner after a platform authorization callback succeeds', async () => {
    const page = await DashboardPage({
      searchParams: Promise.resolve({
        authorization_platform: '1688',
        authorization_status: 'connected',
      }),
    });
    render(page);

    expect(screen.getByText('1688 authorization is connected. Live status has been refreshed.')).toBeTruthy();
  });

  it('shows an error banner after a platform authorization callback fails', async () => {
    const page = await DashboardPage({
      searchParams: Promise.resolve({
        authorization_platform: 'shopee',
        authorization_status: 'error',
      }),
    });
    render(page);

    expect(screen.getByText('Shopee authorization failed. Check the platform status and try again.')).toBeTruthy();
  });

  it('keeps loaded summary and drafts when authorization status fails to load', async () => {
    fetchDashboardSummaryMock.mockResolvedValue({
      pending_candidates: 4,
      ready_for_review: 0,
      approved_today: 0,
      published_today: 0,
      failed_jobs: 0,
    });
    fetchDraftsMock.mockResolvedValue({ items: [{ id: 'draft-001' }] });
    fetchDashboardAuthorizationMock.mockRejectedValue(new Error('Failed to load platform authorization status'));

    const page = await DashboardPage({});
    render(page);

    expect(
      screen.getByText('Console is running, but backend data is unavailable right now. Failed to load platform authorization status'),
    ).toBeTruthy();
    expect(screen.getByText('Connect Shopee and 1688 through their real authorization flows before running live actions.')).toBeTruthy();
    expect(screen.getByText('Shopee: Missing authorization')).toBeTruthy();
    expect(screen.getByText('1688: Missing authorization')).toBeTruthy();
    expect(screen.getByText('Pending candidates: 4')).toBeTruthy();
    expect(screen.getByText('Draft count: 1')).toBeTruthy();
  });

  it('keeps loaded authorization and drafts when summary fails to load', async () => {
    fetchDashboardSummaryMock.mockRejectedValue(new Error('Failed to load dashboard summary'));
    fetchDraftsMock.mockResolvedValue({ items: [{ id: 'draft-001' }] });
    fetchDashboardAuthorizationMock.mockResolvedValue({
      shopee_connected: true,
      alibaba_connected: false,
      can_load_live_data: false,
      missing_connections: ['1688'],
      guidance: 'Connect 1688 through its real authorization flow before running live actions.',
    });

    const page = await DashboardPage({});
    render(page);

    expect(
      screen.getByText('Console is running, but backend data is unavailable right now. Failed to load dashboard summary'),
    ).toBeTruthy();
    expect(screen.getByText('Connect 1688 through its real authorization flow before running live actions.')).toBeTruthy();
    expect(screen.getByText('Shopee: Connected')).toBeTruthy();
    expect(screen.getByText('1688: Missing authorization')).toBeTruthy();
    expect(screen.getByText('Pending candidates: 0')).toBeTruthy();
    expect(screen.getByText('Failed jobs: 1')).toBeTruthy();
    expect(screen.getByText('Draft count: 1')).toBeTruthy();
  });
});
