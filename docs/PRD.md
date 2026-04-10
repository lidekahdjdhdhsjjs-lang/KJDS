# PRD v1.0

## Context
This system is an internal AI operations platform for cross-border e-commerce. The first deliverable is a Shopee single-store, single-site workflow that lets operators source, draft, review, and publish products with AI assistance while keeping a human final checkpoint.

## Goal
Build an execution-ready MVP that can support at least 50 products per day through a controlled human-in-the-loop workflow.

## Users
- Operator: handles daily sourcing, review, and publishing
- Reviewer: approves or rejects publish-ready drafts
- Admin: manages store strategy, rules, quotas, and provider settings

## MVP boundaries
### In scope
- Daily data sync dashboard
- 1688 candidate intake
- Candidate scoring and filtering
- AI-assisted title, description, attributes, and image task generation
- Draft listing workspace
- Manual final review queue
- Publish execution with rate limiting
- Audit trail

### Out of scope
- Multi-store orchestration
- Multi-platform publishing
- Fully automatic no-review publishing
- Financial settlement features
- Warehouse and fulfillment systems

## Core workflows
### 1. Daily operations
- Sync sales, inventory, and listing metrics from Shopee
- Surface issues, opportunities, and recommended actions

### 2. Candidate sourcing
- Import 1688 candidates manually or by task
- Normalize supplier, product, variant, and media data
- Score using store strategy and risk rules

### 3. Draft generation
- Produce localized titles, descriptions, attributes, tags, and pricing suggestions
- Produce image processing tasks and asset package
- Mark missing required data before review

### 4. Review and publish
- Reviewer sees checklist, risks, and generated assets
- Reviewer approves, rejects, or sends back for revision
- Approved drafts enter publish queue with daily and hourly caps

## Success metrics
- 50 publishable products/day capacity
- 100 percent manual final review before publish
- Less than 10 minutes operator handling time per approved draft after candidate intake
- Clear operator-visible failure states for sync, generation, and publish jobs

## Functional requirements
1. Store strategy template per store/site
2. Rule-driven candidate filters
3. AI provider abstraction
4. Draft versioning
5. Publish queue with retries and dead-letter handling
6. Audit logging for all operator and system actions
7. Beginner-friendly console with guided queues

## Non-functional requirements
- Shopee and 1688 platform authorization status must be visible and enforced in the console
- Internal console access should stay limited by trusted environment controls, not a full multi-user login product
- Idempotent jobs and publish requests
- Async processing for sourcing and content generation
- Observable job and connector failures
- Platform-agnostic domain model for future expansion
