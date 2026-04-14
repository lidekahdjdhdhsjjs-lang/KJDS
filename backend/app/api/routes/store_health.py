"""API routes for store health status."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse
from app.services import store_health as health_service

router = APIRouter(prefix="/store-health", tags=["store-health"])


@router.get("", response_model=ApiResponse[dict[str, Any]])
async def list_store_health(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List all store health statuses."""
    health_statuses = health_service.list_store_health()
    return ApiResponse(success=True, data={"items": health_statuses, "total": len(health_statuses)})


@router.get("/{store_id}", response_model=ApiResponse[dict[str, Any]])
async def get_store_health(store_id: str):
    """Get health status for a specific store."""
    health = health_service.get_store_health(store_id)
    if health is None:
        raise HTTPException(status_code=404, detail="Store health not found")
    return ApiResponse(success=True, data=health)
