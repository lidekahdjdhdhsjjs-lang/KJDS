"""API routes for Sprint 2 procurement draft management."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse
from app.schemas.sprint2 import (
    ProcurementDraftCreate,
    ProcurementDraftList,
    ProcurementDraftView,
)
from app.services import procurement as procurement_service

router = APIRouter(prefix="/procurement-drafts", tags=["procurement-drafts"])


@router.post("", response_model=ApiResponse[ProcurementDraftView])
async def create_draft(body: ProcurementDraftCreate):
    """Create a new procurement draft."""
    sku_data: Any = body.sku_payload
    draft = procurement_service.create_draft(
        opportunity_item_id=body.opportunity_item_id,
        supplier_ref=body.supplier_ref,
        purchase_price=body.purchase_price,
        sku=sku_data,
        qty=body.qty,
    )
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))


@router.get("", response_model=ApiResponse[ProcurementDraftList])
async def list_drafts(
    opportunity_item_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List procurement drafts with optional filters."""
    drafts = procurement_service.list_drafts(
        opportunity_item_id=opportunity_item_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        success=True,
        data=ProcurementDraftList(items=[ProcurementDraftView(**d) for d in drafts], total=len(drafts)),
    )


@router.get("/{draft_id}", response_model=ApiResponse[ProcurementDraftView])
async def get_draft(draft_id: str):
    """Get a draft by ID."""
    draft = procurement_service.get_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))


@router.post("/{draft_id}/submit", response_model=ApiResponse[ProcurementDraftView])
async def submit_for_confirmation(draft_id: str):
    """Submit draft for confirmation."""
    draft = procurement_service.submit_for_confirmation(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))


@router.post("/{draft_id}/confirm", response_model=ApiResponse[ProcurementDraftView])
async def confirm_draft(draft_id: str):
    """Confirm a draft."""
    draft = procurement_service.confirm_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))


@router.post("/{draft_id}/invalidate", response_model=ApiResponse[ProcurementDraftView])
async def invalidate_draft(draft_id: str, reason: str):
    """Invalidate a draft."""
    draft = procurement_service.invalidate_draft(draft_id, reason)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))


@router.post("/{draft_id}/cancel", response_model=ApiResponse[ProcurementDraftView])
async def cancel_draft(draft_id: str):
    """Cancel a draft."""
    draft = procurement_service.cancel_draft(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")
    return ApiResponse(success=True, data=ProcurementDraftView(**draft))
