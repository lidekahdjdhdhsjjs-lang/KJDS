import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';

import { TrainingArchiveClient } from './TrainingArchiveClient';

const mockPackages = [
  {
    id: 'pkg-001',
    store_id: 'store-001',
    batch_id: 'batch-001',
    package_type: 'batch',
    storage_uri: 's3://training-archives/batch-001.tar.gz',
    manifest_payload: '{"products": 100, "images": 500}',
    created_at: '2024-01-01T00:00:00Z',
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
    json: () => Promise.resolve({ success: true, data: { items: mockPackages, total: 1 } }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TrainingArchiveClient', () => {
  it('renders page heading and description', async () => {
    const { container } = render(<TrainingArchiveClient />);
    await waitFor(() => {
      expect(container.textContent).toContain('Training Archive');
    });
    expect(container.textContent).toContain('ML training data packages');
  });

  it('renders main container element', async () => {
    const { container } = render(<TrainingArchiveClient />);
    await waitFor(() => {
      expect(container.querySelector('main')).toBeTruthy();
    });
  });

  it('renders type filter dropdown', async () => {
    const { container } = render(<TrainingArchiveClient />);
    await waitFor(() => {
      expect(container.querySelector('select')).toBeTruthy();
    });
  });

  it('fetches training packages on mount', async () => {
    render(<TrainingArchiveClient />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/training-packages'),
        expect.any(Object),
      );
    });
  });
});
