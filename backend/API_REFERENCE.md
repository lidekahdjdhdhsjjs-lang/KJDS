# API Reference

This document provides a comprehensive reference for all API endpoints in the Shopee AI Ops system.

## Base URL

```
Development: http://localhost:8000/api/v1
Production: https://api.example.com/api/v1
```

## Authentication

Most endpoints require identity headers for operator simulation (development only):

```
x-operator-id: operator-001
x-operator-role: operator|reviewer|admin
```

## Response Format

All API responses follow this envelope format:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { ... }
}
```

---

## Health Endpoints

### GET /health
Basic health check.

**Response:**
```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

### GET /health/detailed
Detailed health check with component status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "components": {
      "database": "healthy"
    }
  }
}
```

---

## Dashboard Endpoints

### GET /dashboard/summary
Get dashboard summary statistics.

**Headers:** `x-operator-id`, `x-operator-role`

**Response:**
```json
{
  "success": true,
  "data": {
    "pending_candidates": 0,
    "ready_for_review": 0,
    "approved_today": 0,
    "published_today": 0,
    "failed_jobs": 0
  }
}
```

### GET /dashboard/authorization
Get platform authorization status.

**Headers:** `x-operator-id`, `x-operator-role`

**Response:**
```json
{
  "success": true,
  "data": {
    "shopee_connected": false,
    "alibaba_connected": false,
    "can_load_live_data": false,
    "missing_connections": ["shopee", "1688"],
    "guidance": "Connect both platforms to enable live data sync."
  }
}
```

---

## Platform Connections

### GET /platform-connections
List all platform connection statuses.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "platform": "shopee",
        "connected": false,
        "status": "disconnected",
        "authorize_url": null
      }
    ],
    "authorization": { ... }
  }
}
```

### POST /platform-connections/{platform}/start
Start OAuth authorization flow.

