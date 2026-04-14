"""Services for store health status management."""

from typing import Any

# In-memory store for health statuses (would be database in production)
_store_health: list[dict[str, Any]] = [
    {
        "store_id": "shopee-default-store",
        "platform": "shopee",
        "oauth_status": "connected",
        "api_quota_remaining": 4500,
        "api_quota_total": 5000,
        "last_success_at": "2026-04-11T10:00:00Z",
        "last_error": None,
        "error_rate": 0.02,
        "risk_flags": [],
    }
]


def list_store_health() -> list[dict[str, Any]]:
    """List all store health statuses."""
    return _store_health.copy()


def get_store_health(store_id: str) -> dict[str, Any] | None:
    """Get health status for a specific store."""
    for health in _store_health:
        if health["store_id"] == store_id:
            return health
    return None


def update_store_health(
    store_id: str,
    oauth_status: str | None = None,
    api_quota_remaining: int | None = None,
    last_error: str | None = None,
    error_rate: float | None = None,
    risk_flags: list[str] | None = None,
) -> dict[str, Any] | None:
    """Update health status for a store."""
    health = get_store_health(store_id)
    if health:
        if oauth_status is not None:
            health["oauth_status"] = oauth_status
        if api_quota_remaining is not None:
            health["api_quota_remaining"] = api_quota_remaining
        if last_error is not None:
            health["last_error"] = last_error
        if error_rate is not None:
            health["error_rate"] = error_rate
        if risk_flags is not None:
            health["risk_flags"] = risk_flags
        return health
    return None
