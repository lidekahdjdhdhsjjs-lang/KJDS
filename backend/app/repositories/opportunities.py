"""Repository for OpportunityItem operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import OpportunityItemRecord


def generate_item_id() -> str:
    return f"item-{uuid4().hex}"


def serialize_item(record: OpportunityItemRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "batch_id": record.batch_id,
        "store_id": record.store_id,
        "status": record.status,
        "risk_level": record.risk_level,
        "score_total": record.score_total,
        "current_supply_candidate_id": record.current_supply_candidate_id,
        "current_mapping_id": record.current_mapping_id,
        "current_content_variant_id": record.current_content_variant_id,
        "current_pricing_decision_id": record.current_pricing_decision_id,
        "preflight_status": record.preflight_status,
        "publish_idempotency_key": record.publish_idempotency_key,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def create_item(
    batch_id: str,
    store_id: str,
    risk_level: int = 0,
    score_total: float = 0.0,
) -> dict[str, Any]:
    """Create a new opportunity item."""
    with SessionLocal() as session:
        item = OpportunityItemRecord(
            id=generate_item_id(),
            batch_id=batch_id,
            store_id=store_id,
            status="discovered",
            risk_level=risk_level,
            score_total=score_total,
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def get_item(item_id: str) -> dict[str, Any] | None:
    """Get an item by ID."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        return serialize_item(item)


def list_items(
    batch_id: str | None = None,
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List items with optional filters."""
    with SessionLocal() as session:
        query = select(OpportunityItemRecord).order_by(OpportunityItemRecord.created_at.desc())
        if batch_id:
            query = query.where(OpportunityItemRecord.batch_id == batch_id)
        if store_id:
            query = query.where(OpportunityItemRecord.store_id == store_id)
        if status:
            query = query.where(OpportunityItemRecord.status == status)
        query = query.limit(limit).offset(offset)
        records = session.scalars(query).all()
        return [serialize_item(r) for r in records]


def update_item_status(item_id: str, status: str) -> dict[str, Any] | None:
    """Update item status."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.status = status
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def update_item_score(item_id: str, score_total: float) -> dict[str, Any] | None:
    """Update item total score."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.score_total = score_total
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def update_item_risk(item_id: str, risk_level: int) -> dict[str, Any] | None:
    """Update item risk level."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.risk_level = risk_level
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_current_supply_candidate(item_id: str, candidate_id: str) -> dict[str, Any] | None:
    """Set the current supply candidate for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.current_supply_candidate_id = candidate_id
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_current_mapping(item_id: str, mapping_id: str) -> dict[str, Any] | None:
    """Set the current category mapping for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.current_mapping_id = mapping_id
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_current_content_variant(item_id: str, variant_id: str) -> dict[str, Any] | None:
    """Set the current content variant for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.current_content_variant_id = variant_id
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_current_pricing_decision(item_id: str, decision_id: str) -> dict[str, Any] | None:
    """Set the current pricing decision for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.current_pricing_decision_id = decision_id
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_preflight_status(item_id: str, status: str) -> dict[str, Any] | None:
    """Set the preflight status for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.preflight_status = status
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def set_publish_idempotency_key(item_id: str, key: str) -> dict[str, Any] | None:
    """Set the publish idempotency key for an item."""
    with SessionLocal() as session:
        item = session.get(OpportunityItemRecord, item_id)
        if item is None:
            return None
        item.publish_idempotency_key = key
        session.commit()
        session.refresh(item)
        return serialize_item(item)


def count_items_by_status(batch_id: str) -> dict[str, int]:
    """Count items by status in a batch."""
    with SessionLocal() as session:
        records = session.scalars(
            select(OpportunityItemRecord).where(OpportunityItemRecord.batch_id == batch_id)
        ).all()
        counts: dict[str, int] = {}
        for record in records:
            counts[record.status] = counts.get(record.status, 0) + 1
        return counts


def bulk_update_status(item_ids: list[str], status: str) -> list[dict[str, Any]]:
    """Bulk update status for multiple items."""
    with SessionLocal() as session:
        items = []
        for item_id in item_ids:
            item = session.get(OpportunityItemRecord, item_id)
            if item is not None:
                item.status = status
                items.append(item)
        session.commit()
        return [serialize_item(i) for i in items]


def bulk_update_risk(item_ids: list[str], risk_level: int) -> list[dict[str, Any]]:
    """Bulk update risk level for multiple items."""
    with SessionLocal() as session:
        items = []
        for item_id in item_ids:
            item = session.get(OpportunityItemRecord, item_id)
            if item is not None:
                item.risk_level = risk_level
                items.append(item)
        session.commit()
        return [serialize_item(i) for i in items]


def bulk_create_items(
    batch_id: str,
    store_id: str,
    items_data: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Bulk create multiple items in a batch."""
    with SessionLocal() as session:
        items = []
        for data in items_data:
            item = OpportunityItemRecord(
                id=generate_item_id(),
                batch_id=batch_id,
                store_id=store_id,
                status="discovered",
                risk_level=data.get("risk_level", 0),
                score_total=data.get("score_total", 0.0),
            )
            session.add(item)
            items.append(item)
        session.commit()
        return [serialize_item(i) for i in items]
