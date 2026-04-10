from fastapi import APIRouter

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.platform_connections import router as platform_connections_router
from app.api.routes.workflow import router as workflow_router

router = APIRouter()
router.include_router(health_router)
router.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])
router.include_router(platform_connections_router, prefix="/api/v1/platform-connections", tags=["platform-connections"])
router.include_router(workflow_router, prefix="/api/v1", tags=["workflow"])
