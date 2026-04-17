// frontend/components/GuidedAuthModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchConnectionStatus,
  startPlatformAuthorization,
  disconnectPlatform,
  type ConnectionStatus,
} from '@/lib/api';
import { colors, borderRadius, spacing, typography } from '@/lib/design-system';

const POLL_INTERVAL = 2000; // ms
const POLL_TIMEOUT = 300000; // 5 minutes

type AuthState = 'idle' | 'loading' | 'pending' | 'connected' | 'error' | 'timeout';

type Props = {
  platform: 'shopee' | '1688';
  platformLabel: string;
  platformColor: string;
  onStateChange?: (connected: boolean) => void;
};

export function GuidedAuthModal({ platform, platformLabel, platformColor, onStateChange }: Props) {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const errorRetryButtonRef = useRef<HTMLButtonElement>(null);
  const timeoutRetryButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const startAuthButtonRef = useRef<HTMLButtonElement>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await fetchConnectionStatus(platform);
      setConnectionStatus(status);
      if (status.status === 'connected') {
        setAuthState('connected');
        onStateChange?.(true);
      } else if (status.status === 'error') {
        setAuthState('error');
        setErrorMessage(status.error_message || 'Authorization failed');
      }
    } catch (err) {
      console.warn('Status check unavailable:', err);
    }
  }, [platform, onStateChange]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((initialPendingState: string) => {
    stopPolling();
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);

    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      if (Date.now() - startTimeRef.current > POLL_TIMEOUT) {
        stopPolling();
        setAuthState('timeout');
        return;
      }

      try {
        const status = await fetchConnectionStatus(platform);
        if (status.pending_state && status.pending_state !== initialPendingState) return;
        if (status.status === 'connected') {
          stopPolling();
          setAuthState('connected');
          setConnectionStatus(status);
          onStateChange?.(true);
        } else if (status.status === 'error') {
          stopPolling();
          setAuthState('error');
          setErrorMessage(status.error_message || 'Authorization failed');
        }
      } catch (err) {
        console.warn('Status check unavailable:', err);
      }
    }, POLL_INTERVAL);
  }, [platform, onStateChange, stopPolling]);

  const handleStartAuth = useCallback(async () => {
    setAuthState('loading');
    setErrorMessage('');
    try {
      const result = await startPlatformAuthorization(platform);
      window.open(result.authorize_url, '_blank');
      setAuthState('pending');
      startPolling(result.pending_state);
      cancelButtonRef.current?.focus();
    } catch (err) {
      setAuthState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start authorization');
      errorRetryButtonRef.current?.focus();
    }
  }, [platform, startPolling]);

  const handleDisconnect = useCallback(async () => {
    setAuthState('loading');
    try {
      await disconnectPlatform(platform);
      setAuthState('idle');
      setConnectionStatus(null);
      onStateChange?.(false);
    } catch (err) {
      setAuthState('connected');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, [platform, onStateChange]);

  const handleRetry = useCallback((focusRef?: React.RefObject<HTMLButtonElement | null>) => {
    setAuthState('idle');
    setErrorMessage('');
    focusRef?.current?.focus();
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const buttonBase = {
    padding: `${spacing[1] + 2}px ${spacing[4]}px`,
    border: 'none',
    borderRadius: borderRadius.base,
    cursor: 'pointer' as const,
    fontWeight: 600,
  };

  if (authState === 'connected') {
    return (
      <div style={{ padding: spacing[4], background: colors.successLight, borderRadius: borderRadius.base, border: `1px solid ${colors.success}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ fontWeight: 600, color: colors.success }}>已连接 {platformLabel}</span>
        </div>
        <div style={{ color: colors.success, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
          账号：{connectionStatus?.account_label || '—'}
        </div>
        <button
          onClick={handleDisconnect}
          aria-label="断开连接"
          style={{ ...buttonBase, background: colors.errorLight, color: colors.error }}
        >
          断开连接
        </button>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div style={{ padding: spacing[4], background: colors.errorLight, borderRadius: borderRadius.base, border: `1px solid ${colors.error}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span style={{ fontWeight: 600, color: colors.error }}>授权失败</span>
        </div>
        <div style={{ color: colors.error, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
          {errorMessage || '未知错误'}
        </div>
        <button
          ref={errorRetryButtonRef}
          onClick={() => handleRetry(errorRetryButtonRef)}
          aria-label="重新授权"
          style={{ ...buttonBase, background: platformColor, color: '#fff' }}
        >
          重新授权
        </button>
      </div>
    );
  }

  if (authState === 'timeout') {
    return (
      <div style={{ padding: spacing[4], background: colors.warningLight, borderRadius: borderRadius.base, border: `1px solid ${colors.warning}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <span style={{ fontSize: '20px' }}>⏰</span>
          <span style={{ fontWeight: 600, color: colors.warning }}>授权超时</span>
        </div>
        <div style={{ color: colors.warning, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
          请在弹出的页面完成授权，或网络连接不稳定。
        </div>
        <button
          ref={timeoutRetryButtonRef}
          onClick={() => handleRetry(timeoutRetryButtonRef)}
          aria-label="重新授权"
          style={{ ...buttonBase, background: platformColor, color: '#fff' }}
        >
          重新授权
        </button>
      </div>
    );
  }

  if (authState === 'pending') {
    return (
      <div style={{ padding: spacing[4], background: colors.infoLight, borderRadius: borderRadius.base, border: `1px solid ${colors.info}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <span style={{ fontSize: '20px' }}>🔄</span>
          <span style={{ fontWeight: 600, color: colors.info }}>等待授权中...</span>
        </div>
        <div style={{ color: colors.info, fontSize: typography.fontSize.sm, marginBottom: spacing[2] }}>
          请在弹出的页面完成 {platformLabel} 账号登录和授权
        </div>
        <div style={{ color: colors.textSecondary, fontSize: typography.fontSize.xs, marginBottom: spacing[3] }} aria-live="polite">
          已等待 {elapsedSeconds} 秒
        </div>
        <button
          ref={cancelButtonRef}
          onClick={() => { stopPolling(); setAuthState('idle'); }}
          aria-label="取消授权"
          style={{ ...buttonBase, background: colors.border, color: colors.text }}
        >
          取消
        </button>
      </div>
    );
  }

  // idle / loading
  return (
    <div style={{ padding: spacing[4], background: colors.background, borderRadius: borderRadius.base, border: `1px solid ${colors.border}` }}>
      <div style={{ fontWeight: 600, marginBottom: spacing[3] }}>连接 {platformLabel} 账号</div>
      <ol style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[4], paddingLeft: `${spacing[5]}px` }}>
        <li>点击下方「开始授权」按钮</li>
        <li>在跳转的页面登录 {platformLabel} 并点击授权</li>
        <li>授权完成后页面将自动更新状态</li>
      </ol>
      <button
        ref={startAuthButtonRef}
        onClick={handleStartAuth}
        aria-label="开始授权"
        disabled={authState === 'loading'}
        style={{
          ...buttonBase,
          background: platformColor,
          color: '#fff',
          cursor: authState === 'loading' ? 'not-allowed' : 'pointer',
          opacity: authState === 'loading' ? 0.7 : 1,
        }}
      >
        {authState === 'loading' ? '启动中...' : '🚀 开始授权'}
      </button>
    </div>
  );
}
