import { DashboardClient } from '@/components/DashboardClient';
import {
  fetchDashboardAuthorization,
  fetchDashboardSummary,
  fetchDrafts,
  HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE,
  HEADER_AUTH_DISABLED_MESSAGE,
  type DashboardSummary,
  type DraftList,
  type PlatformAuthorizationStatus,
} from '@/lib/api';

const FALLBACK_SUMMARY: DashboardSummary = {
  pending_candidates: 0,
  ready_for_review: 0,
  approved_today: 0,
  published_today: 0,
  failed_jobs: 1,
};

const FALLBACK_AUTHORIZATION: PlatformAuthorizationStatus = {
  shopee_connected: false,
  alibaba_connected: false,
  can_load_live_data: false,
  missing_connections: ['Shopee', '1688'],
  guidance: 'Connect Shopee and 1688 through their real authorization flows before running live actions.',
};

const FALLBACK_DRAFTS: DraftList = {
  items: [],
};

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InitialFeedback = {
  tone: 'success' | 'error';
  text: string;
};

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  '1688': '1688',
} as const;

function getInitialLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown dashboard loading failure';

  if (message === HEADER_AUTH_DISABLED_MESSAGE) {
    return HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE;
  }

  return `Console is running, but backend data is unavailable right now. ${message}`;
}

function isHeaderAuthDisabledError(error: unknown): boolean {
  return error instanceof Error && error.message === HEADER_AUTH_DISABLED_MESSAGE;
}

function getInitialFeedback(
  searchParams: Record<string, string | string[] | undefined>,
): InitialFeedback | undefined {
  const platformValue = searchParams.authorization_platform;
  const statusValue = searchParams.authorization_status;
  const platform = typeof platformValue === 'string' ? platformValue : undefined;
  const status = typeof statusValue === 'string' ? statusValue : undefined;

  if (!platform || !(platform in PLATFORM_LABELS) || !status) {
    return undefined;
  }

  const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS];

  if (status === 'connected') {
    return {
      tone: 'success',
      text: `${label} authorization is connected. Live status has been refreshed.`,
    };
  }

  if (status === 'error') {
    return {
      tone: 'error',
      text: `${label} authorization failed. Check the platform status and try again.`,
    };
  }

  return undefined;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const resolvedSearchParams = props?.searchParams ? await props.searchParams : {};
  const initialFeedback = getInitialFeedback(resolvedSearchParams);
  const [summaryResult, draftsResult, authorizationResult] = await Promise.allSettled([
    fetchDashboardSummary(),
    fetchDrafts(),
    fetchDashboardAuthorization(),
  ]);

  const initialLoadError = [summaryResult, draftsResult, authorizationResult]
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => getInitialLoadError(result.reason))[0];

  const shouldForceAuthorizationFallback = [summaryResult, draftsResult, authorizationResult].some(
    (result) => result.status === 'rejected' && isHeaderAuthDisabledError(result.reason),
  );

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : FALLBACK_SUMMARY;
  const drafts = draftsResult.status === 'fulfilled' ? draftsResult.value : FALLBACK_DRAFTS;
  const authorization = shouldForceAuthorizationFallback
    ? FALLBACK_AUTHORIZATION
    : authorizationResult.status === 'fulfilled'
      ? authorizationResult.value
      : FALLBACK_AUTHORIZATION;

  if (
    authorizationResult.status === 'rejected'
    && summaryResult.status === 'fulfilled'
  ) {
    return (
      <DashboardClient
        initialSummary={summary}
        initialDrafts={drafts.items}
        initialAuthorization={authorization}
        initialLoadError={initialLoadError}
        initialFeedback={initialFeedback}
      />
    );
  }

  if (
    summaryResult.status === 'rejected'
    && authorizationResult.status === 'fulfilled'
    && draftsResult.status === 'fulfilled'
  ) {
    return (
      <DashboardClient
        initialSummary={FALLBACK_SUMMARY}
        initialDrafts={drafts.items}
        initialAuthorization={authorization}
        initialLoadError={initialLoadError}
        initialFeedback={initialFeedback}
      />
    );
  }

  return (
    <DashboardClient
      initialSummary={summary}
      initialDrafts={drafts.items}
      initialAuthorization={authorization}
      initialLoadError={initialLoadError}
      initialFeedback={initialFeedback}
    />
  );
}
