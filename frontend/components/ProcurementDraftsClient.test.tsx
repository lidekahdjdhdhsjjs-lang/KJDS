import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';

import { ProcurementDraftsClient } from './ProcurementDraftsClient';

const mockDrafts = [
  {
    id: 'draft-001',
    opportunity_item_id: 'item-001',
    supplier_ref: '1688-supplier-123',
    qty: 100,
    purchase_price: 45.5,
    status: 'awaiting_confirmation',
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
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { items: mockDrafts, total: 1 } }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProcurementDraftsClient', () => {
  it('renders page heading and description', () => {
    const { container } = render(<ProcurementDraftsClient />);
    expect(container.textContent).toContain('Procurement Drafts');
    expect(container.textContent).toContain('Manage procurement orders');
  });

  it('renders main container element', () => {
    const { container } = render(<ProcurementDraftsClient />);
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('renders status filter dropdown', () => {
    const { container } = render(<ProcurementDraftsClient />);
    expect(container.querySelector('select')).toBeTruthy();
  });

  it('fetches draft data on mount', async () => {
    render(<ProcurementDraftsClient />);
    await act(async () => { await Promise.resolve(); });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/procurement-drafts'),
      expect.any(Object),
    );
  });
});
