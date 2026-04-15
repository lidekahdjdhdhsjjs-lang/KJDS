import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';

import { ExceptionsClient } from './ExceptionsClient';

const mockIncidents = [
  {
    id: 'inc-001',
    store_id: 'store-001',
    incident_type: 'API_QUOTA_EXCEEDED',
    severity: 'P0' as const,
    message: 'Daily API quota exceeded for Shopee',
    context_payload: null,
    status: 'open' as const,
    created_at: '2024-01-01T00:00:00Z',
    resolved_at: null,
  },
];

const mockHealth = [
  {
    store_id: 'store-001',
    platform: 'shopee',
    oauth_status: 'connected' as const,
    api_quota_remaining: 8000,
    api_quota_total: 10000,
    last_success_at: '2024-01-01T12:00:00Z',
    last_error: null,
    error_rate: 0.02,
    risk_flags: ['quota_warning'],
  },
];

const mockTasks = [
  {
    id: 'task-001',
    opportunity_item_id: 'item-001',
    store_id: 'store-001',
    status: 'blocked',
    channel: 'shopee',
    retry_count: 3,
    last_error: 'Authentication expired',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Set up jsdom globals once
let dom: JSDOM;
beforeAll(() => {
  dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost' },
  );
  globalThis.document = dom.window.document;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.navigator = dom.window.navigator;
});

const mockFetch = vi.fn();
beforeEach(() => {
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/incidents')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { items: mockIncidents, total: 1 } }) });
    }
    if (url.includes('/store-health')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { items: mockHealth, total: 1 } }) });
    }
    if (url.includes('/publish-tasks')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: { items: mockTasks, total: 1 } }) });
    }
    return Promise.resolve({ ok: false });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ExceptionsClient', () => {
  it('renders page heading and description', async () => {
    const { container } = render(<ExceptionsClient />);
    await waitFor(() => {
      expect(container.textContent).toContain('Exceptions Center');
    });
    expect(container.textContent).toContain('Monitor incidents');
  });

  it('renders main container element', async () => {
    const { container } = render(<ExceptionsClient />);
    await waitFor(() => {
      expect(container.querySelector('main')).toBeTruthy();
    });
  });

  it('renders three tab buttons', async () => {
    const { container } = render(<ExceptionsClient />);
    await waitFor(() => {
      expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);
    });
  });

  it('fetches all three data sources on mount', async () => {
    render(<ExceptionsClient />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/incidents'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/store-health'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/publish-tasks'),
        expect.any(Object),
      );
    });
  });
});
