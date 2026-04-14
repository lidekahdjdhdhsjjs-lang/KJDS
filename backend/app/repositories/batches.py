"""Repository for OpportunityBatch operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import OpportunityBatchRecord


def generate_batch_id() -> str:
    return f"batch-{uuid4().hex}"


def serialize_batch(record: OpportunityBatchRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "store_id": record.store_id,
        "trigger_type": record.trigger_type,
        "trigger_payload": record.trigger_payload,
        "status": record.status,
        "priority": record.priority,
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def create_batch(
    store_id: str,
    trigger_type: str,
    trigger_payload: str | None = None,
    priority: int = 0,
) -> dict[str, Any]:
    """Create a new opportunity batch."""
    with SessionLocal() as session:
        batch = OpportunityBatchRecord(
            id=generate_batch_id(),
            store_id=store_id,
            trigger_type=trigger_type,
            trigger_payload=trigger_payload,
            status="draft",
            priority=priority,
        )
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return serialize_batch(batch)


def get_batch(batch_id: str) -> dict[str, Any] | None:
    """Get a batch by ID."""
    with SessionLocal() as session:
        batch = session.get(OpportunityBatchRecord, batch_id)
        if batch is None:
            return None
        return serialize_batch(batch)


def list_batches(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List batches with optional filters."""
    with SessionLocal() as session:
        query = select(OpportunityBatchRecord).order_by(OpportunityBatchRecord.created_at.desc())
        if store_id:
            query = query.where(OpportunityBatchRecord.store_id == store_id)
        if status:
            query = query.where(OpportunityBatchRecord.status == status)
        query = query.limit(limit).offset(offset)
        records = session.scalars(query).all()
        return [serialize_batch(r) for r in records]


def update_batch_status(
    batch_id: str,
    status: str,
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
) -> dict[str, Any] | None:
    """Update batch status."""
    with SessionLocal() as session:
        batch = session.get(OpportunityBatchRecord, batch_id)
        if batch is None:
            return None
        batch.status = status
        if started_at is not None:
            batch.started_at = started_at
        if completed_at is not None:
            batch.completed_at = completed_at
        session.commit()
        session.refresh(batch)
        return serialize_batch(batch)


def start_batch(batch_id: str) -> dict[str, Any] | None:
    """Start a batch (transition from draft/queued to running)."""
    return update_batch_status(batch_id, "running", started_at=datetime.now(UTC))


def pause_batch(batch_id: str) -> dict[str, Any] | None:
    """Pause a running batch."""
    return update_batch_status(batch_id, "paused")


def resume_batch(batch_id: str) -> dict[str, Any] | None:
    """Resume a paused batch."""
    return update_batch_status(batch_id, "running")


def complete_batch(batch_id: str, has_issues: bool = False) -> dict[str, Any] | None:
    """Mark batch as completed."""
    status = "completed_with_issues" if has_issues else "completed"
    return update_batch_status(batch_id, status, completed_at=datetime.now(UTC))


def fail_batch(batch_id: str) -> dict[str, Any] | None:
    """Mark batch as failed."""
    return update_batch_status(batch_id, "failed", completed_at=datetime.now(UTC))


def archive_batch(batch_id: str) -> dict[str, Any] | None:
    """Archive a batch."""
    return update_batch_status(batch_id, "archived")