**Platforms:** `shopee`, `1688`

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "shopee",
    "status": "pending",
    "authorize_url": "https://partner.shopeemobile.com/api/v2/shop/auth?..."
  }
}
```

### POST /platform-connections/{platform}/disconnect
Disconnect a platform connection.

---

## Batch Management

### POST /batches
Create a new opportunity batch.

**Request:**
```json
{
  "store_id": "shopee-default-store",
  "trigger_type": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "batch-abc123",
    "store_id": "shopee-default-store",
    "trigger_type": "manual",
    "status": "draft",
    "priority": 0,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET /batches
List all batches.

**Query Parameters:**
- `store_id` (optional): Filter by store
- `status` (optional): Filter by status
- `limit` (default: 100)
- `offset` (default: 0)

### GET /batches/{batch_id}
Get batch details.

### POST /batches/{batch_id}/start
Start batch execution.

### POST /batches/{batch_id}/pause
Pause batch execution.

### POST /batches/{batch_id}/resume
Resume paused batch.

### POST /batches/{batch_id}/complete
Mark batch as completed.

### POST /batches/{batch_id}/archive
Archive a batch.

### GET /batches/{batch_id}/status
Get batch status summary.

---

## Opportunity Items

### POST /opportunities
Create a new opportunity item.

**Request:**
```json
{
  "batch_id": "batch-abc123",
  "store_id": "shopee-default-store"
}
```

### GET /opportunities
List opportunity items.

**Query Parameters:**
- `batch_id` (optional): Filter by batch
- `status` (optional): Filter by status
- `limit`, `offset`: Pagination

### GET /opportunities/{item_id}
Get item details.

### GET /opportunities/{item_id}/detail
Get full item detail with all related entities.

**Response:**
```json
{
  "success": true,
  "data": {
    "item": { ... },
    "supply_candidates": [...],
    "current_supply_candidate": {...},
    "mappings": [...],
    "current_mapping": {...},
    "content_variants": [...],
    "current_content_variant": {...},
    "pricing_decisions": [...],
    "current_pricing_decision": {...},
    "preflight_checks": [...]
  }
}
```

### POST /opportunities/{item_id}/supply-candidates
Add a supply candidate.

### POST /opportunities/{item_id}/mapping
Create category mapping.

### POST /opportunities/{item_id}/content
Generate content variant.

### POST /opportunities/{item_id}/pricing
Calculate pricing decision.

### POST /opportunities/{item_id}/preflight
Run preflight check.

### POST /opportunities/{item_id}/advance/{status}
Advance item to specified status.

---

## Supply Candidates

### GET /supply-candidates/{candidate_id}
Get supply candidate details.

### POST /supply-candidates/{candidate_id}/score
Score a supply candidate.

---

## Category Mappings

### GET /mappings/{mapping_id}
Get mapping details.

### POST /mappings/{mapping_id}/confirm
Confirm a mapping.

### POST /mappings/{mapping_id}/reject
Reject a mapping.

---

## Content Variants

### GET /content-variants/{variant_id}
Get content variant details.

### POST /content-variants/{variant_id}/approve
Approve content variant.

### POST /content-variants/{variant_id}/reject
Reject content variant.

---

## Pricing Decisions

### GET /pricing-decisions/{decision_id}
Get pricing decision details.

### POST /pricing-decisions/{decision_id}/approve
Approve pricing decision.

---

## Preflight Checks

### GET /preflight-checks/{check_id}
Get preflight check details.

---

## Publish Tasks

### POST /publish-tasks
Create a publish task.

**Request:**
```json
{
  "opportunity_item_id": "item-abc123",
  "store_id": "shopee-default-store",
  "idempotency_key": "unique-key-123"
}
```

### GET /publish-tasks
List publish tasks.

**Query Parameters:**
- `status` (optional): Filter by status
- `store_id` (optional): Filter by store

### GET /publish-tasks/{task_id}
Get task details.

### POST /publish-tasks/{task_id}/start
Start task execution.

### POST /publish-tasks/{task_id}/complete
Mark task as completed.

### POST /publish-tasks/{task_id}/fail
Mark task as failed.

---

## Procurement Drafts

### POST /procurement-drafts
Create procurement draft.

**Request:**
```json
{
  "opportunity_item_id": "item-abc123",
  "supplier_ref": "supplier-001",
  "purchase_price": 100.0,
  "qty": 10
}
```

### GET /procurement-drafts
List procurement drafts.

### POST /procurement-drafts/{draft_id}/submit-for-confirmation
Submit draft for confirmation.

### POST /procurement-drafts/{draft_id}/confirm
Confirm procurement draft.

---

## Agent Runs

### POST /agent-runs
Create agent run record.

**Request:**
```json
{
  "agent_name": "opportunity_discovery",
  "model_name": "claude-sonnet-4.6",
  "entity_type": "opportunity_item",
  "entity_id": "item-abc123",
  "input_summary": "..."
}
```

### GET /agent-runs
List agent runs.

**Query Parameters:**
- `agent_name` (optional): Filter by agent
- `status` (optional): Filter by status
- `entity_type` (optional): Filter by entity type
- `entity_id` (optional): Filter by entity ID

### GET /agent-runs/{run_id}
Get run details.

### POST /agent-runs/{run_id}/complete
Mark run as completed.

### POST /agent-runs/{run_id}/fail
Mark run as failed.

---

## Incidents

### GET /incidents
List incidents.

**Query Parameters:**
- `severity` (optional): Filter by severity (P0, P1, P2)
- `status` (optional): Filter by status
- `store_id` (optional): Filter by store

### GET /incidents/{incident_id}
Get incident details.

### POST /incidents/{incident_id}/acknowledge
Acknowledge an incident.

### POST /incidents/{incident_id}/resolve
Resolve an incident.

---

## Store Health

### GET /store-health
List store health statuses.

### GET /store-health/{store_id}
Get health status for a specific store.

---

## Demand Signals

### POST /demand-signals
Create demand signal snapshot.

**Request:**
```json
{
  "opportunity_item_id": "item-abc123",
  "signal_type": "hot_keyword",
  "source": "shopee_trending",
  "payload": "{\"keyword\": \"phone case\", \"volume\": 10000}",
  "snapshot_time": "2024-01-01T00:00:00Z"
}
```

### GET /demand-signals/item/{item_id}
List demand signals for an item.

### GET /demand-signals/{snapshot_id}
Get specific snapshot.

---

## Training Packages

### POST /training-packages
Create training package.

**Request:**
```json
{
  "package_type": "manual",
  "storage_uri": "s3://bucket/package.tar.gz",
  "manifest_payload": "{\"items\": 100}"
}
```

### GET /training-packages
List training packages.

**Query Parameters:**
- `store_id` (optional): Filter by store
- `batch_id` (optional): Filter by batch
- `package_type` (optional): Filter by type

### GET /training-packages/{package_id}
Get package details.

---

## Feedback Records

### POST /feedback-records
Create feedback record.

**Request:**
```json
{
  "opportunity_item_id": "item-abc123",
  "feedback_type": "content_fix",
  "source_type": "operator",
  "before_payload": "{\"title\": \"old title\"}",
  "after_payload": "{\"title\": \"new title\"}"
}
```

### GET /feedback-records
List feedback records.

**Query Parameters:**
- `opportunity_item_id` (optional): Filter by item
- `feedback_type` (optional): Filter by type
- `review_status` (optional): Filter by status

### POST /feedback-records/{feedback_id}/approve
Approve feedback record.

### POST /feedback-records/{feedback_id}/reject
Reject feedback record.

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "data": null,
  "error": "Error message describing what went wrong",
  "meta": null
}
```

### Common HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Feature disabled |

---

## Rate Limits

Production API has rate limiting:
- 100 requests per minute per API key
- 1000 requests per hour per API key

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```
