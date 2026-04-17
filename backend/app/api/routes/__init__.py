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
router.include_router(health_router)
router.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])
router.include_router(platform_connections_router, prefix="/api/v1/platform-connections", tags=["platform-connections"])
router.include_router(workflow_router, prefix="/api/v1", tags=["workflow"])

# Sprint 2 routes
router.include_router(batches_router, prefix="/api/v1")
router.include_router(opportunities_router, prefix="/api/v1")
router.include_router(publish_tasks_router, prefix="/api/v1")
router.include_router(procurement_drafts_router, prefix="/api/v1")
router.include_router(agent_runs_router, prefix="/api/v1")

# Exceptions center routes
router.include_router(incidents_router, prefix="/api/v1")
router.include_router(store_health_router, prefix="/api/v1")

# Demand signals routes
router.include_router(demand_signals_router, prefix="/api/v1")

# Training archive routes
router.include_router(training_packages_router, prefix="/api/v1")

# Feedback records routes
router.include_router(feedback_records_router, prefix="/api/v1")

# Sprint 3: Browser Automation routes
router.include_router(browser_automation_router, prefix="/api/v1")

# Auto Pipeline routes
router.include_router(pipeline_router, prefix="/api/v1")

# System Configuration routes
router.include_router(system_config_router, prefix="/api/v1")
