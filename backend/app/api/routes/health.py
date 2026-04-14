from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import text

from app.db import SessionLocal
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("/health")
async def health() -> ApiResponse[dict[str, str]]:
    """Basic health check."""
    return ApiResponse(success=True, data={"status": "ok"})


@router.get("/health/detailed")
async def health_detailed() -> ApiResponse[dict]:
    """Detailed health check with database connectivity."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "components": {},
    }

    # Check database connectivity
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        health_status["components"]["database"] = {
            "status": "healthy",
            "type": "sqlite",
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    # Check if migrations are up to date (simplified check)
    try:
        with SessionLocal() as session:
            # Check if opportunity_batches table exists
            result = session.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='opportunity_batches'")
            )
            if result.fetchone():
                health_status["components"]["migrations"] = {"status": "applied"}
            else:
                health_status["components"]["migrations"] = {"status": "pending"}
                health_status["status"] = "degraded"
    except Exception as e:
        health_status["components"]["migrations"] = {
            "status": "unknown",
            "error": str(e),
        }

    return ApiResponse(success=True, data=health_status)


@router.get("/health/ready")
async def health_ready() -> ApiResponse[dict[str, bool]]:
    """Readiness check for deployment systems."""
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return ApiResponse(success=True, data={"ready": True})
    except Exception:
        return ApiResponse(success=False, data={"ready": False}, error="Database not available")
