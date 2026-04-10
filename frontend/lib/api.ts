const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1';
export const HEADER_AUTH_DISABLED_MESSAGE =
  'Development-only header auth is disabled. Connect Shopee and 1688 through their real authorization flows before using the dashboard.';
export const HEADER_AUTH_DISABLED_DASHBOARD_MESSAGE =
  'This environment blocks the old header-based operator simulation. Connect Shopee and 1688 through their real authorization flows before opening the dashboard.';

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
};

export type OperatorRole = 'operator' | 'reviewer' | 'admin';

export type ActingOperator = {
  id: string;
  role: OperatorRole;
  label: string;
  description: string;
};

export const ACTOR_PRESETS: Record<OperatorRole, ActingOperator> = {
  operator: {
    id: 'operator-001',
    role: 'operator',
    label: 'Operator',
    description: 'Use this mode for candidate intake and draft generation.',
  },
  reviewer: {
    id: 'reviewer-001',
    role: 'reviewer',
    label: 'Reviewer',
    description: 'Use this mode for approval and change requests before publish.',
  },
  admin: {
    id: 'admin-001',
    role: 'admin',
    label: 'Admin',
    description: 'Use this mode for final publish control and end-to-end overrides.',
  },
};

export type DashboardSummary = {
  pending_candidates: number;
  ready_for_review: number;
  approved_today: number;
  published_today: number;
  failed_jobs: number;
};

export type PlatformAuthorizationStatus = {
  shopee_connected: boolean;
  alibaba_connected: boolean;
  can_load_live_data: boolean;
  missing_connections: string[];
  guidance: string;
};

export type PlatformConnectionStatus = {
  platform: 'shopee' | '1688';
  connected: boolean;
  status: 'disconnected' | 'pending' | 'connected' | 'error';
  account_label?: string | null;
  last_connected_at?: string | null;
  last_error?: string | null;
  authorize_url?: string | null;
};

export type PlatformConnectionsSummary = {
  items: PlatformConnectionStatus[];
  authorization: PlatformAuthorizationStatus;
};

export type PlatformAuthorizationStartResponse = {
  platform: 'shopee' | '1688';
  status: 'pending';
  authorize_url: string;
};

export type DraftItem = {
  id: string;
  candidate_id: string;
  title: string;
  status: string;
  draft_version: number;
  review_comment?: string | null;
  published_at?: string | null;
};

export type DraftList = {
  items: DraftItem[];
};

function buildActorHeaders(actor: ActingOperator, includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-operator-id': actor.id,
    'x-operator-role': actor.role,
  };
}

async function parseApiResponse<T>(response: Response, message: string): Promise<T> {
  const body: ApiResponse<T> | { detail?: string } = await response.json();

  if (!response.ok) {
    const detail = 'detail' in body ? body.detail || message : message;
    if (response.status === 503 && detail === 'Header-based auth is disabled outside development') {
      throw new Error(HEADER_AUTH_DISABLED_MESSAGE);
    }
    throw new Error(detail);
  }

  if (!('success' in body) || !body.success || body.data === null) {
    throw new Error('error' in body ? body.error || message : message);
  }

  return body.data;
}

export async function fetchDashboardSummary(actor: ActingOperator = ACTOR_PRESETS.operator): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE}/dashboard/summary`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<DashboardSummary>(response, 'Failed to load dashboard summary');
}

export async function fetchDrafts(actor: ActingOperator = ACTOR_PRESETS.operator): Promise<DraftList> {
  const response = await fetch(`${API_BASE}/drafts`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<DraftList>(response, 'Failed to load drafts');
}

export async function fetchDashboardAuthorization(
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<PlatformAuthorizationStatus> {
  const response = await fetch(`${API_BASE}/dashboard/authorization`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<PlatformAuthorizationStatus>(response, 'Failed to load platform authorization status');
}

export async function fetchPlatformConnections(
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<PlatformConnectionsSummary> {
  const response = await fetch(`${API_BASE}/platform-connections`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<PlatformConnectionsSummary>(response, 'Failed to load platform connections');
}

export async function startPlatformAuthorization(
  platform: 'shopee' | '1688',
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<PlatformAuthorizationStartResponse> {
  const response = await fetch(`${API_BASE}/platform-connections/${platform}/start`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<PlatformAuthorizationStartResponse>(response, `Failed to start ${platform} authorization`);
}

export async function disconnectPlatform(
  platform: 'shopee' | '1688',
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<PlatformConnectionStatus> {
  const response = await fetch(`${API_BASE}/platform-connections/${platform}/disconnect`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<PlatformConnectionStatus>(response, `Failed to disconnect ${platform}`);
}

export async function approveDraft(draftId: string, actor: ActingOperator): Promise<void> {
  const response = await fetch(`${API_BASE}/review/${draftId}/approve`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  await parseApiResponse(response, 'Failed to approve draft');
}

export async function rejectDraft(draftId: string, actor: ActingOperator): Promise<void> {
  const response = await fetch(`${API_BASE}/review/${draftId}/reject`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  await parseApiResponse(response, 'Failed to reject draft');
}

export async function publishDraft(draftId: string, actor: ActingOperator): Promise<void> {
  const response = await fetch(`${API_BASE}/publish/${draftId}`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  await parseApiResponse(response, 'Failed to publish draft');
}

export async function generateDrafts(actor: ActingOperator): Promise<void> {
  const response = await fetch(`${API_BASE}/drafts/generate`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  await parseApiResponse(response, 'Failed to generate drafts');
}

export async function intakeCandidates(count: number, actor: ActingOperator): Promise<void> {
  const response = await fetch(`${API_BASE}/candidates/intake`, {
    method: 'POST',
    headers: buildActorHeaders(actor, true),
    body: JSON.stringify({ source: 'manual', count }),
  });
  await parseApiResponse(response, 'Failed to intake candidates');
}
