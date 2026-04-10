from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardSummary, PlatformAuthorizationStatus
from app.services.dashboard import get_dashboard_summary_view, get_platform_authorization_status_view

from fastapi import APIRouter, Depends

from app.core.auth import CurrentActor, require_roles

router = APIRouter()


@router.get("/summary")
async def dashboard_summary(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[DashboardSummary]:
    return ApiResponse(success=True, data=get_dashboard_summary_view())


@router.get("/authorization")
async def dashboard_authorization(
    _actor: CurrentActor = Depends(require_roles("operator", "reviewer", "admin")),
) -> ApiResponse[PlatformAuthorizationStatus]:
    return ApiResponse(success=True, data=get_platform_authorization_status_view())
