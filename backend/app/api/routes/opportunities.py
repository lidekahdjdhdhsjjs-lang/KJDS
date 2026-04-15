"""API routes for Sprint 2 opportunity item management."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentActor, require_roles
from app.schemas.common import ApiResponse
from app.schemas.sprint2 import (
    ItemCreate,
    ItemDetail,
    ItemList,
    ItemView,
    SupplyCandidateCreate,
    SupplyCandidateScoreUpdate,
    SupplyCandidateView,
    CategoryMappingCreate,
    CategoryMappingView,
    ContentVariantCreate,
    ContentVariantView,
    PricingDecisionCreate,
    PricingDecisionApprove,
    PricingDecisionView,
    PreflightCheckCreate,
    PreflightCheckView,
    BulkStatusUpdate,
    BulkRiskUpdate,
    BulkItemCreate,
    BulkOperationResult,
)
from app.services import opportunities as item_service
from app.services import supply_candidates as supply_service
from app.services import category_mapping as mapping_service
from app.services import content as content_service
from app.services import pricing as pricing_service
from app.services import preflight as preflight_service

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


# ============================================================================
# Opportunity Items
# ============================================================================


@router.post("", response_model=ApiResponse[ItemView])
async def create_item(
    body: ItemCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Create a new opportunity item."""
    item = item_service.create_item(
        batch_id=body.batch_id,
        store_id=body.store_id,
        risk_level=body.risk_level,
        score_total=body.score_total,
    )
    return ApiResponse(success=True, data=ItemView(**item))


