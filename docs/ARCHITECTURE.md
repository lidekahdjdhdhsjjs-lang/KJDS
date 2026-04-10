# Architecture v1.0

## System shape
- Frontend: Next.js operator console
- Backend API: FastAPI
- Primary data store: PostgreSQL
- Queue/cache/state: Redis
- Browser automation fallback: Playwright
- External services: LLM, image model, translation, OCR if needed

## Main modules
1. `app/api` HTTP endpoints for dashboard, candidates, drafts, review, publish, settings
2. `app/core` config, security, logging, provider wiring
3. `app/schemas` request and response models
4. `app/repositories` persistence layer
5. `app/services` domain services
6. Future `workers` for async jobs
7. Future `connectors` for Shopee, 1688, AI providers

## Domain boundaries
- Store strategy: pricing, review, content, image, and publish policies
- Candidate intake: source normalization and scoring inputs
- Draft assembly: product content and media package generation
- Review: human approval decisions and comments
- Publish: queueing, throttling, retry, result tracking
- Audit: system and operator action log

## Minimal API surfaces
- `GET /health`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/candidates`
- `POST /api/v1/candidates/intake`
- `GET /api/v1/drafts`
- `POST /api/v1/drafts/generate`
- `POST /api/v1/review/{draft_id}/approve`
- `POST /api/v1/review/{draft_id}/reject`
- `POST /api/v1/publish/{draft_id}`

## Data model anchors
- stores
- store_strategies
- sourcing_tasks
- candidates
- candidate_variants
- draft_listings
- draft_assets
- review_tasks
- publish_jobs
- audit_logs

## Reliability rules
- Every external connector call is wrapped with explicit status and error state
- Draft generation is rerunnable and versioned
- Publish operation is idempotent by draft version
- Failed async jobs move to retry then dead-letter queues

## Security baseline
- Platform authorization status for Shopee and 1688 is the main operational gate
- Internal console access stays behind trusted network controls and environment boundaries
- Secrets via environment variables only
- External service access isolated behind providers
- No raw HTML rendering from external sources
