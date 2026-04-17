import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserProfilesClient } from './BrowserProfilesClient';

const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch;
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BrowserProfilesClient', () => {
  it('renders loading state initially', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<BrowserProfilesClient />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders header with title and action buttons', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<BrowserProfilesClient />);
    await waitFor(() => {
      expect(screen.getByText('指纹浏览器池')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /添加代理/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /新建配置/ })).toBeTruthy();
  });

  it('renders stats cards', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<BrowserProfilesClient />);
    await waitFor(() => {
      expect(screen.getByText('活跃配置')).toBeTruthy();
    });
    expect(screen.getByText('运行中会话')).toBeTruthy();
    expect(screen.getByText('可用代理')).toBeTruthy();
    expect(screen.getByText('覆盖地区')).toBeTruthy();
  });

  it('renders tabs for profiles, proxies, and sessions', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<BrowserProfilesClient />);
    await waitFor(() => {
      expect(screen.getByText(/浏览器配置 \(0\)/)).toBeTruthy();
    });
    expect(screen.getByText(/代理池 \(0\)/)).toBeTruthy();
    expect(screen.getByText(/活跃会话 \(0\)/)).toBeTruthy();
  });

  it('shows profile cards when loaded via initial props', async () => {
    const profiles = [
      {
        id: 'bp-001',
        name: 'Vietnam Shopee Bot',
        region: 'VN',
        store_id: null,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        viewport_width: 1920,
        viewport_height: 1080,
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi-VN',
        webgl_vendor: 'Intel Inc.',
        webgl_renderer: 'Intel Iris',
        proxy_host: '123.45.67.89',
        proxy_port: 8080,
        proxy_type: 'http',
        is_active: true,
        is_locked: false,
        last_used_at: '2024-01-01T10:00:00Z',
        total_uses: 42,
        created_at: '2024-01-01T10:00:00Z',
      },
    ];
    render(<BrowserProfilesClient initialProfiles={profiles as any} initialProxies={[]} initialSessions={[]} />);
    await waitFor(() => {
      expect(screen.getByText('Vietnam Shopee Bot')).toBeTruthy();
    });
    expect(screen.getByText('🇻🇳 Vietnam')).toBeTruthy();
    expect(screen.getByText(/代理: 123.45.67.89:8080/)).toBeTruthy();
    expect(screen.getByText('使用: 42次')).toBeTruthy();
  });

  it('shows proxy health data when switching to proxies tab', async () => {
    const proxies = [
      {
        id: 'px-001',
        host: '45.67.89.123',
        port: 8080,
        proxy_type: 'http',
        country: 'TH',
        region: null,
        city: 'Bangkok',
        is_active: true,
        health_score: 0.92,
        success_count: 150,
        failure_count: 12,
        avg_response_time_ms: 245,
      },
    ];
    const user = userEvent.setup();
    render(<BrowserProfilesClient initialProfiles={[]} initialProxies={proxies as any} initialSessions={[]} />);

    // Click the proxies tab
    await user.click(screen.getByText(/代理池 \(1\)/));

    await waitFor(() => {
      expect(screen.getByText('45.67.89.123:8080')).toBeTruthy();
    });
    expect(screen.getByText(/Bangkok, TH/)).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('245ms')).toBeTruthy();
  });

  it('opens create profile modal when button is clicked', async () => {
    const profiles = [
      {
        id: 'bp-001', name: 'Test', region: 'SG', store_id: null,
        user_agent: 'Chrome/120', viewport_width: 1920, viewport_height: 1080,
        timezone: 'Asia/Singapore', language: 'en', webgl_vendor: 'Intel',
        webgl_renderer: 'Iris', proxy_host: null, proxy_port: null,
        proxy_type: 'http', is_active: true, is_locked: false,
        last_used_at: null, total_uses: 0, created_at: '2024-01-01T10:00:00Z',
      },
    ];
    const user = userEvent.setup();
    render(<BrowserProfilesClient initialProfiles={profiles as any} initialProxies={[]} initialSessions={[]} />);

    await user.click(screen.getByRole('button', { name: /新建配置/ }));

    await waitFor(() => {
      expect(screen.getByText('创建浏览器配置')).toBeTruthy();
    });
    expect(screen.getByPlaceholderText('例如：越南店-竞品分析')).toBeTruthy();
  });

  it('switches tabs between profiles, proxies, and sessions', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    render(<BrowserProfilesClient />);

    // Default is profiles tab
    const profilesTab = await screen.findByText(/浏览器配置 \(0\)/);
    expect(profilesTab).toBeTruthy();

    // Switch to proxies
    await user.click(screen.getByText(/代理池 \(0\)/));

    // Switch to sessions
    await user.click(screen.getByText(/活跃会话 \(0\)/));

    await waitFor(() => {
      expect(screen.getByText('暂无活跃会话')).toBeTruthy();
    });
  });
});
