"""API routes for Sprint 2 batch management."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import CurrentActor, require_roles
from app.schemas.common import ApiResponse
from app.schemas.sprint2 import (
    BatchCreate,
    BatchList,
    BatchView,
    BatchWithStatusCounts,
)
from app.services import batches as batch_service

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post("", response_model=ApiResponse[BatchView])
async def create_batch(
    body: BatchCreate,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Create a new opportunity batch."""
    batch = batch_service.create_batch(
        store_id=body.store_id,
        trigger_type=body.trigger_type,
        trigger_payload=body.trigger_payload,
        priority=body.priority,
    )
    return ApiResponse(success=True, data=BatchView(**batch))


@router.get("", response_model=ApiResponse[BatchList])
async def list_batches(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """List batches with optional filters."""
    batches = batch_service.list_batches(
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        success=True,
        data=BatchList(items=[BatchView(**b) for b in batches], total=len(batches)),
    )


@router.get("/{batch_id}", response_model=ApiResponse[BatchView])
async def get_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """Get a batch by ID."""
    batch = batch_service.get_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchView(**batch))


@router.get("/{batch_id}/status", response_model=ApiResponse[BatchWithStatusCounts])
async def get_batch_status(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """Get batch with item status counts."""
    batch = batch_service.get_batch_status_summary(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchWithStatusCounts(**batch))


@router.post("/{batch_id}/start", response_model=ApiResponse[BatchView])
async def start_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Start a batch."""
    batch = batch_service.start_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchView(**batch))


@router.post("/{batch_id}/pause", response_model=ApiResponse[BatchView])
async def pause_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Pause a batch."""
    try:
        batch = batch_service.pause_batch(batch_id)
        if batch is None:
            raise HTTPException(status_code=404, detail="Batch not found")
        return ApiResponse(success=True, data=BatchView(**batch))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/resume", response_model=ApiResponse[BatchView])
async def resume_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Resume a paused batch."""
    try:
        batch = batch_service.resume_batch(batch_id)
        if batch is None:
            raise HTTPException(status_code=404, detail="Batch not found")
        return ApiResponse(success=True, data=BatchView(**batch))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{batch_id}/complete", response_model=ApiResponse[BatchView])
async def complete_batch(
    batch_id: str,
    has_issues: bool = False,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark batch as completed."""
    batch = batch_service.complete_batch(batch_id, has_issues=has_issues)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchView(**batch))


@router.post("/{batch_id}/fail", response_model=ApiResponse[BatchView])
async def fail_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Mark batch as failed."""
    batch = batch_service.fail_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchView(**batch))


@router.post("/{batch_id}/archive", response_model=ApiResponse[BatchView])
async def archive_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Archive a batch."""
    batch = batch_service.archive_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return ApiResponse(success=True, data=BatchView(**batch))


@router.get("/{batch_id}/statistics", response_model=ApiResponse[dict])
async def get_batch_statistics(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
):
    """Get detailed statistics for a batch including stage distribution and metrics."""
    batch = batch_service.get_batch(batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")

    stats = batch_service.get_batch_statistics(batch_id)
    return ApiResponse(success=True, data=stats)
