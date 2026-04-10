'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  type PlatformConnectionStatus,
  type PlatformConnectionsSummary,
  type PlatformAuthorizationStartResponse,
  type ActingOperator,
  ACTOR_PRESETS,
  fetchPlatformConnections,
  startPlatformAuthorization,
  disconnectPlatform,
} from '@/lib/api';

type SettingsClientProps = {
  initialConnections: PlatformConnectionsSummary;
  initialFeedback?: { tone: 'success' | 'error'; text: string };
  loadError?: string;
};

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  '1688': '1688',
} as const;

type Feedback = {
  tone: 'success' | 'error';
  text: string;
};

export function SettingsClient({
  initialConnections,
  initialFeedback,
  loadError: initialLoadError,
}: SettingsClientProps) {
  const [connections, setConnections] = useState<PlatformConnectionsSummary>(initialConnections);
  const [feedback, setFeedback] = useState<Feedback | undefined>(initialFeedback);
  const [loadError, setLoadError] = useState<string | undefined>(initialLoadError);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [actor] = useState<ActingOperator>(ACTOR_PRESETS.operator);

  const handleConnect = async (platform: 'shopee' | '1688') => {
    setFeedback(undefined);
    setLoadingPlatform(platform);
    try {
      const response: PlatformAuthorizationStartResponse = await startPlatformAuthorization(platform, actor);
      window.location.assign(response.authorize_url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start authorization';
      setFeedback({ tone: 'error', text: message });
      setLoadingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: 'shopee' | '1688') => {
    setFeedback(undefined);
    setLoadingPlatform(platform);
    try {
      await disconnectPlatform(platform, actor);
      const updated = await fetchPlatformConnections();
      setConnections(updated);
      setFeedback({
        tone: 'success',
        text: `${PLATFORM_LABELS[platform]} disconnected successfully.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect';
      setFeedback({ tone: 'error', text: message });
    } finally {
      setLoadingPlatform(null);
    }
  };

  const dismissFeedback = () => setFeedback(undefined);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Platform Connections
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your Shopee and 1688 marketplace authorizations
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Back to Dashboard
          </Link>
        </header>

        {feedback && (
          <div
            className={`mb-6 rounded-md border px-4 py-3 ${
              feedback.tone === 'success'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{feedback.text}</span>
              <button
                onClick={dismissFeedback}
                className="text-sm opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {loadError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p>{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="space-y-4">
          {connections.items.map((conn: PlatformConnectionStatus) => {
            const label = PLATFORM_LABELS[conn.platform];
            const isLoading = loadingPlatform === conn.platform;
            const isConnected = conn.connected && conn.status === 'connected';
            const isPending = conn.status === 'pending';
            const hasError = conn.status === 'error';

            return (
              <div
                key={conn.platform}
                className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                        {label}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isConnected
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : isPending
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : hasError
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {isConnected ? 'Connected' : isPending ? 'Pending' : hasError ? 'Error' : 'Disconnected'}
                      </span>
                    </div>

                    {isConnected && conn.account_label && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {conn.account_label}
                      </p>
                    )}

                    {hasError && conn.last_error && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {conn.last_error}
                      </p>
                    )}

                    {conn.last_connected_at && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        Last connected: {new Date(conn.last_connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(conn.platform)}
                        disabled={isLoading}
                        className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        {isLoading ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(conn.platform)}
                        disabled={isLoading || isPending}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                      >
                        {isLoading ? 'Starting...' : isPending ? 'Pending...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Authorization Status
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {connections.authorization.guidance}
          </p>
          <div className="mt-3 flex gap-4 text-xs">
            <span
              className={
                connections.authorization.shopee_connected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-zinc-500'
              }
            >
              Shopee: {connections.authorization.shopee_connected ? '✓ Connected' : '○ Not connected'}
            </span>
            <span
              className={
                connections.authorization.alibaba_connected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-zinc-500'
              }
            >
              1688: {connections.authorization.alibaba_connected ? '✓ Connected' : '○ Not connected'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