@router.get("", response_model=ApiResponse[ItemList])
async def list_items(
    batch_id: str | None = None,
    store_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List items with optional filters."""
    items = item_service.list_items(
        batch_id=batch_id,
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        success=True,
        data=ItemList(items=[ItemView(**i) for i in items], total=len(items)),
    )


@router.get("/{item_id}", response_model=ApiResponse[ItemView])
async def get_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """Get an item by ID."""
    item = item_service.get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return ApiResponse(success=True, data=ItemView(**item))


@router.get("/{item_id}/detail", response_model=ApiResponse[ItemDetail])
async def get_item_detail(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """Get item with all related entities."""
    detail = item_service.get_item_detail(item_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return ApiResponse(success=True, data=ItemDetail(**detail))


# ============================================================================
# Supply Candidates
# ============================================================================


@router.post("/{item_id}/supply-candidates", response_model=ApiResponse[SupplyCandidateView])
async def add_supply_candidate(
    item_id: str,
    body: SupplyCandidateCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Add a supply candidate to an item."""
    candidate = supply_service.create_candidate(
        opportunity_item_id=item_id,
        source_platform=body.source_platform,
        source_item_ref=body.source_item_ref,
        cost_amount=body.cost_amount,
        supplier_ref=body.supplier_ref,
        moq=body.moq,
        ship_from=body.ship_from,
    )
    return ApiResponse(success=True, data=SupplyCandidateView(**candidate))


@router.get("/{item_id}/supply-candidates", response_model=ApiResponse[list[SupplyCandidateView]])
async def list_supply_candidates(
    item_id: str,
    status: str | None = None,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List supply candidates for an item."""
    candidates = supply_service.list_candidates(item_id, status=status)
    return ApiResponse(
        success=True,
        data=[SupplyCandidateView(**c) for c in candidates],
    )


@router.post("/{item_id}/select-best-candidate", response_model=ApiResponse[SupplyCandidateView | None])
async def select_best_candidate(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Select and set the best supply candidate."""
    best = supply_service.select_best_candidate(item_id)
    if best is None:
        return ApiResponse(success=True, data=None)
    return ApiResponse(success=True, data=SupplyCandidateView(**best))


# ============================================================================
# Category Mapping
# ============================================================================


@router.post("/{item_id}/mapping", response_model=ApiResponse[CategoryMappingView])
async def create_mapping(
    item_id: str,
    body: CategoryMappingCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Create a category mapping for an item."""
    try:
        attributes_data: Any = json.loads(body.attributes_payload) if isinstance(body.attributes_payload, str) else body.attributes_payload
        variation_data: Any = json.loads(body.variation_payload) if body.variation_payload else None
        evidence_data: Any = json.loads(body.evidence_payload) if body.evidence_payload else None
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON payload: {e}")
    mapping = mapping_service.create_mapping(
        opportunity_item_id=item_id,
        category_ref=body.category_ref,
        attributes=attributes_data,
        confidence_score=body.confidence_score,
        variation=variation_data,
        evidence=evidence_data,
    )
    return ApiResponse(success=True, data=CategoryMappingView(**mapping))


@router.get("/{item_id}/mappings", response_model=ApiResponse[list[CategoryMappingView]])
async def list_mappings(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List category mappings for an item."""
    mappings = mapping_service.list_mappings(item_id)
    return ApiResponse(
        success=True,
        data=[CategoryMappingView(**m) for m in mappings],
    )


# ============================================================================
# Content
# ============================================================================


@router.post("/{item_id}/content", response_model=ApiResponse[ContentVariantView])
async def create_content(
    item_id: str,
    body: ContentVariantCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Create a content variant for an item."""
    try:
        bullet_points_data: Any = json.loads(body.bullet_points) if body.bullet_points else None
        image_bundle_data: Any = json.loads(body.image_bundle_ref) if body.image_bundle_ref else None
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON payload: {e}")
    variant = content_service.create_variant(
        opportunity_item_id=item_id,
        title=body.title,
        bullet_points=bullet_points_data,
        image_bundle=image_bundle_data,
        template_ref=body.template_ref,
        locale=body.locale,
    )
    return ApiResponse(success=True, data=ContentVariantView(**variant))


@router.get("/{item_id}/content-variants", response_model=ApiResponse[list[ContentVariantView]])
async def list_content_variants(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List content variants for an item."""
    variants = content_service.list_variants(item_id)
    return ApiResponse(
        success=True,
        data=[ContentVariantView(**v) for v in variants],
    )


# ============================================================================
# Pricing
# ============================================================================


@router.post("/{item_id}/pricing", response_model=ApiResponse[PricingDecisionView])
async def create_pricing(
    item_id: str,
    body: PricingDecisionCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Create a pricing decision for an item."""
    try:
        cost_data: Any = json.loads(body.cost_payload)
        fee_data: Any = json.loads(body.fee_payload)
        exchange_rate_data: Any = json.loads(body.exchange_rate_payload)
        competitor_band_data: Any = json.loads(body.competitor_band_payload) if body.competitor_band_payload else None
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON payload: {e}")
    decision = pricing_service.create_decision(
        opportunity_item_id=item_id,
        cost=cost_data,
        fee=fee_data,
        exchange_rate=exchange_rate_data,
        suggested_price=body.suggested_price,
        min_profit_line=body.min_profit_line,
        competitor_band=competitor_band_data,
        decision_reason=body.decision_reason,
    )
    return ApiResponse(success=True, data=PricingDecisionView(**decision))


@router.get("/{item_id}/pricing-decisions", response_model=ApiResponse[list[PricingDecisionView]])
async def list_pricing_decisions(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List pricing decisions for an item."""
    decisions = pricing_service.list_decisions(item_id)
    return ApiResponse(
        success=True,
        data=[PricingDecisionView(**d) for d in decisions],
    )


# ============================================================================
# Preflight
# ============================================================================


@router.post("/{item_id}/preflight", response_model=ApiResponse[PreflightCheckView])
async def run_preflight(
    item_id: str,
    body: PreflightCheckCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Run a preflight check for an item."""
    details_data: Any = body.detail_payload
    check = preflight_service.create_check(
        opportunity_item_id=item_id,
        profit_check=body.profit_check,
        compliance_check=body.compliance_check,
        supply_check=body.supply_check,
        account_health_check=body.account_health_check,
        details=details_data,
    )
    return ApiResponse(success=True, data=PreflightCheckView(**check))


@router.get("/{item_id}/preflight-checks", response_model=ApiResponse[list[PreflightCheckView]])
async def list_preflight_checks(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List preflight checks for an item."""
    checks = preflight_service.list_checks(item_id)
    return ApiResponse(
        success=True,
        data=[PreflightCheckView(**c) for c in checks],
    )


# ============================================================================
# Status Transitions
# ============================================================================


@router.post("/{item_id}/advance/shortlisted", response_model=ApiResponse[ItemView])
async def advance_to_shortlisted(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Advance item to shortlisted status."""
    try:
        item = item_service.advance_to_shortlisted(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/advance/preflight-passed", response_model=ApiResponse[ItemView])
async def advance_to_preflight_passed(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Advance item to preflight_passed status."""
    try:
        item = item_service.advance_to_preflight_passed(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/publish", response_model=ApiResponse[ItemView])
async def publish_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark item as publishing."""
    try:
        item = item_service.advance_to_publishing(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Generic Status Advance
# ============================================================================


@router.post("/{item_id}/advance/{status}", response_model=ApiResponse[ItemView])
async def advance_item_to_status(
    item_id: str,
    status: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Advance item to a specific status with validation."""
    try:
        item = item_service.update_item_status(item_id, status)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/reject", response_model=ApiResponse[ItemView])
async def reject_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark item as rejected."""
    try:
        item = item_service.mark_as_rejected(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/block", response_model=ApiResponse[ItemView])
async def block_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark item as blocked."""
    try:
        item = item_service.mark_as_blocked(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/manual-required", response_model=ApiResponse[ItemView])
async def mark_manual_required(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark item as requiring manual intervention."""
    try:
        item = item_service.mark_as_manual_required(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{item_id}/archive", response_model=ApiResponse[ItemView])
async def archive_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Archive an item."""
    try:
        item = item_service.mark_as_archived(item_id)
        return ApiResponse(success=True, data=ItemView(**item))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Bulk Operations
# ============================================================================


@router.post("/bulk/status", response_model=ApiResponse[BulkOperationResult])
async def bulk_update_status(
    body: BulkStatusUpdate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Bulk update status for multiple items."""
    try:
        items = item_service.bulk_advance_status(body.item_ids, body.status)
        return ApiResponse(
            success=True,
            data=BulkOperationResult(
                success=True,
                updated_count=len(items),
                items=[ItemView(**i) for i in items],
            ),
        )
    except ValueError as e:
        return ApiResponse(
            success=False,
            data=BulkOperationResult(
                success=False,
                updated_count=0,
                items=[],
                errors=[str(e)],
            ),
            error=str(e),
        )


@router.post("/bulk/risk", response_model=ApiResponse[BulkOperationResult])
async def bulk_update_risk(
    body: BulkRiskUpdate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Bulk update risk level for multiple items."""
    items = item_service.bulk_set_risk(body.item_ids, body.risk_level)
    return ApiResponse(
        success=True,
        data=BulkOperationResult(
            success=True,
            updated_count=len(items),
            items=[ItemView(**i) for i in items],
        ),
    )


@router.post("/bulk/create", response_model=ApiResponse[BulkOperationResult])
async def bulk_create_items(
    body: BulkItemCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Bulk create multiple items in a batch."""
    items = item_service.bulk_create_items(
        batch_id=body.batch_id,
        store_id=body.store_id,
        items_data=body.items,
    )
    return ApiResponse(
        success=True,
        data=BulkOperationResult(
            success=True,
            updated_count=len(items),
            items=[ItemView(**i) for i in items],
        ),
    )
