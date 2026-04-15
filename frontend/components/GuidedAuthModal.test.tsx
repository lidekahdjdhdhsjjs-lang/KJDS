import '@testing-library/jest-dom';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';

import { GuidedAuthModal } from './GuidedAuthModal';
import {
  type ConnectionStatus,
  type PlatformAuthorizationStartResponse,
} from '@/lib/api';
import * as api from '@/lib/api';

// Mock API functions
vi.mock('@/lib/api', () => ({
  fetchConnectionStatus: vi.fn(),
  startPlatformAuthorization: vi.fn(),
  disconnectPlatform: vi.fn(),
}));

const PLATFORM: 'shopee' | '1688' = 'shopee';
const PLATFORM_LABEL = 'Shopee';
const PLATFORM_COLOR = '#EE4D2D';

const mockConnectionStatus = (overrides: Partial<ConnectionStatus> = {}): ConnectionStatus => ({
  platform: PLATFORM,
  status: 'disconnected',
  account_label: null,
  error_message: null,
  pending_state: null,
  ...overrides,
});

const mockStartAuthResponse: PlatformAuthorizationStartResponse = {
  platform: PLATFORM,
  status: 'pending',
  authorize_url: 'https://auth.shopee.test/oauth?client_id=test&redirect_uri=test',
  pending_state: 'initial_pending_state_123',
};

