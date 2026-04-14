"""Repository for PublishResult operations."""

from typing import Any

from app.db import SessionLocal
from app.models import PublishResultRecord


def create_result(
    publish_task_id: str,
    result_type: str,
    platform_item_ref: str | None = None,
    detail_payload: str | None = None,
) -> dict[str, Any]:
    """Create a new publish result."""
    import uuid
    from datetime import datetime, UTC

    with SessionLocal() as session:
        result = PublishResultRecord(
            id=f"pr-{uuid.uuid4().hex[:16]}",
            publish_task_id=publish_task_id,
            platform_item_ref=platform_item_ref,
            result_type=result_type,
            detail_payload=detail_payload,
            created_at=datetime.now(UTC),
        )
        session.add(result)
        session.commit()
        session.refresh(result)
        return {
            "id": result.id,
            "publish_task_id": result.publish_task_id,
            "platform_item_ref": result.platform_item_ref,
            "result_type": result.result_type,
            "detail_payload": result.detail_payload,
            "created_at": result.created_at.isoformat(),
        }


def list_results(
    publish_task_id: str | None = None,
    result_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List publish results with optional filters."""
    with SessionLocal() as session:
        query = session.query(PublishResultRecord)
        if publish_task_id:
            query = query.filter(PublishResultRecord.publish_task_id == publish_task_id)
        if result_type:
            query = query.filter(PublishResultRecord.result_type == result_type)
        results = query.order_by(PublishResultRecord.created_at.desc()).offset(offset).limit(limit).all()
        return [
            {
                "id": r.id,
                "publish_task_id": r.publish_task_id,
                "platform_item_ref": r.platform_item_ref,
                "result_type": r.result_type,
                "detail_payload": r.detail_payload,
                "created_at": r.created_at.isoformat(),
            }
            for r in results
        ]


def get_result(result_id: str) -> dict[str, Any] | None:
    """Get a result by ID."""
    with SessionLocal() as session:
        result = session.query(PublishResultRecord).filter(
            PublishResultRecord.id == result_id
        ).first()
        if result is None:
            return None
        return {
            "id": result.id,
            "publish_task_id": result.publish_task_id,
            "platform_item_ref": result.platform_item_ref,
            "result_type": result.result_type,
            "detail_payload": result.detail_payload,
            "created_at": result.created_at.isoformat(),
        }
