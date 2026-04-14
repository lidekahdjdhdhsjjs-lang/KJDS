"""API routes for Sprint 2 agent run management."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse
from app.schemas.sprint2 import (
    AgentRunComplete,
    AgentRunCreate,
    AgentRunList,
    AgentRunView,
)
from app.services import agent_runs as agent_service

router = APIRouter(prefix="/agent-runs", tags=["agent-runs"])


@router.post("", response_model=ApiResponse[AgentRunView])
async def create_run(body: AgentRunCreate):
    """Create a new agent run."""
    run = agent_service.create_run(
        agent_name=body.agent_name,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        model_name=body.model_name,
        input_summary=body.input_summary,
    )
    return ApiResponse(success=True, data=AgentRunView(**run))


@router.get("", response_model=ApiResponse[AgentRunList])
async def list_runs(
    agent_name: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List agent runs with optional filters."""
    runs = agent_service.list_runs(
        agent_name=agent_name,
        entity_type=entity_type,
        entity_id=entity_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(
        success=True,
        data=AgentRunList(items=[AgentRunView(**r) for r in runs], total=len(runs)),
    )


@router.get("/{run_id}", response_model=ApiResponse[AgentRunView])
async def get_run(run_id: str):
    """Get a run by ID."""
    run = agent_service.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return ApiResponse(success=True, data=AgentRunView(**run))


@router.post("/{run_id}/complete", response_model=ApiResponse[AgentRunView])
async def complete_run(run_id: str, body: AgentRunComplete):
    """Mark a run as completed."""
    evidence_data: Any = body.evidence_payload
    cost_data: Any = body.cost_payload
    run = agent_service.complete_run(
        run_id,
        output_summary=body.output_summary,
        evidence=evidence_data,
        cost=cost_data,
    )
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return ApiResponse(success=True, data=AgentRunView(**run))


@router.post("/{run_id}/fail", response_model=ApiResponse[AgentRunView])
async def fail_run(run_id: str, output_summary: str | None = None):
    """Mark a run as failed."""
    run = agent_service.fail_run(run_id, output_summary=output_summary)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return ApiResponse(success=True, data=AgentRunView(**run))


@router.get("/entity/{entity_type}/{entity_id}", response_model=ApiResponse[list[AgentRunView]])
async def get_runs_for_entity(entity_type: str, entity_id: str):
    """Get all runs for an entity."""
    runs = agent_service.get_runs_for_entity(entity_type, entity_id)
    return ApiResponse(
        success=True,
        data=[AgentRunView(**r) for r in runs],
    )
