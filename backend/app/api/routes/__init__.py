from fastapi import APIRouter

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.platform_connections import router as platform_connections_router
from app.api.routes.workflow import router as workflow_router
from app.api.routes.batches import router as batches_router
from app.api.routes.opportunities import router as opportunities_router
from app.api.routes.publish_tasks import router as publish_tasks_router
from app.api.routes.procurement_drafts import router as procurement_drafts_router
from app.api.routes.agent_runs import router as agent_runs_router
from app.api.routes.incidents import router as incidents_router
from app.api.routes.store_health import router as store_health_router
from app.api.routes.demand_signals import router as demand_signals_router
from app.api.routes.training_packages import router as training_packages_router

from app.api.routes.feedback_records import router as feedback_records_router

# Sprint 3: Browser Automation
from app.api.routes.browser_automation import router as browser_automation_router

# Auto Pipeline
from app.api.routes.pipeline import router as pipeline_router

# System Configuration
from app.api.routes.system_config import router as system_config_router

router = APIRouter()

# Health check (no prefix for easy access)
router.include_router(health_router)

# API v1 routes
api_v1 = APIRouter(prefix="/api/v1")

# Dashboard
api_v1.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

# Platform connections
api_v1.include_router(platform_connections_router, prefix="/platform-connections", tags=["platform-connections"])

# Workflow
api_v1.include_router(workflow_router, tags=["workflow"])

# Sprint 2 routes
api_v1.include_router(batches_router, tags=["batches"])
api_v1.include_router(opportunities_router, tags=["opportunities"])
api_v1.include_router(publish_tasks_router, tags=["publish-tasks"])
api_v1.include_router(procurement_drafts_router, tags=["procurement-drafts"])
api_v1.include_router(agent_runs_router, tags=["agent-runs"])

# Exceptions center routes
api_v1.include_router(incidents_router, tags=["incidents"])
api_v1.include_router(store_health_router, tags=["store-health"])

# Demand signals routes
api_v1.include_router(demand_signals_router, tags=["demand-signals"])

# Training archive routes
api_v1.include_router(training_packages_router, tags=["training-packages"])

# Feedback records routes
api_v1.include_router(feedback_records_router, tags=["feedback-records"])

# Sprint 3: Browser Automation routes
api_v1.include_router(browser_automation_router, tags=["browser-automation"])

# Auto Pipeline routes
api_v1.include_router(pipeline_router, tags=["pipeline"])

# System Configuration routes
api_v1.include_router(system_config_router, tags=["system-config"])

# Include all API v1 routes
router.include_router(api_v1)
