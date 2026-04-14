"""API routes for demand signal snapshots."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.common import ApiResponse
from app.repositories import demand_signal_snapshots as repo

router = APIRouter(prefix="/demand-signals", tags=["demand-signals"])


class DemandSignalCreate(BaseModel):
    opportunity_item_id: str
    signal_type: str
    source: str
    payload: str
    snapshot_time: str


@router.post("", response_model=ApiResponse[dict[str, Any]])
async def create_snapshot(body: DemandSignalCreate):
    """Create a new demand signal snapshot."""
    snapshot = repo.create_snapshot(
        opportunity_item_id=body.opportunity_item_id,
        signal_type=body.signal_type,
        source=body.source,
        payload=body.payload,
        snapshot_time=body.snapshot_time,
    )
    return ApiResponse(success=True, data=snapshot)


@router.get("/item/{item_id}", response_model=ApiResponse[list[dict[str, Any]]])
async def list_item_snapshots(
    item_id: str,
    signal_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """List demand signal snapshots for an opportunity item."""
    snapshots = repo.list_snapshots(
        opportunity_item_id=item_id,
        signal_type=signal_type,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(success=True, data=snapshots)


@router.get("/{snapshot_id}", response_model=ApiResponse[dict[str, Any]])
async def get_snapshot(snapshot_id: str):
    """Get a snapshot by ID."""
    snapshot = repo.get_snapshot(snapshot_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return ApiResponse(success=True, data=snapshot)