describe('GuidedAuthModal', () => {
  let windowOpenSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    windowOpenSpy = vi.fn();
    // Mock window.open
    window.open = windowOpenSpy as unknown as typeof window.open;
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Initial idle state
  // ---------------------------------------------------------------------------
  describe('Initial idle state', () => {
    it('renders title, 3-step instructions, and start auth button', () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Title
      expect(screen.getByText(`连接 ${PLATFORM_LABEL} 账号`)).toBeInTheDocument();

      // 3-step instructions
      expect(screen.getByText('点击下方「开始授权」按钮')).toBeInTheDocument();
      expect(screen.getByText(`在跳转的页面登录 ${PLATFORM_LABEL} 并点击授权`)).toBeInTheDocument();
      expect(screen.getByText('授权完成后页面将自动更新状态')).toBeInTheDocument();

      // Start button
      expect(screen.getByRole('button', { name: '开始授权' })).toBeInTheDocument();
      expect(screen.getByText('🚀 开始授权')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Start auth flow
  // ---------------------------------------------------------------------------
  describe('Start auth flow', () => {
    it('calls startPlatformAuthorization, opens new tab, and transitions to pending state', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());
      (api.startPlatformAuthorization as ReturnType<typeof vi.fn>).mockResolvedValue(mockStartAuthResponse);

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Click start auth button
      await act(async () => {
        screen.getByRole('button', { name: '开始授权' }).click();
        // Run timers to allow the async operations to complete
        await vi.runAllTimers();
      });

      // startPlatformAuthorization called
      expect(api.startPlatformAuthorization).toHaveBeenCalledWith(PLATFORM);

      // window.open called with authorize_url and '_blank'
      expect(windowOpenSpy).toHaveBeenCalledWith(mockStartAuthResponse.authorize_url, '_blank');

      // Transitions to pending state
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消授权' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Polling with pending_state mismatch
  // ---------------------------------------------------------------------------
  describe('Polling with pending_state mismatch', () => {
    it('continues polling when API returns different pending_state', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());
      (api.startPlatformAuthorization as ReturnType<typeof vi.fn>).mockResolvedValue(mockStartAuthResponse);

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Start auth
      await act(async () => {
        screen.getByRole('button', { name: '开始授权' }).click();
        await vi.runAllTimers();
      });

      // Should be in pending state
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();

      // Simulate poll returning a different pending_state (not yet connected)
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConnectionStatus({
          status: 'pending',
          pending_state: 'different_pending_state_456',
        }),
      );

      // Advance timer to trigger poll (POLL_INTERVAL = 2000ms)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should still be in pending state (not transitioned)
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();
      // Should NOT show connected state
      expect(screen.queryByText(`已连接 ${PLATFORM_LABEL}`)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Successful connection
  // ---------------------------------------------------------------------------
  describe('Successful connection', () => {
    it('transitions to connected state showing "✅ 已连接 {platformLabel}" and disconnect button', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());
      (api.startPlatformAuthorization as ReturnType<typeof vi.fn>).mockResolvedValue(mockStartAuthResponse);

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Start auth
      await act(async () => {
        screen.getByRole('button', { name: '开始授权' }).click();
        await vi.runAllTimers();
      });

      // Should be in pending state
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();

      // Simulate API returning connected status
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConnectionStatus({
          status: 'connected',
          account_label: 'shop-001',
          pending_state: null,
        }),
      );

      // Advance timer to trigger poll and transition
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should show connected state
      expect(screen.getByText(`已连接 ${PLATFORM_LABEL}`)).toBeInTheDocument();
      expect(screen.getByText('账号：shop-001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '断开连接' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Error state
  // ---------------------------------------------------------------------------
  describe('Error state', () => {
    it('transitions to error state showing "授权失败" and "重新授权" button', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());
      (api.startPlatformAuthorization as ReturnType<typeof vi.fn>).mockResolvedValue(mockStartAuthResponse);

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Start auth
      await act(async () => {
        screen.getByRole('button', { name: '开始授权' }).click();
        await vi.runAllTimers();
      });

      // Should be in pending state
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();

      // Simulate API returning error status
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConnectionStatus({
          status: 'error',
          error_message: 'Authorization declined by user',
          pending_state: null,
        }),
      );

      // Advance timer to trigger poll and transition
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should show error state
      expect(screen.getByText('授权失败')).toBeInTheDocument();
      expect(screen.getByText('Authorization declined by user')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重新授权' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Timeout state
  // ---------------------------------------------------------------------------
  describe('Timeout state', () => {
    it('transitions to timeout state after POLL_TIMEOUT (300000ms)', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnectionStatus());
      (api.startPlatformAuthorization as ReturnType<typeof vi.fn>).mockResolvedValue(mockStartAuthResponse);

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Start auth
      await act(async () => {
        screen.getByRole('button', { name: '开始授权' }).click();
        await vi.runAllTimers();
      });

      // Should be in pending state
      expect(screen.getByText('等待授权中...')).toBeInTheDocument();

      // Simulate API still pending (not connected yet)
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConnectionStatus({
          status: 'pending',
          pending_state: 'initial_pending_state_123',
        }),
      );

      // Advance timer beyond POLL_TIMEOUT (300000ms)
      await act(async () => {
        vi.advanceTimersByTime(300000);
        await vi.runAllTimers();
      });

      // Should show timeout state
      expect(screen.getByText('授权超时')).toBeInTheDocument();
      expect(screen.getByText('请在弹出的页面完成授权，或网络连接不稳定。')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '重新授权' })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Disconnect flow
  // ---------------------------------------------------------------------------
  describe('Disconnect flow', () => {
    it('calls disconnectPlatform and returns to idle state', async () => {
      (api.fetchConnectionStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockConnectionStatus({
          status: 'connected',
          account_label: 'shop-001',
        }),
      );
      (api.disconnectPlatform as ReturnType<typeof vi.fn>).mockResolvedValue({
        platform: PLATFORM,
        connected: false,
        status: 'disconnected',
        account_label: null,
        last_connected_at: null,
        last_error: null,
        authorize_url: null,
      });

      render(
        createElement(GuidedAuthModal, {
          platform: PLATFORM,
          platformLabel: PLATFORM_LABEL,
          platformColor: PLATFORM_COLOR,
        }),
      );

      // Wait for connected state to appear
      await act(async () => {
        await vi.runAllTimers();
      });

      // Should be in connected state
      expect(screen.getByText(`已连接 ${PLATFORM_LABEL}`)).toBeInTheDocument();

      // Click disconnect
      await act(async () => {
        screen.getByRole('button', { name: '断开连接' }).click();
        await vi.runAllTimers();
      });

      // disconnectPlatform should be called
      expect(api.disconnectPlatform).toHaveBeenCalledWith(PLATFORM);

      // Should return to idle state
      expect(screen.getByText(`连接 ${PLATFORM_LABEL} 账号`)).toBeInTheDocument();
      expect(screen.getByText('🚀 开始授权')).toBeInTheDocument();
    });
  });
});
