import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsClient } from '@/components/SettingsClient';
import type { PlatformConnectionsSummary } from '@/lib/api';

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
    guidance: 'Connect 1688 through its real authorization flow.',
  },
};

describe('SettingsClient', () => {
  it('renders both platform names', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Shopee')).toBeInTheDocument();
    expect(screen.getByText('1688')).toBeInTheDocument();
  });

  it('shows connected and disconnected status badges', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('displays account label for connected platform', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByText('Shopee Store')).toBeInTheDocument();
  });

  it('shows disconnect button for connected platform', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
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
      />
    );
    expect(screen.getByText('Connected!')).toBeInTheDocument();
  });

  it('displays error feedback when provided', () => {
    render(
      <SettingsClient
        initialConnections={mockConnections}
        initialFeedback={{ tone: 'error', text: 'Failed!' }}
      />
    );
    expect(screen.getByText('Failed!')).toBeInTheDocument();
  });

  it('renders back to dashboard link', () => {
    render(<SettingsClient initialConnections={mockConnections} />);
    const links = screen.getAllByRole('link', { name: /Back to Dashboard/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
