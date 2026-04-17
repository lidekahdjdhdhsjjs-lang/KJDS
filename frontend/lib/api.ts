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
  pending_state: string;
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
  let body: ApiResponse<T> | { detail?: string };
  try {
    body = await response.json();
  } catch {
    throw new Error(`Network error: ${message}`);
  }

  if (!response.ok) {
    const detail = 'detail' in body ? body.detail || message : message;
    if (response.status === 503 && detail === 'Header-based auth is disabled outside development') {
      throw new Error(HEADER_AUTH_DISABLED_MESSAGE);
    }
    if (response.status === 401) {
      throw new Error('401 unauthorized');
    }
    if (response.status === 403) {
      throw new Error('403 forbidden');
    }
    if (response.status === 404) {
      throw new Error('404 not found');
    }
    if (response.status === 500) {
      throw new Error('500 internal server error');
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Server is temporarily unavailable. Please try again later.');
    }
    throw new Error(detail);
  }

  if (!('success' in body) || !body.success || body.data === null) {
    throw new Error('error' in body ? body.error || message : message);
  }

  return body.data;
}

/**
 * Helper function to add retry logic to any async function
 * @param fn The async function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param delayMs Delay between retries in milliseconds (default: 1000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on client errors (4xx)
      const errorMessage = lastError.message;
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404') ||
        errorMessage.includes('Validation')
      ) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Retry failed');
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

export type ConnectionStatus = {
  platform: 'shopee' | '1688';
  status: 'disconnected' | 'pending' | 'connected' | 'error' | 'timeout';
  account_label: string | null;
  error_message: string | null;
  pending_state: string | null;
};

export async function fetchConnectionStatus(
  platform: 'shopee' | '1688',
): Promise<ConnectionStatus> {
  const response = await fetch(`${API_BASE}/platform-connections/${platform}/status`);
  return parseApiResponse<ConnectionStatus>(response, `Failed to fetch ${platform} status`);
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

export async function refreshPlatformTokens(
  platform: 'shopee' | '1688',
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<PlatformConnectionStatus> {
  const response = await fetch(`${API_BASE}/platform-connections/${platform}/refresh`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<PlatformConnectionStatus>(response, `Failed to refresh ${platform} tokens`);
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

// ============================================================================
// Sprint 2 Types
// ============================================================================

export type Batch = {
  id: string;
  store_id: string;
  trigger_type: string;
  trigger_payload?: string | null;
  status: string;
  priority: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type BatchList = {
  items: Batch[];
  total: number;
};

export type OpportunityItem = {
  id: string;
  batch_id: string;
  store_id: string;
  status: string;
  risk_level: number;
  score_total: number;
  current_supply_candidate_id?: string | null;
  current_mapping_id?: string | null;
  current_content_variant_id?: string | null;
  current_pricing_decision_id?: string | null;
  preflight_status?: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemList = {
  items: OpportunityItem[];
  total: number;
};

export type SupplyCandidate = {
  id: string;
  opportunity_item_id: string;
  source_platform: string;
  source_item_ref: string;
  supplier_ref?: string | null;
  cost_amount: number;
  moq: number;
  ship_from?: string | null;
  reliability_score: number;
  image_quality_score: number;
  status: string;
  created_at: string;
};

export type CategoryMapping = {
  id: string;
  opportunity_item_id: string;
  category_ref: string;
  attributes_payload: string;
  variation_payload?: string | null;
  confidence_score: number;
  evidence_payload?: string | null;
  status: string;
  created_at: string;
};

export type ContentVariant = {
  id: string;
  opportunity_item_id: string;
  title: string;
  bullet_points?: string | null;
  image_bundle_ref?: string | null;
  template_ref?: string | null;
  locale: string;
  version_no: number;
  status: string;
  created_at: string;
};

export type PricingDecision = {
  id: string;
  opportunity_item_id: string;
  cost_payload: string;
  fee_payload: string;
  exchange_rate_payload: string;
  competitor_band_payload?: string | null;
  suggested_price: number;
  final_price?: number | null;
  min_profit_line: number;
  decision_reason?: string | null;
  status: string;
  created_at: string;
};

export type PreflightCheck = {
  id: string;
  opportunity_item_id: string;
  profit_check: string;
  compliance_check: string;
  supply_check: string;
  account_health_check: string;
  overall_result: string;
  detail_payload: string;
  created_at: string;
};

export type ItemDetail = {
  item: OpportunityItem;
  supply_candidates: SupplyCandidate[];
  current_supply_candidate?: SupplyCandidate | null;
  mappings: CategoryMapping[];
  current_mapping?: CategoryMapping | null;
  content_variants: ContentVariant[];
  current_content_variant?: ContentVariant | null;
  pricing_decisions: PricingDecision[];
  current_pricing_decision?: PricingDecision | null;
  preflight_checks: PreflightCheck[];
};

export type Incident = {
  id: string;
  store_id: string;
  incident_type: string;
  severity: 'P0' | 'P1' | 'P2';
  message: string;
  context_payload?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
};

export type IncidentList = {
  items: Incident[];
  total: number;
};

export type StoreHealth = {
  store_id: string;
  platform: string;
  oauth_status: 'connected' | 'disconnected' | 'expired' | 'error';
  api_quota_remaining: number;
  api_quota_total: number;
  last_success_at?: string | null;
  last_error?: string | null;
  error_rate: number;
  risk_flags: string[];
};

export type StoreHealthList = {
  items: StoreHealth[];
  total: number;
};

// ============================================================================
// Sprint 2 API Functions
// ============================================================================

export async function fetchBatches(actor: ActingOperator = ACTOR_PRESETS.operator): Promise<BatchList> {
  const response = await fetch(`${API_BASE}/batches`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<BatchList>(response, 'Failed to fetch batches');
}

export async function fetchBatch(batchId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Batch>(response, 'Failed to fetch batch');
}

export async function createBatch(storeId: string, triggerType: string = 'manual', actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches`, {
    method: 'POST',
    headers: buildActorHeaders(actor, true),
    body: JSON.stringify({ store_id: storeId, trigger_type: triggerType }),
  });
  return parseApiResponse<Batch>(response, 'Failed to create batch');
}

export async function startBatch(batchId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/start`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Batch>(response, 'Failed to start batch');
}

export async function pauseBatch(batchId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/pause`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Batch>(response, 'Failed to pause batch');
}

export async function resumeBatch(batchId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/resume`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Batch>(response, 'Failed to resume batch');
}

export async function completeBatch(batchId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Batch> {
  const response = await fetch(`${API_BASE}/batches/${batchId}/complete`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Batch>(response, 'Failed to complete batch');
}

export async function fetchItems(batchId?: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<ItemList> {
  const url = batchId ? `${API_BASE}/opportunities?batch_id=${batchId}` : `${API_BASE}/opportunities`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<ItemList>(response, 'Failed to fetch items');
}

export async function fetchItemDetail(itemId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<ItemDetail> {
  const response = await fetch(`${API_BASE}/opportunities/${itemId}/detail`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<ItemDetail>(response, 'Failed to fetch item detail');
}

export async function advanceItemStatus(itemId: string, status: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<OpportunityItem> {
  const response = await fetch(`${API_BASE}/opportunities/${itemId}/advance/${status}`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<OpportunityItem>(response, 'Failed to advance item');
}

export async function fetchIncidents(actor: ActingOperator = ACTOR_PRESETS.operator): Promise<IncidentList> {
  const response = await fetch(`${API_BASE}/incidents`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<IncidentList>(response, 'Failed to fetch incidents');
}

export async function acknowledgeIncident(incidentId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Incident> {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/acknowledge`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Incident>(response, 'Failed to acknowledge incident');
}

export async function resolveIncident(incidentId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<Incident> {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/resolve`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<Incident>(response, 'Failed to resolve incident');
}

export async function fetchStoreHealth(actor: ActingOperator = ACTOR_PRESETS.operator): Promise<StoreHealthList> {
  const response = await fetch(`${API_BASE}/store-health`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<StoreHealthList>(response, 'Failed to fetch store health');
}

// ============================================================================
// Feedback Records Types
// ============================================================================

export type FeedbackRecord = {
  id: string;
  opportunity_item_id: string;
  feedback_type: string; // content_fix, mapping_fix, pricing_fix
  source_type: string; // operator, reviewer, admin
  reviewer_ref?: string | null;
  before_payload: string; // JSON
  after_payload: string; // JSON
  review_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

// ============================================================================
// Demand Signal Types
// ============================================================================

export type DemandSignalSnapshot = {
  id: string;
  opportunity_item_id: string;
  signal_type: string; // hot_keyword, trending, competitor, review_pain
  source: string;
  payload: string; // JSON
  snapshot_time: string;
};

// ============================================================================
// Training Archive Types
// ============================================================================

export type TrainingArchivePackage = {
  id: string;
  store_id?: string | null;
  batch_id?: string | null;
  package_type: string; // batch, store, manual
  storage_uri: string;
  manifest_payload: string; // JSON
  created_at: string;
};

// ============================================================================
// Additional API Functions
// ============================================================================

export async function fetchFeedbackRecords(
  opportunityItemId?: string,
  feedbackType?: string,
  reviewStatus?: string,
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<FeedbackRecord[]> {
  const params = new URLSearchParams();
  if (opportunityItemId) params.append('opportunity_item_id', opportunityItemId);
  if (feedbackType) params.append('feedback_type', feedbackType);
  if (reviewStatus) params.append('review_status', reviewStatus);

  const url = `${API_BASE}/feedback-records${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<FeedbackRecord[]>(response, 'Failed to fetch feedback records');
}

export async function createFeedbackRecord(body: {
  opportunity_item_id: string;
  feedback_type: string;
  source_type: string;
  before_payload: string;
  after_payload: string;
  reviewer_ref?: string;
}, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<FeedbackRecord> {
  const response = await fetch(`${API_BASE}/feedback-records`, {
    method: 'POST',
    headers: buildActorHeaders(actor, true),
    body: JSON.stringify(body),
  });
  return parseApiResponse<FeedbackRecord>(response, 'Failed to create feedback record');
}

export async function approveFeedbackRecord(feedbackId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<{ id: string; review_status: string }> {
  const response = await fetch(`${API_BASE}/feedback-records/${feedbackId}/approve`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<{ id: string; review_status: string }>(response, 'Failed to approve feedback record');
}

export async function rejectFeedbackRecord(feedbackId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<{ id: string; review_status: string }> {
  const response = await fetch(`${API_BASE}/feedback-records/${feedbackId}/reject`, {
    method: 'POST',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<{ id: string; review_status: string }>(response, 'Failed to reject feedback record');
}

export async function fetchDemandSignals(opportunityItemId: string, actor: ActingOperator = ACTOR_PRESETS.operator): Promise<DemandSignalSnapshot[]> {
  const response = await fetch(`${API_BASE}/demand-signals/item/${opportunityItemId}`, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<DemandSignalSnapshot[]>(response, 'Failed to fetch demand signals');
}

export async function fetchTrainingPackages(
  storeId?: string,
  batchId?: string,
  packageType?: string,
  actor: ActingOperator = ACTOR_PRESETS.operator,
): Promise<TrainingArchivePackage[]> {
  const params = new URLSearchParams();
  if (storeId) params.append('store_id', storeId);
  if (batchId) params.append('batch_id', batchId);
  if (packageType) params.append('package_type', packageType);

  const url = `${API_BASE}/training-packages${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildActorHeaders(actor),
  });
  return parseApiResponse<TrainingArchivePackage[]>(response, 'Failed to fetch training packages');
}

// ============================================================================
// System Configuration Types & API Functions
// ============================================================================

export type LLMProviderInfo = {
  name: string;
  api_base: string;
  models: string[];
  protocol: string;
};

export type LLMConfig = {
  provider: string;
  api_base: string;
  model: string;
  enabled: boolean;
  has_api_key: boolean;
};

export type ConfigStatus = {
  llm: LLMConfig;
  shopee: {
    authorized: boolean;
    shop_id: string;
    shop_name: string;
    has_credentials: boolean;
  };
  alibaba_1688: {
    authorized: boolean;
    has_credentials: boolean;
  };
  system_api_key_set: boolean;
  ready_for_production: boolean;
};

export async function fetchConfigStatus(): Promise<ConfigStatus> {
  const response = await fetch(`${API_BASE}/system-config/status`, { cache: 'no-store' });
  return parseApiResponse<ConfigStatus>(response, 'Failed to fetch config status');
}

export async function fetchLLMConfig(): Promise<LLMConfig> {
  const response = await fetch(`${API_BASE}/system-config/llm`, { cache: 'no-store' });
  return parseApiResponse<LLMConfig>(response, 'Failed to fetch LLM config');
}

export async function saveLLMConfig(config: {
  provider: string;
  api_key: string;
  api_base: string;
  model: string;
}): Promise<LLMConfig> {
  const response = await fetch(`${API_BASE}/system-config/llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return parseApiResponse<LLMConfig>(response, 'Failed to save LLM config');
}

export async function fetchLLMProviders(): Promise<Record<string, LLMProviderInfo>> {
  const response = await fetch(`${API_BASE}/system-config/llm/providers`, { cache: 'no-store' });
  return parseApiResponse<Record<string, LLMProviderInfo>>(response, 'Failed to fetch LLM providers');
}

export async function saveShopeeCredentials(clientId: string, clientSecret: string): Promise<{ authorized: boolean; has_credentials: boolean }> {
  const response = await fetch(`${API_BASE}/system-config/shopee/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  return parseApiResponse(response, 'Failed to save Shopee credentials');
}

export async function startShopeeAuthorization(): Promise<{ authorize_url: string; status: string }> {
  const response = await fetch(`${API_BASE}/system-config/shopee/authorize`, {
    method: 'POST',
  });
  return parseApiResponse(response, 'Failed to start Shopee authorization');
}

export async function disconnectShopee(): Promise<{ authorized: boolean }> {
  const response = await fetch(`${API_BASE}/system-config/shopee/disconnect`, {
    method: 'POST',
  });
  return parseApiResponse(response, 'Failed to disconnect Shopee');
}

export async function save1688Credentials(clientId: string, clientSecret: string): Promise<{ authorized: boolean; has_credentials: boolean }> {
  const response = await fetch(`${API_BASE}/system-config/1688/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  return parseApiResponse(response, 'Failed to save 1688 credentials');
}

export async function start1688Authorization(): Promise<{ authorize_url: string; status: string }> {
  const response = await fetch(`${API_BASE}/system-config/1688/authorize`, {
    method: 'POST',
  });
  return parseApiResponse(response, 'Failed to start 1688 authorization');
}

export async function disconnect1688(): Promise<{ authorized: boolean }> {
  const response = await fetch(`${API_BASE}/system-config/1688/disconnect`, {
    method: 'POST',
  });
  return parseApiResponse(response, 'Failed to disconnect 1688');
}

export async function saveSystemApiKey(apiKey: string): Promise<{ is_set: boolean }> {
  const response = await fetch(`${API_BASE}/system-config/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return parseApiResponse(response, 'Failed to save API key');
}
