"""Repository for DemandSignalSnapshot operations."""

from datetime import datetime
from typing import Any

from app.db import SessionLocal
from app.models import DemandSignalSnapshotRecord


def _parse_datetime(dt_str: str) -> datetime:
    """Parse a datetime string into a datetime object."""
    if isinstance(dt_str, datetime):
        return dt_str
    # Handle ISO format strings
    try:
        # Try parsing with timezone
        return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        # Fallback to current time
        return datetime.utcnow()


def create_snapshot(
    opportunity_item_id: str,
    signal_type: str,
    source: str,
    payload: str,
    snapshot_time: str,
) -> dict[str, Any]:
    """Create a new demand signal snapshot."""
    import uuid

    parsed_time = _parse_datetime(snapshot_time)

    with SessionLocal() as session:
        snapshot = DemandSignalSnapshotRecord(
            id=f"dss-{uuid.uuid4().hex[:16]}",
            opportunity_item_id=opportunity_item_id,
            signal_type=signal_type,
            source=source,
            payload=payload,
            snapshot_time=parsed_time,
        )
        session.add(snapshot)
        session.commit()
        session.refresh(snapshot)
        return {
            "id": snapshot.id,
            "opportunity_item_id": snapshot.opportunity_item_id,
            "signal_type": snapshot.signal_type,
            "source": snapshot.source,
            "payload": snapshot.payload,
            "snapshot_time": snapshot.snapshot_time.isoformat() if snapshot.snapshot_time else None,
        }


def list_snapshots(
    opportunity_item_id: str,
    signal_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List demand signal snapshots for an item."""
    with SessionLocal() as session:
        query = session.query(DemandSignalSnapshotRecord).filter(
            DemandSignalSnapshotRecord.opportunity_item_id == opportunity_item_id
        )
        if signal_type:
            query = query.filter(DemandSignalSnapshotRecord.signal_type == signal_type)
        snapshots = query.order_by(DemandSignalSnapshotRecord.snapshot_time.desc()).offset(offset).limit(limit).all()
        return [
            {
                "id": s.id,
                "opportunity_item_id": s.opportunity_item_id,
                "signal_type": s.signal_type,
                "source": s.source,
                "payload": s.payload,
                "snapshot_time": s.snapshot_time.isoformat() if s.snapshot_time else None,
            }
            for s in snapshots
        ]


def get_snapshot(snapshot_id: str) -> dict[str, Any] | None:
    """Get a snapshot by ID."""
    with SessionLocal() as session:
        snapshot = session.query(DemandSignalSnapshotRecord).filter(
            DemandSignalSnapshotRecord.id == snapshot_id
        ).first()
        if snapshot is None:
            return None
        return {
            "id": snapshot.id,
            "opportunity_item_id": snapshot.opportunity_item_id,
            "signal_type": snapshot.signal_type,
            "source": snapshot.source,
            "payload": snapshot.payload,
            "snapshot_time": snapshot.snapshot_time.isoformat() if snapshot.snapshot_time else None,
        }
