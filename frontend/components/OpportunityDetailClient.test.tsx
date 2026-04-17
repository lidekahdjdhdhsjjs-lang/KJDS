import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpportunityDetailClient } from './OpportunityDetailClient';

const mockItemDetail = {
  item: {
    id: 'opp-001',
    batch_id: 'batch-001',
    store_id: 'store-001',
    status: 'discovered',
    risk_level: 2,
    score_total: 8.5,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-02T11:00:00Z',
  },
  supply_candidates: [],
  mappings: [],
  content_variants: [],
  pricing_decisions: [],
  preflight_checks: [],
  demand_signals: [],
};

const mockFetch = vi.fn();
beforeEach(() => {
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OpportunityDetailClient', () => {
  it('renders loading state initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<OpportunityDetailClient />);
    expect(screen.getByText('Loading item details...')).toBeTruthy();
  });

  it('renders item header when data loads', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockItemDetail }),
    });
    render(<OpportunityDetailClient />);
    await waitFor(() => {
      expect(screen.getByText('opp-001')).toBeTruthy();
    });
    expect(screen.getByText('Batch: batch-001')).toBeTruthy();
    expect(screen.getByText('Store: store-001')).toBeTruthy();
    expect(screen.getByText('Score: 8.5 · Risk Level: 2')).toBeTruthy();
  });

  it('renders empty sections when no data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockItemDetail }),
    });
    render(<OpportunityDetailClient />);
    await waitFor(() => {
      expect(screen.getByText('Supply Candidates (0)')).toBeTruthy();
    });
    expect(screen.getByText('Category Mappings (0)')).toBeTruthy();
    expect(screen.getByText('Content Variants (0)')).toBeTruthy();
    expect(screen.getByText('Pricing Decisions (0)')).toBeTruthy();
    expect(screen.getByText('Preflight Checks (0)')).toBeTruthy();
  });

  it('shows Shortlist button for discovered items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockItemDetail }),
    });
    render(<OpportunityDetailClient />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Shortlist' })).toBeTruthy();
    });
  });

  it('shows supply candidates when present', async () => {
    const withCandidate = {
      ...mockItemDetail,
      supply_candidates: [{
        id: 'sc-001',
        opportunity_item_id: 'opp-001',
        source_platform: '1688',
        source_item_ref: 'REF-123',
        cost_amount: 12.50,
        moq: 10,
        reliability_score: 0.9,
        image_quality_score: 0.85,
        status: 'active',
        created_at: '2024-01-01T10:00:00Z',
      }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: withCandidate }),
    });
    render(<OpportunityDetailClient />);
    await waitFor(() => {
      expect(screen.getByText('Supply Candidates (1)')).toBeTruthy();
    });
    expect(screen.getByText('1688')).toBeTruthy();
    expect(screen.getByText(/Ref: REF-123/)).toBeTruthy();
  });

  it('shows content variants when present', async () => {
    const withVariant = {
      ...mockItemDetail,
      content_variants: [{
        id: 'cv-001',
        opportunity_item_id: 'opp-001',
        title: 'USB Desk Fan 3-Speed',
        bullet_points: '• 3 speeds\n• Quiet motor\n• USB powered',
        image_bundle_ref: null,
        template_ref: null,
        locale: 'en_US',
        version_no: 1,
        status: 'approved',
        created_at: '2024-01-01T10:00:00Z',
      }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: withVariant }),
    });
    render(<OpportunityDetailClient />);
    await waitFor(() => {
      expect(screen.getByText('Content Variants (1)')).toBeTruthy();
    });
    expect(screen.getByText('USB Desk Fan 3-Speed')).toBeTruthy();
  });
});
