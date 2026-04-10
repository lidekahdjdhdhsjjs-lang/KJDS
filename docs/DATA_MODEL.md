# Data Model v1.0

## Core tables

### stores
- id
- code
- platform
- site_code
- display_name
- status

### store_strategies
- id
- store_id
- pricing_policy_json
- publishing_policy_json
- review_policy_json
- content_policy_json
- image_policy_json
- candidate_policy_json
- version

### sourcing_tasks
- id
- store_id
- source_type
- trigger_type
- status
- input_payload_json
- started_at
- finished_at

### candidates
- id
- sourcing_task_id
- external_source_id
- supplier_name
- title_raw
- cost_price
- currency
- category_hint
- risk_level
- score
- status

### candidate_variants
- id
- candidate_id
- variant_key
- attributes_json
- cost_price
- stock_hint

### draft_listings
- id
- store_id
- candidate_id
- title
- description_markdown
- attributes_json
- pricing_json
- status
- draft_version

### draft_assets
- id
- draft_listing_id
- asset_type
- source_url
- processed_url
- quality_score
- status

### review_tasks
- id
- draft_listing_id
- reviewer_id
- decision
- reason
- checklist_json
- reviewed_at

### publish_jobs
- id
- draft_listing_id
- idempotency_key
- status
- scheduled_at
- published_at
- platform_listing_id
- error_message

### audit_logs
- id
- actor_type
- actor_id
- action
- target_type
- target_id
- payload_json
- created_at

## State flow
- candidate: `new -> scored -> shortlisted -> discarded -> drafted`
- draft: `drafting -> ready_for_review -> changes_requested -> approved -> publish_queued -> published -> failed`
- job: `queued -> running -> retry_wait -> failed -> dead_letter -> completed`
