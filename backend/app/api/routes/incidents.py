"""API routes for incidents and store health management."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ApiResponse
from app.services import incidents as incident_service

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=ApiResponse[list[dict[str, Any]]])
async def list_incidents(
    store_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List incidents with optional filters."""
    incidents = incident_service.list_incidents(
        store_id=store_id,
        severity=severity,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ApiResponse(success=True, data=incidents)


@router.get("/{incident_id}", response_model=ApiResponse[dict[str, Any]])
async def get_incident(incident_id: str):
    """Get an incident by ID."""
    incident = incident_service.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return ApiResponse(success=True, data=incident)


@router.post("/{incident_id}/acknowledge", response_model=ApiResponse[dict[str, Any]])
async def acknowledge_incident(incident_id: str):
    """Acknowledge an incident."""
    incident = incident_service.acknowledge_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return ApiResponse(success=True, data=incident)


@router.post("/{incident_id}/resolve", response_model=ApiResponse[dict[str, Any]])
async def resolve_incident(incident_id: str):
    """Resolve an incident."""
    incident = incident_service.resolve_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return ApiResponse(success=True, data=incident)
