"""Repository for CategoryMapping operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import CategoryMappingRecord


def generate_mapping_id() -> str:
    return f"mapping-{uuid4().hex}"


def serialize_mapping(record: CategoryMappingRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "category_ref": record.category_ref,
        "attributes_payload": record.attributes_payload,
        "variation_payload": record.variation_payload,
        "confidence_score": record.confidence_score,
        "evidence_payload": record.evidence_payload,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
    }


def create_mapping(
    opportunity_item_id: str,
    category_ref: str,
    attributes_payload: str,
    confidence_score: float = 0.0,
    variation_payload: str | None = None,
    evidence_payload: str | None = None,
) -> dict[str, Any]:
    """Create a new category mapping."""
    with SessionLocal() as session:
        mapping = CategoryMappingRecord(
            id=generate_mapping_id(),
            opportunity_item_id=opportunity_item_id,
            category_ref=category_ref,
            attributes_payload=attributes_payload,
            variation_payload=variation_payload,
            confidence_score=confidence_score,
            evidence_payload=evidence_payload,
            status="proposed",
        )
        session.add(mapping)
        session.commit()
        session.refresh(mapping)
        return serialize_mapping(mapping)


def get_mapping(mapping_id: str) -> dict[str, Any] | None:
    """Get a mapping by ID."""
    with SessionLocal() as session:
        mapping = session.get(CategoryMappingRecord, mapping_id)
        if mapping is None:
            return None
        return serialize_mapping(mapping)


def list_mappings(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List mappings for an opportunity item."""
    with SessionLocal() as session:
        records = session.scalars(
            select(CategoryMappingRecord)
            .where(CategoryMappingRecord.opportunity_item_id == opportunity_item_id)
            .order_by(CategoryMappingRecord.confidence_score.desc())
        ).all()
        return [serialize_mapping(r) for r in records]


def confirm_mapping(mapping_id: str) -> dict[str, Any] | None:
    """Confirm a mapping."""
    with SessionLocal() as session:
        mapping = session.get(CategoryMappingRecord, mapping_id)
        if mapping is None:
            return None
        mapping.status = "confirmed"
        session.commit()
        session.refresh(mapping)
        return serialize_mapping(mapping)


def reject_mapping(mapping_id: str) -> dict[str, Any] | None:
    """Reject a mapping."""
    with SessionLocal() as session:
        mapping = session.get(CategoryMappingRecord, mapping_id)
        if mapping is None:
            return None
        mapping.status = "rejected"
        session.commit()
        session.refresh(mapping)
        return serialize_mapping(mapping)


def get_latest_confirmed_mapping(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest confirmed mapping for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(CategoryMappingRecord)
            .where(CategoryMappingRecord.opportunity_item_id == opportunity_item_id)
            .where(CategoryMappingRecord.status == "confirmed")
            .order_by(CategoryMappingRecord.created_at.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_mapping(record)
