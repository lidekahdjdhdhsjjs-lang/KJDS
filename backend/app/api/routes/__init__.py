from fastapi import APIRouter

# Core Routes
from app.api.routes.health import router as health_router

# API Version 1 Routes
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.platform_connections import router as platform_connections_router
from app.api.routes.workflow import router as workflow_router

# Sprint 2 Feature Routes
from app.api.routes.batches import router as batches_router
from app.api.routes.opportunities import router as opportunities_router
from app.api.routes.publish_tasks import router as publish_tasks_router
from app.api.routes.procurement_drafts import router as procurement_drafts_router
from app.api.routes.agent_runs import router as agent_runs_router

# Exception Management Routes
from app.api.routes.incidents import router as incidents_router
from app.api.routes.store_health import router as store_health_router

# Business Intelligence Routes
from app.api.routes.demand_signals import router as demand_signals_router
from app.api.routes.training_packages import router as training_packages_router
from app.api.routes.feedback_records import router as feedback_records_router

# Sprint 3: Browser Automation
from app.api.routes.browser_automation import router as browser_automation_router

# Auto Pipeline
from app.api.routes.pipeline import router as pipeline_router

# System Configuration
from app.api.routes.system_config import router as system_config_router

# Main API Router
router = APIRouter()

# Health check (no prefix for easy access)
router.include_router(health_router)

# API v1 routes with version prefix
api_v1 = APIRouter(
    prefix="/api/v1",
    responses={
        404: {"description": "Not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"},
    }
)

# Core Business Routes
api_v1.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_v1.include_router(platform_connections_router, prefix="/platform-connections", tags=["platform-connections"])
api_v1.include_router(workflow_router, tags=["workflow"])

# Sprint 2 Feature Routes
api_v1.include_router(batches_router, tags=["batches"])
api_v1.include_router(opportunities_router, tags=["opportunities"])
api_v1.include_router(publish_tasks_router, tags=["publish-tasks"])
api_v1.include_router(procurement_drafts_router, tags=["procurement-drafts"])
api_v1.include_router(agent_runs_router, tags=["agent-runs"])

# Exception Management Routes
api_v1.include_router(incidents_router, tags=["incidents"])
api_v1.include_router(store_health_router, tags=["store-health"])

# Business Intelligence Routes
api_v1.include_router(demand_signals_router, tags=["demand-signals"])
api_v1.include_router(training_packages_router, tags=["training-packages"])
api_v1.include_router(feedback_records_router, tags=["feedback-records"])

# Advanced Automation Routes
api_v1.include_router(browser_automation_router, tags=["browser-automation"])
api_v1.include_router(pipeline_router, tags=["pipeline"])

# System Management Routes
api_v1.include_router(system_config_router, tags=["system-config"])

# Include all API v1 routes to main router
router.include_router(api_v1)

# API Version Management
# Future API versions can be added here
# api_v2 = APIRouter(prefix="/api/v2")
# router.include_router(api_v2)
