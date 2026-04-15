import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';

import { AgentRunsClient } from './AgentRunsClient';

const mockRuns = [
  {
    id: 'run-001',
    agent_name: 'opportunity_discovery',
    model_name: 'claude-3-5-sonnet',
    entity_type: 'opportunity_item',
    entity_id: 'item-001',
    input_summary: 'Analyzing product data',
    output_summary: 'Found 5 opportunities',
    evidence_payload: null,
    cost_payload: '{"tokens": 5000}',
    status: 'completed',
    started_at: '2024-01-01T10:00:00Z',
    ended_at: '2024-01-01T10:05:00Z',
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
    json: () => Promise.resolve({ success: true, data: { items: mockRuns, total: 1 } }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AgentRunsClient', () => {
  it('renders page heading and description', async () => {
    const { container } = render(<AgentRunsClient />);
    await waitFor(() => {
      expect(container.textContent).toContain('Agent Runs');
    });
    expect(container.textContent).toContain('Track AI agent execution');
  });

  it('renders main container element', async () => {
    const { container } = render(<AgentRunsClient />);
    await waitFor(() => {
      expect(container.querySelector('main')).toBeTruthy();
    });
  });

  it('renders two filter dropdowns', async () => {
    const { container } = render(<AgentRunsClient />);
    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('fetches agent runs on mount', async () => {
    render(<AgentRunsClient />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/agent-runs'),
        expect.any(Object),
      );
    });
  });
});
