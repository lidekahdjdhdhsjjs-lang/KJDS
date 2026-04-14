import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { OpportunitiesClient } from '@/components/OpportunitiesClient';

describe('OpportunitiesClient', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<OpportunitiesClient />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders empty state when no opportunities', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [], total: 0 } }),
    });
    render(<OpportunitiesClient />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('暂无商机');
    }, { timeout: 2000 });
  });

  it('renders opportunity list when opportunities exist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            {
              id: 'item-001',
              batch_id: 'batch-001',
              store_id: 'shopee-store',
              status: 'discovered',
              risk_level: 0,
              score_total: 8.5,
              current_supply_candidate_id: null,
              current_mapping_id: null,
              current_content_variant_id: null,
              current_pricing_decision_id: null,
              preflight_status: null,
              created_at: '2026-04-14T10:00:00Z',
              updated_at: '2026-04-14T10:00:00Z',
            },
          ],
          total: 1,
        },
      }),
    });
    render(<OpportunitiesClient />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('shopee-store');
    }, { timeout: 2000 });
  });

  it('displays total count in header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            { id: '1', batch_id: 'b1', store_id: 's1', status: 'discovered', risk_level: 0, score_total: 5, created_at: '', updated_at: '' },
            { id: '2', batch_id: 'b1', store_id: 's1', status: 'published', risk_level: 0, score_total: 7, created_at: '', updated_at: '' },
            { id: '3', batch_id: 'b1', store_id: 's1', status: 'published', risk_level: 0, score_total: 9, created_at: '', updated_at: '' },
          ],
          total: 3,
        },
      }),
    });
    render(<OpportunitiesClient />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('3 个商机');
    }, { timeout: 2000 });
  });

  it('displays stats for each status', async () => {
    const mockData = {
      success: true,
      data: {
        items: [
          { id: '1', batch_id: 'b1', store_id: 's1', status: 'discovered', risk_level: 0, score_total: 5, created_at: '', updated_at: '' },
          { id: '2', batch_id: 'b1', store_id: 's1', status: 'published', risk_level: 0, score_total: 7, created_at: '', updated_at: '' },
          { id: '3', batch_id: 'b1', store_id: 's1', status: 'published', risk_level: 0, score_total: 9, created_at: '', updated_at: '' },
        ],
        total: 3,
      },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    render(<OpportunitiesClient />);
    await waitFor(() => {
      expect(document.body.textContent).toContain('共 3 个商机');
    }, { timeout: 2000 });
    expect(document.body.textContent).toContain('2 个已发布');
  });
});
