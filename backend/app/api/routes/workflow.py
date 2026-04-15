from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import CurrentActor, require_roles
from app.schemas.common import ApiResponse
from app.services.workflow import (
    approve_draft as approve_draft_action,
    generate_drafts as generate_drafts_action,
    list_candidates as list_candidates_action,
    list_drafts as list_drafts_action,
    publish_draft as publish_draft_action,
    queue_candidate_intake,
    reject_draft as reject_draft_action,
)

router = APIRouter()


class IntakeRequest(BaseModel):
    source: str = Field(default="manual")
    count: int = Field(default=10, ge=1, le=100)


def _raise_workflow_error(error: Exception) -> None:
    if isinstance(error, LookupError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/candidates")
async def list_candidates(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[dict[str, object]]:
    candidates = list_candidates_action()
    return ApiResponse(success=True, data={"items": candidates}, meta={"count": len(candidates)})


@router.post("/candidates/intake")
async def intake_candidates(
    payload: IntakeRequest,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
) -> ApiResponse[dict[str, object]]:
    return ApiResponse(success=True, data=queue_candidate_intake(payload.source, payload.count))


@router.get("/drafts")
async def list_drafts(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[dict[str, object]]:
    drafts = list_drafts_action()
    return ApiResponse(success=True, data={"items": drafts}, meta={"count": len(drafts)})


@router.post("/drafts/generate")
async def generate_drafts(
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
) -> ApiResponse[dict[str, object]]:
    generated = generate_drafts_action()
    return ApiResponse(success=True, data=generated)


@router.post("/review/{draft_id}/approve")
async def approve_draft(
    draft_id: str,
    _actor: CurrentActor = Depends(require_roles("reviewer", "admin")),
) -> ApiResponse[dict[str, str]]:
    try:
        result = approve_draft_action(draft_id)
    except (LookupError, ValueError) as error:
        _raise_workflow_error(error)
    return ApiResponse(success=True, data=result)


@router.post("/review/{draft_id}/reject")
async def reject_draft(
    draft_id: str,
    _actor: CurrentActor = Depends(require_roles("reviewer", "admin")),
) -> ApiResponse[dict[str, str]]:
    try:
        result = reject_draft_action(draft_id)
    except (LookupError, ValueError) as error:
        _raise_workflow_error(error)
    return ApiResponse(success=True, data=result)


@router.post("/publish/{draft_id}")
async def publish_draft(
    draft_id: str,
    _actor: CurrentActor = Depends(require_roles("admin",)),
) -> ApiResponse[dict[str, str]]:
    try:
        result = publish_draft_action(draft_id)
    except (LookupError, ValueError) as error:
        _raise_workflow_error(error)
    return ApiResponse(success=True, data=result)
