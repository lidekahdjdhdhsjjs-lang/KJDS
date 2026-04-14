"""Services for incident management."""

from typing import Any

# In-memory store for incidents (would be database in production)
_incidents: list[dict[str, Any]] = []


def create_incident(
    store_id: str,
    incident_type: str,
    severity: str,
    message: str,
    context_payload: str | None = None,
) -> dict[str, Any]:
    """Create a new incident."""
    import uuid
    from datetime import datetime, UTC

    incident = {
        "id": f"inc-{uuid.uuid4().hex[:16]}",
        "store_id": store_id,
        "incident_type": incident_type,
        "severity": severity,
        "message": message,
        "context_payload": context_payload,
        "status": "open",
        "created_at": datetime.now(UTC).isoformat(),
        "resolved_at": None,
    }
    _incidents.append(incident)
    return incident


def list_incidents(
    store_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List incidents with optional filters."""
    filtered = _incidents.copy()

    if store_id:
        filtered = [i for i in filtered if i["store_id"] == store_id]
    if severity:
        filtered = [i for i in filtered if i["severity"] == severity]
    if status:
        filtered = [i for i in filtered if i["status"] == status]

    return filtered[offset : offset + limit]


def get_incident(incident_id: str) -> dict[str, Any] | None:
    """Get an incident by ID."""
    for incident in _incidents:
        if incident["id"] == incident_id:
            return incident
    return None


def acknowledge_incident(incident_id: str) -> dict[str, Any] | None:
    """Acknowledge an incident."""
    incident = get_incident(incident_id)
    if incident:
        incident["status"] = "acknowledged"
        return incident
    return None


def resolve_incident(incident_id: str) -> dict[str, Any] | None:
    """Resolve an incident."""
    from datetime import datetime, UTC

    incident = get_incident(incident_id)
    if incident:
        incident["status"] = "resolved"
        incident["resolved_at"] = datetime.now(UTC).isoformat()
        return incident
    return None
