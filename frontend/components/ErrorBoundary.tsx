'use client';

import { Component, ReactNode } from 'react';

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
            padding: 24,
            textAlign: 'center',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            color: '#b91c1c',
          }}
        >
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#7f1d1d' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              backgroundColor: '#dc2626',
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

// Reusable error display component
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
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <strong>Error:</strong> {error}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              backgroundColor: '#dc2626',
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
              padding: '6px 12px',
              borderRadius: 6,
              backgroundColor: '#f1f5f9',
              color: '#64748b',
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

// Network error detection utility
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

// User-friendly error message generator
export function getUserFriendlyError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  if (error instanceof Error) {
    // Clean up common API error messages
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
