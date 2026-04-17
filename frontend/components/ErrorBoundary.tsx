'use client';

import { Component, ReactNode } from 'react';
import { colors, borderRadius, spacing } from '@/lib/design-system';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: spacing[6],
            textAlign: 'center',
            backgroundColor: colors.errorLight,
            border: `1px solid ${colors.error}`,
            borderRadius: borderRadius.md,
            color: colors.error,
          }}
        >
          <h2 style={{ margin: `0 0 ${spacing[3]}px`, fontSize: 18, color: colors.error }}>Something went wrong</h2>
          <p style={{ margin: `0 0 ${spacing[4]}px`, fontSize: 14, color: colors.error }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: `${spacing[2] + 2}px ${spacing[5]}px`,
              borderRadius: borderRadius.base,
              backgroundColor: colors.error,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      style={{
        padding: spacing[4],
        marginBottom: spacing[4],
        borderRadius: borderRadius.base,
        backgroundColor: colors.errorLight,
        border: `1px solid ${colors.error}`,
        color: colors.error,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing[3],
      }}
    >
      <div style={{ flex: 1 }}>
        <strong>Error:</strong> {error}
      </div>
      <div style={{ display: 'flex', gap: spacing[2] }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: `${spacing[1] + 2}px ${spacing[3]}px`,
              borderRadius: borderRadius.base,
              backgroundColor: colors.error,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              padding: `${spacing[1] + 2}px ${spacing[3]}px`,
              borderRadius: borderRadius.base,
              backgroundColor: colors.background,
              color: colors.textSecondary,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network request failed')
    );
  }
  return false;
}

export function getUserFriendlyError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  if (error instanceof Error) {
    const message = error.message;

    if (message.includes('404') || message.includes('not found')) {
      return 'The requested resource was not found.';
    }

    if (message.includes('401') || message.includes('unauthorized')) {
      return 'You are not authorized to perform this action. Please log in again.';
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    if (message.includes('500') || message.includes('internal server error')) {
      return 'The server encountered an error. Please try again later.';
    }

    if (message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }

    return message;
  }

  return 'An unexpected error occurred. Please try again.';
}
