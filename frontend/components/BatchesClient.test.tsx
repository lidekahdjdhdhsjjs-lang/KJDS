import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchesClient } from '@/components/BatchesClient';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BatchesClient', () => {
  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<BatchesClient />);
    expect(screen.getByText('Loading batches...')).toBeInTheDocument();
  });

  it('renders create batch button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: [], total: 0 } }),
    });
    render(<BatchesClient />);
    await screen.findByText('Create New Batch');
    expect(screen.getByText('Create New Batch')).toBeInTheDocument();
  });

  it('displays empty state when no batches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: [], total: 0 } }),
    });
    render(<BatchesClient />);
    await screen.findByText('No batches yet. Create a new batch to get started.');
    expect(screen.getByText('No batches yet. Create a new batch to get started.')).toBeInTheDocument();
  });

  it('displays batch list when batches exist', async () => {
    const mockBatches = {
      success: true,
      data: {
        items: [
          {
            id: 'batch-001',
            store_id: 'shopee-default-store',
            trigger_type: 'manual',
            status: 'draft',
            priority: 0,
            created_at: '2026-04-11T10:00:00Z',
            updated_at: '2026-04-11T10:00:00Z',
          },
        ],
        total: 1,
      },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBatches),
    });
    render(<BatchesClient />);
    await screen.findByText('batch-001');
    expect(screen.getByText('batch-001')).toBeInTheDocument();
  });
});
