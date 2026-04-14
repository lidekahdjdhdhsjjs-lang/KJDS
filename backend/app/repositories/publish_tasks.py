"""Repository for PublishTask and PublishResult operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import PublishResultRecord, PublishTaskRecord


def generate_task_id() -> str:
    return f"task-{uuid4().hex}"


def generate_result_id() -> str:
    return f"result-{uuid4().hex}"


def serialize_task(record: PublishTaskRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "store_id": record.store_id,
        "status": record.status,
        "channel": record.channel,
        "idempotency_key": record.idempotency_key,
        "request_payload": record.request_payload,
        "response_payload": record.response_payload,
        "retry_count": record.retry_count,
        "last_error": record.last_error,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def serialize_result(record: PublishResultRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "publish_task_id": record.publish_task_id,
        "platform_item_ref": record.platform_item_ref,
        "result_type": record.result_type,
        "detail_payload": record.detail_payload,
        "created_at": record.created_at.isoformat(),
    }


def create_task(
    opportunity_item_id: str,
    store_id: str,
    idempotency_key: str,
    request_payload: str | None = None,
    channel: str = "api",
) -> dict[str, Any]:
    """Create a new publish task."""
    with SessionLocal() as session:
        task = PublishTaskRecord(
            id=generate_task_id(),
            opportunity_item_id=opportunity_item_id,
            store_id=store_id,
            status="pending",
            channel=channel,
            idempotency_key=idempotency_key,
            request_payload=request_payload,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return serialize_task(task)


def get_task(task_id: str) -> dict[str, Any] | None:
    """Get a task by ID."""
    with SessionLocal() as session:
        task = session.get(PublishTaskRecord, task_id)
        if task is None:
            return None
        return serialize_task(task)


def get_task_by_idempotency_key(idempotency_key: str) -> dict[str, Any] | None:
    """Get a task by idempotency key."""
    with SessionLocal() as session:
        task = session.scalar(
            select(PublishTaskRecord).where(PublishTaskRecord.idempotency_key == idempotency_key)
        )
        if task is None:
            return None
        return serialize_task(task)


def list_tasks(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List tasks with optional filters."""
    with SessionLocal() as session:
        query = select(PublishTaskRecord).order_by(PublishTaskRecord.created_at.desc())
        if store_id:
            query = query.where(PublishTaskRecord.store_id == store_id)
        if status:
            query = query.where(PublishTaskRecord.status == status)
        query = query.limit(limit).offset(offset)
        records = session.scalars(query).all()
        return [serialize_task(r) for r in records]


def update_task_status(task_id: str, status: str, last_error: str | None = None) -> dict[str, Any] | None:
    """Update task status."""
    with SessionLocal() as session:
        task = session.get(PublishTaskRecord, task_id)
        if task is None:
            return None
        task.status = status
        if last_error:
            task.last_error = last_error
        session.commit()
        session.refresh(task)
        return serialize_task(task)


def increment_retry(task_id: str) -> dict[str, Any] | None:
    """Increment retry count."""
    with SessionLocal() as session:
        task = session.get(PublishTaskRecord, task_id)
        if task is None:
            return None
        task.retry_count += 1
        session.commit()
        session.refresh(task)
        return serialize_task(task)


def set_task_running(task_id: str) -> dict[str, Any] | None:
    """Mark task as running."""
    return update_task_status(task_id, "running")


def set_task_succeeded(task_id: str, response_payload: str | None = None) -> dict[str, Any] | None:
    """Mark task as succeeded."""
    with SessionLocal() as session:
        task = session.get(PublishTaskRecord, task_id)
        if task is None:
            return None
        task.status = "succeeded"
        if response_payload:
            task.response_payload = response_payload
        session.commit()
        session.refresh(task)
        return serialize_task(task)


def set_task_failed_retryable(task_id: str, error: str) -> dict[str, Any] | None:
    """Mark task as failed (retryable)."""
    return update_task_status(task_id, "failed_retryable", error)


def set_task_failed_terminal(task_id: str, error: str) -> dict[str, Any] | None:
    """Mark task as failed (terminal)."""
    return update_task_status(task_id, "failed_terminal", error)


# Publish Results


def create_result(
    publish_task_id: str,
    result_type: str,
    platform_item_ref: str | None = None,
    detail_payload: str | None = None,
) -> dict[str, Any]:
    """Create a new publish result."""
    with SessionLocal() as session:
        result = PublishResultRecord(
            id=generate_result_id(),
            publish_task_id=publish_task_id,
            platform_item_ref=platform_item_ref,
            result_type=result_type,
            detail_payload=detail_payload,
        )
        session.add(result)
        session.commit()
        session.refresh(result)
        return serialize_result(result)


def get_results_for_task(publish_task_id: str) -> list[dict[str, Any]]:
    """Get all results for a task."""
    with SessionLocal() as session:
        records = session.scalars(
            select(PublishResultRecord)
            .where(PublishResultRecord.publish_task_id == publish_task_id)
            .order_by(PublishResultRecord.created_at.asc())
        ).all()
        return [serialize_result(r) for r in records]
