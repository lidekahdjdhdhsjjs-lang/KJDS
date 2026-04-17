"""API routes for the automated pipeline."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import CurrentActor, require_roles
from app.schemas.common import ApiResponse
from app.services import auto_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/run/{item_id}", response_model=ApiResponse[dict[str, Any]])
async def run_pipeline_for_item(
    item_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Run the full automated pipeline for a single opportunity item.

    This orchestrates: Score -> Map Category -> Generate Content -> Price -> Review -> Publish
    If any step fails, an incident is created and human review is requested.
    """
    result = auto_pipeline.run_auto_pipeline(item_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("error", "Item not found"))
    return ApiResponse(success=True, data=result)


@router.post("/run-batch/{batch_id}", response_model=ApiResponse[dict[str, Any]])
async def run_pipeline_for_batch(
    batch_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Run the auto pipeline for all items in a batch."""
    results = auto_pipeline.run_batch_pipeline(batch_id)
    success_count = sum(1 for r in results if r.get("status") == "success")
    needs_human = sum(1 for r in results if r.get("status") == "needs_human")
    return ApiResponse(success=True, data={
        "total": len(results),
        "success": success_count,
        "needs_human": needs_human,
        "results": results,
    })


@router.post("/check-store-health", response_model=ApiResponse[list[dict[str, Any]]])
async def check_store_health(
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
):
    """Auto-check store health and create incidents for issues."""
    results = auto_pipeline.check_store_health_auto()
    return ApiResponse(success=True, data=results)
