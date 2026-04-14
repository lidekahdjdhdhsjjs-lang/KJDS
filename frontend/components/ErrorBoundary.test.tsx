import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary, ErrorDisplay, isNetworkError, getUserFriendlyError } from '@/components/ErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('displays error message in UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('has try again button that resets error state', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByText('Try again');
    expect(tryAgainButton).toBeInTheDocument();

    // Click the button to reset error state
    fireEvent.click(tryAgainButton);

    // The error boundary should reset and re-render
    // Since we're still throwing, it will catch again
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});

describe('ErrorDisplay', () => {
  it('renders error message', () => {
    render(<ErrorDisplay error="Something failed" />);
    expect(screen.getByText(/Something failed/)).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error="Error" onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('hides retry button when onRetry not provided', () => {
    render(<ErrorDisplay error="Error" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error="Error" onDismiss={onDismiss} />);
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error="Error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('isNetworkError', () => {
  it('returns true for fetch errors', () => {
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
  });

  it('returns true for network errors', () => {
    expect(isNetworkError(new Error('network error'))).toBe(true);
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
  });

  it('returns false for non-network errors', () => {
    expect(isNetworkError(new Error('Some other error'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError('string error')).toBe(false);
  });
});

describe('getUserFriendlyError', () => {
  it('returns network message for network errors', () => {
    const error = new Error('Failed to fetch');
    const message = getUserFriendlyError(error);
    expect(message).toContain('Unable to connect');
    expect(message).toContain('internet connection');
  });

  it('returns not found message for 404 errors', () => {
    const error = new Error('404 not found');
    const message = getUserFriendlyError(error);
    expect(message).toBe('The requested resource was not found.');
  });

  it('returns unauthorized message for 401 errors', () => {
    const error = new Error('401 unauthorized');
    const message = getUserFriendlyError(error);
    expect(message).toContain('not authorized');
    expect(message).toContain('log in');
  });

  it('returns forbidden message for 403 errors', () => {
    const error = new Error('403 forbidden');
    const message = getUserFriendlyError(error);
    expect(message).toContain('do not have permission');
  });

  it('returns server error message for 500 errors', () => {
    const error = new Error('500 internal server error');
    const message = getUserFriendlyError(error);
    expect(message).toContain('server encountered an error');
  });

  it('returns timeout message for timeout errors', () => {
    const error = new Error('request timeout');
    const message = getUserFriendlyError(error);
    expect(message).toContain('timed out');
  });

  it('returns original message for unknown errors', () => {
    const error = new Error('Custom error message');
    const message = getUserFriendlyError(error);
    expect(message).toBe('Custom error message');
  });

  it('returns generic message for non-Error inputs', () => {
    const message = getUserFriendlyError('string error');
    expect(message.toLowerCase()).toContain('unexpected');
  });

  it('returns generic message for null/undefined', () => {
    expect(getUserFriendlyError(null)).toContain('unexpected');
    expect(getUserFriendlyError(undefined)).toContain('unexpected');
  });
});
