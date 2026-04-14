from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from app.core.auth import CurrentActor, require_roles
from app.core.config import settings
from app.schemas.common import ApiResponse
from app.schemas.platform_connections import (
    PlatformAuthorizationStartResponse,
    PlatformConnectionStatus,
    PlatformConnectionsSummary,
    PlatformName,
    StoreAuthorizationsResponse,
    StoreHealthResponse,
    StoreListResponse,
)
from app.services.platform_connections import (
    complete_platform_authorization,
    disconnect_platform_connection,
    get_platform_connection_status,
    get_store_health_view,
    list_platform_connections_view,
    list_store_authorizations_view,
    list_stores_view,
    refresh_platform_tokens,
    start_platform_authorization,
)

router = APIRouter()

# Simple in-memory rate limiter for the public status endpoint
_status_request_counts: dict[str, list[float]] = {}
_STATUS_RATE_LIMIT = 30  # max requests per window
_STATUS_RATE_WINDOW = 60.0  # seconds


def _raise_platform_connection_error(error: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("")
async def list_platform_connections(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[PlatformConnectionsSummary]:
    summary = list_platform_connections_view()
    return ApiResponse(success=True, data=summary, meta={"count": len(summary.items)})


@router.post("/{platform}/start")
async def start_platform_connection_authorization(
    platform: PlatformName,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
) -> ApiResponse[PlatformAuthorizationStartResponse]:
    return ApiResponse(success=True, data=start_platform_authorization(platform))


@router.get("/{platform}/status")
async def get_connection_status(
    platform: PlatformName,
    request: Request,
) -> ApiResponse[dict]:
    """Get current platform connection status for polling.

    No authentication required — this endpoint is publicly pollable during OAuth.
    Rate limited to prevent abuse.
    """
    import time as _time

    client_key = request.client.host if request.client else "unknown"
    now = _time.time()
    requests = _status_request_counts.get(client_key, [])
    # Prune expired entries
    requests = [t for t in requests if now - t < _STATUS_RATE_WINDOW]
    if len(requests) >= _STATUS_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )
    requests.append(now)
    _status_request_counts[client_key] = requests

    connection_status = get_platform_connection_status(platform)
    return ApiResponse(success=True, data=connection_status)


def _dashboard_redirect(platform: PlatformName, authorization_status: str) -> RedirectResponse:
    query = urlencode(
        {
            "authorization_platform": platform,
            "authorization_status": authorization_status,
        }
    )
    return RedirectResponse(url=f"{settings.frontend_base_url}/dashboard?{query}", status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/{platform}/callback", response_model=None)
async def complete_platform_connection_authorization(
    platform: PlatformName,
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    provider_error: str | None = Query(default=None, alias="error"),
    response_mode: str = Query(default="redirect"),
):
    try:
        connection = complete_platform_authorization(
            platform=platform,
            state=state.strip() if state else None,
            code=code.strip() if code else None,
            provider_error=provider_error.strip() if provider_error else None,
        )
    except ValueError as error:
        if response_mode == "json":
            _raise_platform_connection_error(error)
        return _dashboard_redirect(platform, "error")

    if response_mode == "json":
        return ApiResponse(success=True, data=connection)

    authorization_status = "connected" if connection.connected else "error"
    return _dashboard_redirect(platform, authorization_status)


@router.post("/{platform}/disconnect")
async def disconnect_platform_connection_route(
    platform: PlatformName,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
) -> ApiResponse[PlatformConnectionStatus]:
    return ApiResponse(success=True, data=disconnect_platform_connection(platform))


@router.post("/{platform}/refresh")
async def refresh_tokens_route(
    platform: PlatformName,
    _actor: CurrentActor = Depends(require_roles("operator", "admin")),
) -> ApiResponse[PlatformConnectionStatus]:
    """Manually refresh OAuth tokens for a platform."""
    try:
        connection = await refresh_platform_tokens(platform)
    except ValueError as error:
        _raise_platform_connection_error(error)
    return ApiResponse(success=True, data=connection)


@router.get("/stores")
async def list_stores_route(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[StoreListResponse]:
    items = list_stores_view()
    return ApiResponse(success=True, data=StoreListResponse(items=items), meta={"count": len(items)})


@router.get("/stores/{store_id}/authorizations")
async def list_store_authorizations_route(
    store_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[StoreAuthorizationsResponse]:
    items = list_store_authorizations_view(store_id)
    return ApiResponse(success=True, data=StoreAuthorizationsResponse(items=items), meta={"count": len(items)})


@router.get("/stores/{store_id}/health")
async def get_store_health_route(
    store_id: str,
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[StoreHealthResponse]:
    try:
        health = get_store_health_view(store_id)
    except ValueError as error:
        _raise_platform_connection_error(error)
    return ApiResponse(success=True, data=StoreHealthResponse(item=health))
