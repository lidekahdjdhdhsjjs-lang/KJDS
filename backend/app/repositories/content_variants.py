"""Repository for ContentVariant operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import ContentVariantRecord


def generate_variant_id() -> str:
    return f"content-{uuid4().hex}"


def serialize_variant(record: ContentVariantRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "title": record.title,
        "bullet_points": record.bullet_points,
        "image_bundle_ref": record.image_bundle_ref,
        "template_ref": record.template_ref,
        "locale": record.locale,
        "version_no": record.version_no,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
    }


def create_variant(
    opportunity_item_id: str,
    title: str,
    bullet_points: str | None = None,
    image_bundle_ref: str | None = None,
    template_ref: str | None = None,
    locale: str = "vi",
) -> dict[str, Any]:
    """Create a new content variant."""
    with SessionLocal() as session:
        # Get next version number
        latest = session.scalar(
            select(ContentVariantRecord)
            .where(ContentVariantRecord.opportunity_item_id == opportunity_item_id)
            .order_by(ContentVariantRecord.version_no.desc())
            .limit(1)
        )
        version_no = (latest.version_no + 1) if latest else 1

        variant = ContentVariantRecord(
            id=generate_variant_id(),
            opportunity_item_id=opportunity_item_id,
            title=title,
            bullet_points=bullet_points,
            image_bundle_ref=image_bundle_ref,
            template_ref=template_ref,
            locale=locale,
            version_no=version_no,
            status="draft",
        )
        session.add(variant)
        session.commit()
        session.refresh(variant)
        return serialize_variant(variant)


def get_variant(variant_id: str) -> dict[str, Any] | None:
    """Get a variant by ID."""
    with SessionLocal() as session:
        variant = session.get(ContentVariantRecord, variant_id)
        if variant is None:
            return None
        return serialize_variant(variant)


def list_variants(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List variants for an opportunity item."""
    with SessionLocal() as session:
        records = session.scalars(
            select(ContentVariantRecord)
            .where(ContentVariantRecord.opportunity_item_id == opportunity_item_id)
            .order_by(ContentVariantRecord.version_no.desc())
        ).all()
        return [serialize_variant(r) for r in records]


def approve_variant(variant_id: str) -> dict[str, Any] | None:
    """Approve a variant."""
    with SessionLocal() as session:
        variant = session.get(ContentVariantRecord, variant_id)
        if variant is None:
            return None
        variant.status = "approved"
        session.commit()
        session.refresh(variant)
        return serialize_variant(variant)


def reject_variant(variant_id: str) -> dict[str, Any] | None:
    """Reject a variant."""
    with SessionLocal() as session:
        variant = session.get(ContentVariantRecord, variant_id)
        if variant is None:
            return None
        variant.status = "rejected"
        session.commit()
        session.refresh(variant)
        return serialize_variant(variant)


def get_latest_approved_variant(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest approved variant for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(ContentVariantRecord)
            .where(ContentVariantRecord.opportunity_item_id == opportunity_item_id)
            .where(ContentVariantRecord.status == "approved")
            .order_by(ContentVariantRecord.version_no.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_variant(record)
