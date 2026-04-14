"""API routes for feedback records."""

import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.schemas.common import ApiResponse
from app.repositories import feedback_records as repo

router = APIRouter(prefix="/feedback-records", tags=["feedback-records"])


class FeedbackCreate(BaseModel):
    opportunity_item_id: str
    feedback_type: str = Field(description="content_fix, mapping_fix, pricing_fix")
    source_type: str = Field(description="operator, reviewer, admin")
    before_payload: str = Field(description="JSON string of before state")
    after_payload: str = Field(description="JSON string of after state")
    reviewer_ref: str | None = None


@router.post("", response_model=ApiResponse[dict[str, Any]])
async def create_feedback(body: FeedbackCreate):
    """Create a new feedback record."""
    try:
        json.loads(body.before_payload)
        json.loads(body.after_payload)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"Invalid JSON payload: {e}")
    feedback = repo.create_feedback(
        opportunity_item_id=body.opportunity_item_id,
        feedback_type=body.feedback_type,
        source_type=body.source_type,
        before_payload=body.before_payload,
        after_payload=body.after_payload,
        reviewer_ref=body.reviewer_ref,
    )
    return ApiResponse(success=True, data=feedback)


@router.get("", response_model=ApiResponse[dict[str, Any]])
async def list_feedback(
    opportunity_item_id: str | None = None,
    feedback_type: str | None = None,
    review_status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List feedback records with optional filters."""
    records = repo.list_feedback(
        opportunity_item_id=opportunity_item_id,
        feedback_type=feedback_type,
        review_status=review_status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(success=True, data={"items": records, "total": len(records)})


@router.get("/{feedback_id}", response_model=ApiResponse[dict[str, Any]])
async def get_feedback(feedback_id: str):
    """Get a feedback record by ID."""
    feedback = repo.get_feedback(feedback_id)
    if feedback is None:
        raise HTTPException(status_code=404, detail="Feedback record not found")
    return ApiResponse(success=True, data=feedback)


@router.post("/{feedback_id}/approve", response_model=ApiResponse[dict[str, Any]])
async def approve_feedback(feedback_id: str):
    """Approve a feedback record."""
    result = repo.approve_feedback(feedback_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Feedback record not found")
    return ApiResponse(success=True, data=result)


@router.post("/{feedback_id}/reject", response_model=ApiResponse[dict[str, Any]])
async def reject_feedback(feedback_id: str):
    """Reject a feedback record."""
    result = repo.reject_feedback(feedback_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Feedback record not found")
    return ApiResponse(success=True, data=result)
