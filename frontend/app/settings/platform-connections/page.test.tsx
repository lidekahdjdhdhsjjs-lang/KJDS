import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { PlatformConnectionsSummary, ActingOperator } from '@/lib/api';

// Mock fetchPlatformConnections at module level
const mockFetchPlatformConnections = vi.fn();

// Create mock ACTOR_PRESETS
const mockActorPreset: ActingOperator = {
  id: 'operator',
  label: 'Operator',
  description: 'Standard operator mode',
};

vi.mock('@/lib/api', () => ({
  fetchPlatformConnections: () => mockFetchPlatformConnections(),
  ACTOR_PRESETS: {
    operator: mockActorPreset,
    reviewer: mockActorPreset,
    admin: mockActorPreset,
  },
}));

const mockConnections: PlatformConnectionsSummary = {
  items: [
    {
      platform: 'shopee',
      connected: true,
      status: 'connected',
      account_label: 'Shopee Store',
      last_connected_at: '2024-01-01T00:00:00Z',
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
    guidance: 'Connect 1688.',
  },
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with platform names', async () => {
    mockFetchPlatformConnections.mockResolvedValue(mockConnections);

    const { default: SettingsPage } = await import('@/app/settings/platform-connections/page');
    const page = await SettingsPage({});
    render(page);

    await waitFor(() => {
      expect(screen.getByText('Shopee')).toBeInTheDocument();
      expect(screen.getByText('1688')).toBeInTheDocument();
    });
  });

  it('displays success feedback from callback', async () => {
    mockFetchPlatformConnections.mockResolvedValue(mockConnections);

    const { default: SettingsPage } = await import('@/app/settings/platform-connections/page');
    const page = await SettingsPage({
      searchParams: Promise.resolve({
        authorization_platform: 'shopee',
        authorization_status: 'connected',
      }),
    });
    render(page);

    await waitFor(() => {
      expect(screen.getByText(/connected successfully/i)).toBeInTheDocument();
    });
  });

  it('displays error feedback from failed callback', async () => {
    mockFetchPlatformConnections.mockResolvedValue(mockConnections);

    const { default: SettingsPage } = await import('@/app/settings/platform-connections/page');
    const page = await SettingsPage({
      searchParams: Promise.resolve({
        authorization_platform: '1688',
        authorization_status: 'error',
      }),
    });
    render(page);

    await waitFor(() => {
      expect(screen.getByText(/authorization failed/i)).toBeInTheDocument();
    });
  });
});
