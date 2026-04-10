import { SettingsClient } from '@/components/SettingsClient';
import {
  fetchPlatformConnections,
  HEADER_AUTH_DISABLED_MESSAGE,
  HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE,
  type PlatformConnectionsSummary,
} from '@/lib/api';

const FALLBACK_CONNECTIONS: PlatformConnectionsSummary = {
  items: [],
  authorization: {
    shopee_connected: false,
    alibaba_connected: false,
    can_load_live_data: false,
    missing_connections: ['Shopee', '1688'],
    guidance: 'Connect Shopee and 1688 through their real authorization flows.',
  },
};

type SettingsPageProps = {
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
  const message = error instanceof Error ? error.message : 'Unknown settings loading failure';

  if (message === HEADER_AUTH_DISABLED_MESSAGE) {
    return HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE;
  }

  return `Settings are unavailable right now. ${message}`;
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
      text: `${label} authorization connected successfully.`,
    };
  }

  if (status === 'error') {
    return {
      tone: 'error',
      text: `${label} authorization failed. Please try again.`,
    };
  }

  return undefined;
}

export default async function SettingsPage(props: SettingsPageProps) {
  const resolvedSearchParams = props?.searchParams ? await props.searchParams : {};
  const initialFeedback = getInitialFeedback(resolvedSearchParams);

  const connectionsResult = await Promise.allSettled([fetchPlatformConnections()]);

  let connections: PlatformConnectionsSummary;
  let loadError: string | undefined;

  if (connectionsResult[0].status === 'fulfilled') {
    connections = connectionsResult[0].value;
  } else {
    connections = FALLBACK_CONNECTIONS;
    loadError = getInitialLoadError(connectionsResult[0].reason);
  }

  return (
    <SettingsClient
      initialConnections={connections}
      initialFeedback={initialFeedback}
      loadError={loadError}
    />
  );
}
