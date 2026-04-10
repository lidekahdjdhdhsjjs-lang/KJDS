# Shopee AI Ops MVP

Internal AI operations workflow for Shopee single-store, single-site operations.

## Scope
- Single Shopee store, single site
- Human final review before publish
- Python FastAPI backend
- PostgreSQL as system of record
- Redis for queue/cache/job state
- Next.js frontend console for non-technical operators
- External AI services and Playwright allowed

## MVP workflow
1. Pull store and product performance data
2. Generate sourcing tasks and candidate products from 1688
3. Score candidates with rules plus AI assistance
4. Generate draft listing content and image tasks
5. Route every draft through manual review
6. Publish approved drafts with throttling and audit logs

## Top-level structure
- `docs/` product, architecture, schema, and runbook docs
- `backend/` FastAPI service and tests
- `frontend/` Next.js operator console starter

## Next actions
- Fill connector implementations for Shopee, 1688, AI providers
- Add database migrations and async job workers
- Implement platform authorization state, internal access controls, and audit log persistence
- Expand tests to integration and E2E coverage
