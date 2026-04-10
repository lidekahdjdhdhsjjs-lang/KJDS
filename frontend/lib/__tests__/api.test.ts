import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACTOR_PRESETS,
  approveDraft,
  disconnectPlatform,
  fetchDashboardAuthorization,
  fetchDashboardSummary,
  fetchDrafts,
  fetchPlatformConnections,
  intakeCandidates,
  publishDraft,
  startPlatformAuthorization,
} from '../api';

const fetchMock = vi.fn();

function mockSuccessResponse<T>(data: T): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      error: null,
      meta: null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function mockErrorResponse(detail: string, status: number): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('sends operator identity headers when loading dashboard summary', async () => {
    fetchMock.mockResolvedValue(
      mockSuccessResponse({
        pending_candidates: 1,
        ready_for_review: 2,
        approved_today: 3,
        published_today: 4,
        failed_jobs: 0,
      }),
    );

    const summary = await fetchDashboardSummary();

    expect(summary).toEqual({
      pending_candidates: 1,
      ready_for_review: 2,
      approved_today: 3,
      published_today: 4,
      failed_jobs: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/dashboard/summary',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
      }),
    );
  });

  it('loads platform connection records with operator identity headers', async () => {
    fetchMock.mockResolvedValue(
      mockSuccessResponse({
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
        authorization: {
          shopee_connected: true,
          alibaba_connected: false,
          can_load_live_data: false,
          missing_connections: ['1688'],
          guidance: 'Connect 1688 through its real authorization flow before running live actions.',
        },
      }),
    );

    const summary = await fetchPlatformConnections();

    expect(summary.items).toHaveLength(2);
    expect(summary.authorization.can_load_live_data).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/platform-connections',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
      }),
    );
  });

  it('starts platform authorization with operator identity headers', async () => {
    fetchMock.mockResolvedValue(
      mockSuccessResponse({
        platform: 'shopee',
        status: 'pending',
        authorize_url: 'https://partner.shopee.test/oauth?state=abc',
      }),
    );

    const response = await startPlatformAuthorization('shopee');

    expect(response).toEqual({
      platform: 'shopee',
      status: 'pending',
      authorize_url: 'https://partner.shopee.test/oauth?state=abc',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/platform-connections/shopee/start',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
      }),
    );
  });

  it('disconnects a platform with operator identity headers', async () => {
    fetchMock.mockResolvedValue(
      mockSuccessResponse({
        platform: '1688',
        connected: false,
        status: 'disconnected',
        account_label: null,
        last_connected_at: null,
        last_error: null,
        authorize_url: null,
      }),
    );

    const response = await disconnectPlatform('1688');

    expect(response.status).toBe('disconnected');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/platform-connections/1688/disconnect',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
      }),
    );
  });


  it('explains auth-disabled dashboard authorization failures with the shared message', async () => {
    fetchMock.mockResolvedValue(
      mockErrorResponse('Header-based auth is disabled outside development', 503),
    );

    await expect(fetchDashboardAuthorization()).rejects.toThrow(
      'Development-only header auth is disabled. Connect Shopee and 1688 through their real authorization flows before using the dashboard.',
    );
  });

  it('sends operator identity headers when loading drafts', async () => {
    fetchMock.mockResolvedValue(
      mockSuccessResponse({
        items: [
          {
            id: 'draft-001',
            candidate_id: 'cand-001',
            title: 'Title',
            status: 'ready_for_review',
            draft_version: 1,
            review_comment: null,
            published_at: null,
          },
        ],
      }),
    );

    const drafts = await fetchDrafts();

    expect(drafts.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/drafts',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
      }),
    );
  });

  it('sends reviewer identity headers when approving a draft', async () => {
    fetchMock.mockResolvedValue(mockSuccessResponse({ ok: true }));

    await approveDraft('draft-001', ACTOR_PRESETS.reviewer);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/review/draft-001/approve',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-operator-id': 'reviewer-001',
          'x-operator-role': 'reviewer',
        }),
      }),
    );
  });

  it('sends operator identity headers and JSON body when intaking candidates', async () => {
    fetchMock.mockResolvedValue(mockSuccessResponse({ ok: true }));

    await intakeCandidates(3, ACTOR_PRESETS.operator);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/candidates/intake',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-operator-id': 'operator-001',
          'x-operator-role': 'operator',
        }),
        body: JSON.stringify({ source: 'manual', count: 3 }),
      }),
    );
  });

  it('surfaces backend role errors when publish is blocked', async () => {
    fetchMock.mockResolvedValue(mockErrorResponse('Operator role is not allowed for this action', 403));

    await expect(publishDraft('draft-001', ACTOR_PRESETS.reviewer)).rejects.toThrow(
      'Operator role is not allowed for this action',
    );
  });
});
