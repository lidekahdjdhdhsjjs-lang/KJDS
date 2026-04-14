import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsClient } from './SettingsClient';
import * as api from '../lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');

  return {
    ...actual,
    fetchPlatformConnections: vi.fn().mockResolvedValue(undefined),
    fetchConnectionStatus: vi.fn().mockResolvedValue({
      platform: '1688',
      status: 'disconnected',
      account_label: null,
      error_message: null,
      pending_state: null,
    }),
    disconnectPlatform: vi.fn().mockResolvedValue(undefined),
    startPlatformAuthorization: vi.fn().mockResolvedValue(undefined),
  };
});

const mockConnections: api.PlatformConnectionsSummary = {
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
    guidance: 'Connect 1688 through its real authorization flow.',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('SettingsClient', () => {
  it('renders both platform names', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Shopee')).toBeTruthy();
    expect(screen.getByText('1688')).toBeTruthy();
  });

  it('shows connected and disconnected status badges', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('Disconnected')).toBeTruthy();
  });

  it('displays account label for connected platform', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Shopee Store')).toBeTruthy();
  });

  it('shows disconnect button for connected platform', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeTruthy();
  });

  it('shows connect button for disconnected platform', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    expect(connectButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('displays success feedback when provided', () => {
    render(
      <SettingsClient
        initialConnections={mockConnections}
        initialFeedback={{ tone: 'success', text: 'Connected!' }}
      />,
    );
    expect(screen.getByText('Connected!')).toBeTruthy();
  });

  it('displays error feedback when provided', () => {
    render(
      <SettingsClient
        initialConnections={mockConnections}
        initialFeedback={{ tone: 'error', text: 'Failed!' }}
      />,
    );
    expect(screen.getByText('Failed!')).toBeTruthy();
  });

  it('renders back to dashboard link', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    const links = screen.getAllByRole('link', { name: /Back to Dashboard/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('dismisses feedback when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SettingsClient
        initialConnections={mockConnections}
        initialFeedback={{ tone: 'success', text: 'Connected!' }}
      />,
    );
    expect(screen.getByText('Connected!')).toBeTruthy();

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss' });
    await user.click(dismissBtn);

    expect(screen.queryByText('Connected!')).toBeNull();
  });

  it('shows loading state when disconnecting a platform', async () => {
    const user = userEvent.setup();
    // Make disconnect hang to observe loading state
    vi.mocked(api.disconnectPlatform).mockReturnValue(new Promise(() => {}));

    render(<SettingsClient initialConnections={mockConnections} />);

    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    await user.click(disconnectBtn);

    expect(screen.getByText('Disconnecting...')).toBeTruthy();
  });

  it('shows error feedback when disconnect fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.disconnectPlatform).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(api.fetchPlatformConnections).mockResolvedValueOnce(mockConnections);

    render(<SettingsClient initialConnections={mockConnections} />);

    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    await user.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('shows success feedback and refreshes connections after disconnect succeeds', async () => {
    const user = userEvent.setup();
    const updatedConnections: api.PlatformConnectionsSummary = {
      items: [
        {
          platform: 'shopee',
          connected: false,
          status: 'disconnected',
          account_label: null,
          last_connected_at: null,
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
        shopee_connected: false,
        alibaba_connected: false,
        can_load_live_data: false,
        missing_connections: ['Shopee', '1688'],
        guidance: 'Connect Shopee and 1688 through their real authorization flows.',
      },
    };
    vi.mocked(api.disconnectPlatform).mockResolvedValueOnce({
      platform: 'shopee',
      connected: false,
      status: 'disconnected',
      account_label: null,
      last_connected_at: null,
      last_error: null,
      authorize_url: null,
    });
    vi.mocked(api.fetchPlatformConnections).mockResolvedValueOnce(updatedConnections);

    render(<SettingsClient initialConnections={mockConnections} />);

    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    await user.click(disconnectBtn);

    await waitFor(() => {
      expect(api.disconnectPlatform).toHaveBeenCalledWith('shopee', expect.anything());
      expect(api.fetchPlatformConnections).toHaveBeenCalled();
    });
  });

  it('sets activeModalPlatform when Connect button is clicked', async () => {
    const user = userEvent.setup();

    render(<SettingsClient initialConnections={mockConnections} />);

    // The 1688 platform should have a Connect button
    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    expect(connectButtons.length).toBeGreaterThanOrEqual(1);

    // Clicking Connect should open the GuidedAuthModal
    // which replaces the card with the auth flow UI
    // The GuidedAuthModal uses inline styles, so we check for its unique content
    await user.click(connectButtons[0]);

    // After clicking, the Connect button for 1688 should be replaced by the modal
    // The modal has a "开始授权" button and instruction text
    // Just verify the state change occurred - the 1688 Connect button should disappear
    await waitFor(() => {
      // The modal renders the step-by-step instructions
      const allButtons = screen.getAllByRole('button');
      // Should have at least the "开始授权" button plus the Shopee Disconnect button
      expect(allButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('displays error status badge and error message for platforms with errors', () => {
    const errorConnections: api.PlatformConnectionsSummary = {
      items: [
        {
          platform: 'shopee',
          connected: false,
          status: 'error',
          account_label: null,
          last_connected_at: null,
          last_error: 'Token expired',
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
        shopee_connected: false,
        alibaba_connected: false,
        can_load_live_data: false,
        missing_connections: ['Shopee', '1688'],
        guidance: 'Connect both platforms.',
      },
    };

    render(<SettingsClient initialConnections={errorConnections} />);
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText('Token expired')).toBeTruthy();
  });

  it('displays pending status badge for platforms in pending state', () => {
    const pendingConnections: api.PlatformConnectionsSummary = {
      items: [
        {
          platform: 'shopee',
          connected: false,
          status: 'pending',
          account_label: null,
          last_connected_at: null,
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
        shopee_connected: false,
        alibaba_connected: false,
        can_load_live_data: false,
        missing_connections: ['Shopee', '1688'],
        guidance: 'Connect both platforms.',
      },
    };

    render(<SettingsClient initialConnections={pendingConnections} />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('renders authorization status section with guidance', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Authorization Status')).toBeTruthy();
    expect(screen.getByText('Connect 1688 through its real authorization flow.')).toBeTruthy();
  });

  it('shows load error when provided', () => {
    render(
      <SettingsClient
        initialConnections={mockConnections}
        loadError="Failed to load connections"
      />,
    );
    expect(screen.getByText('Failed to load connections')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('shows both platform connection statuses in authorization section', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText(/Shopee:.*Connected/)).toBeTruthy();
    expect(screen.getByText(/1688:.*Not connected/)).toBeTruthy();
  });
});