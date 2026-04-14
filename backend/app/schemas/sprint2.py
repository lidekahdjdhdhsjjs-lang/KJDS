"""Schemas for Sprint 2 entities."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ============================================================================
# OpportunityBatch
# ============================================================================


class BatchCreate(BaseModel):
    store_id: str
    trigger_type: str = Field(..., pattern="^(manual|scheduled|signal)$")
    trigger_payload: str | None = None
    priority: int = Field(default=0, ge=0)


class BatchUpdate(BaseModel):
    status: str | None = None
    priority: int | None = Field(None, ge=0)


class BatchView(BaseModel):
    id: str
    store_id: str
    trigger_type: str
    trigger_payload: str | None
    status: str
    priority: int
    started_at: str | None
    completed_at: str | None
    created_at: str
    updated_at: str


class BatchWithStatusCounts(BaseModel):
    id: str
    store_id: str
    trigger_type: str
    trigger_payload: str | None
    status: str
    priority: int
    started_at: str | None
    completed_at: str | None
    created_at: str
    updated_at: str
    status_counts: dict[str, int]


class BatchList(BaseModel):
    items: list[BatchView]
    total: int


# ============================================================================
# OpportunityItem
# ============================================================================


class ItemCreate(BaseModel):
    batch_id: str
    store_id: str
    risk_level: int = Field(default=0, ge=0)
    score_total: float = Field(default=0.0, ge=0.0)


class ItemView(BaseModel):
    id: str
    batch_id: str
    store_id: str
    status: str
    risk_level: int
    score_total: float
    current_supply_candidate_id: str | None
    current_mapping_id: str | None
    current_content_variant_id: str | None
    current_pricing_decision_id: str | None
    preflight_status: str | None
    publish_idempotency_key: str | None
    created_at: str
    updated_at: str


class ItemList(BaseModel):
    items: list[ItemView]
    total: int


class ItemDetail(BaseModel):
    item: ItemView
    supply_candidates: list[dict[str, Any]]
    current_supply_candidate: dict[str, Any] | None
    mappings: list[dict[str, Any]]
    current_mapping: dict[str, Any] | None
    content_variants: list[dict[str, Any]]
    current_content_variant: dict[str, Any] | None
    pricing_decisions: list[dict[str, Any]]
    current_pricing_decision: dict[str, Any] | None
    preflight_checks: list[dict[str, Any]]


# ============================================================================
# SupplyCandidate
# ============================================================================


class SupplyCandidateCreate(BaseModel):
    opportunity_item_id: str
    source_platform: str = Field(default="1688")
    source_item_ref: str
    cost_amount: float = Field(..., ge=0)
    supplier_ref: str | None = None
    moq: int = Field(default=1, ge=1)
    ship_from: str | None = None


class SupplyCandidateView(BaseModel):
    id: str
    opportunity_item_id: str
    source_platform: str
    source_item_ref: str
    supplier_ref: str | None
    cost_amount: float
    moq: int
    ship_from: str | None
    reliability_score: float
    image_quality_score: float
    status: str
    created_at: str


class SupplyCandidateScoreUpdate(BaseModel):
    reliability_score: float = Field(..., ge=0.0, le=1.0)
    image_quality_score: float = Field(..., ge=0.0, le=1.0)


# ============================================================================
# CategoryMapping
# ============================================================================


class CategoryMappingCreate(BaseModel):
    opportunity_item_id: str
    category_ref: str
    attributes_payload: str
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    variation_payload: str | None = None
    evidence_payload: str | None = None


class CategoryMappingView(BaseModel):
    id: str
    opportunity_item_id: str
    category_ref: str
    attributes_payload: str
    variation_payload: str | None
    confidence_score: float
    evidence_payload: str | None
    status: str
    created_at: str


# ============================================================================
# ContentVariant
# ============================================================================


class ContentVariantCreate(BaseModel):
    opportunity_item_id: str
    title: str
    bullet_points: str | None = None
    image_bundle_ref: str | None = None
    template_ref: str | None = None
    locale: str = Field(default="vi")


class ContentVariantView(BaseModel):
    id: str
    opportunity_item_id: str
    title: str
    bullet_points: str | None
    image_bundle_ref: str | None
    template_ref: str | None
    locale: str
    version_no: int
    status: str
    created_at: str


# ============================================================================
# PricingDecision
# ============================================================================


class PricingDecisionCreate(BaseModel):
    opportunity_item_id: str
    cost_payload: str
    fee_payload: str
    exchange_rate_payload: str
    suggested_price: float = Field(..., ge=0)
    min_profit_line: float = Field(..., ge=0)
    competitor_band_payload: str | None = None
    decision_reason: str | None = None


class PricingDecisionApprove(BaseModel):
    final_price: float | None = Field(None, ge=0)


class PricingDecisionView(BaseModel):
    id: str
    opportunity_item_id: str
    cost_payload: str
    fee_payload: str
    exchange_rate_payload: str
    competitor_band_payload: str | None
    suggested_price: float
    final_price: float | None
    min_profit_line: float
    decision_reason: str | None
    status: str
    created_at: str


# ============================================================================
# PreflightCheck
# ============================================================================


class PreflightCheckCreate(BaseModel):
    opportunity_item_id: str
    profit_check: str = Field(..., pattern="^(passed|failed|warning)$")
    compliance_check: str = Field(..., pattern="^(passed|failed|warning)$")
    supply_check: str = Field(..., pattern="^(passed|failed|warning)$")
    account_health_check: str = Field(..., pattern="^(passed|failed|warning)$")
    detail_payload: str


class PreflightCheckView(BaseModel):
    id: str
    opportunity_item_id: str
    profit_check: str
    compliance_check: str
    supply_check: str
    account_health_check: str
    overall_result: str
    detail_payload: str
    created_at: str


# ============================================================================
# PublishTask
# ============================================================================


class PublishTaskCreate(BaseModel):
    opportunity_item_id: str
    store_id: str
    request_payload: str | None = None
    channel: str = Field(default="api", pattern="^(api|manual)$")


class PublishTaskView(BaseModel):
    id: str
    opportunity_item_id: str
    store_id: str
    status: str
    channel: str
    idempotency_key: str
    request_payload: str | None
    response_payload: str | None
    retry_count: int
    last_error: str | None
    created_at: str
    updated_at: str


class PublishTaskList(BaseModel):
    items: list[PublishTaskView]
    total: int


class PublishResultView(BaseModel):
    id: str
    publish_task_id: str
    platform_item_ref: str | None
    result_type: str
    detail_payload: str | None
    created_at: str


# ============================================================================
# ProcurementDraft
# ============================================================================


class ProcurementDraftCreate(BaseModel):
    opportunity_item_id: str
    supplier_ref: str
    purchase_price: float = Field(..., ge=0)
    sku_payload: str | None = None
    qty: int = Field(default=1, ge=1)


class ProcurementDraftView(BaseModel):
    id: str
    opportunity_item_id: str
    supplier_ref: str
    sku_payload: str | None
    qty: int
    purchase_price: float
    status: str
    invalid_reason: str | None
    created_at: str
    updated_at: str


class ProcurementDraftList(BaseModel):
    items: list[ProcurementDraftView]
    total: int


# ============================================================================
# AgentRun
# ============================================================================


class AgentRunCreate(BaseModel):
    agent_name: str
    entity_type: str
    entity_id: str
    model_name: str | None = None
    input_summary: str | None = None


class AgentRunComplete(BaseModel):
    output_summary: str | None = None
    evidence_payload: str | None = None
    cost_payload: str | None = None


class AgentRunView(BaseModel):
    id: str
    agent_name: str
    model_name: str | None
    entity_type: str
    entity_id: str
    input_summary: str | None
    output_summary: str | None
    evidence_payload: str | None
    cost_payload: str | None
    status: str
    started_at: str
    ended_at: str | None


class AgentRunList(BaseModel):
    items: list[AgentRunView]
    total: int


# ============================================================================
# Bulk Operations
# ============================================================================


class BulkStatusUpdate(BaseModel):
    item_ids: list[str] = Field(..., min_length=1)
    status: str


class BulkRiskUpdate(BaseModel):
    item_ids: list[str] = Field(..., min_length=1)
    risk_level: int = Field(..., ge=0)


class BulkItemCreate(BaseModel):
    batch_id: str
    store_id: str
    items: list[dict[str, Any]] = Field(..., min_length=1)


class BulkOperationResult(BaseModel):
    success: bool
    updated_count: int
    items: list[ItemView]
    errors: list[str] | None = None
