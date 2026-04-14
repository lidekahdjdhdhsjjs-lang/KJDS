"""API routes for Sprint 2 publish task management."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse
from app.schemas.sprint2 import (
    PublishTaskCreate,
    PublishTaskList,
    PublishTaskView,
    PublishResultView,
)
from app.services import publishing as publish_service

router = APIRouter(prefix="/publish-tasks", tags=["publish-tasks"])


@router.post("", response_model=ApiResponse[PublishTaskView])
async def create_task(body: PublishTaskCreate):
    """Create a new publish task."""
    request_data: Any = body.request_payload
    task = publish_service.create_task(
        opportunity_item_id=body.opportunity_item_id,
        store_id=body.store_id,
        request_data=request_data,
        channel=body.channel,
    )
    return ApiResponse(success=True, data=PublishTaskView(**task))


@router.get("", response_model=ApiResponse[PublishTaskList])
async def list_tasks(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List publish tasks with optional filters."""
    tasks = publish_service.list_tasks(
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        success=True,
        data=PublishTaskList(items=[PublishTaskView(**t) for t in tasks], total=len(tasks)),
    )


@router.get("/{task_id}", response_model=ApiResponse[PublishTaskView])
async def get_task(task_id: str):
    """Get a task by ID."""
    task = publish_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return ApiResponse(success=True, data=PublishTaskView(**task))


@router.post("/{task_id}/start", response_model=ApiResponse[PublishTaskView])
async def start_task(task_id: str):
    """Start a task."""
    task = publish_service.start_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return ApiResponse(success=True, data=PublishTaskView(**task))


@router.post("/{task_id}/complete", response_model=ApiResponse[PublishTaskView])
async def complete_task(task_id: str, platform_item_ref: str | None = None, response_data: Any = None):
    """Mark task as completed."""
    try:
        task = publish_service.complete_task(
            task_id,
            platform_item_ref=platform_item_ref,
            response_data=response_data,
        )
        return ApiResponse(success=True, data=PublishTaskView(**task))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{task_id}/fail", response_model=ApiResponse[PublishTaskView])
async def fail_task(task_id: str, error: str, retryable: bool = True):
    """Mark task as failed."""
    if retryable:
        task = publish_service.fail_task_retryable(task_id, error)
    else:
        task = publish_service.fail_task_terminal(task_id, error)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return ApiResponse(success=True, data=PublishTaskView(**task))


@router.post("/{task_id}/retry", response_model=ApiResponse[PublishTaskView])
async def retry_task(task_id: str):
    """Retry a failed task."""
    try:
        task = publish_service.retry_task(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        return ApiResponse(success=True, data=PublishTaskView(**task))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{task_id}/results", response_model=ApiResponse[list[PublishResultView]])
async def get_results(task_id: str):
    """Get results for a task."""
    results = publish_service.get_results_for_task(task_id)
    return ApiResponse(
        success=True,
        data=[PublishResultView(**r) for r in results],
    )
