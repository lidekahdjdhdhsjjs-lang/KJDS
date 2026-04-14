"""Repository for ProcurementDraft operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import ProcurementDraftRecord


def generate_draft_id() -> str:
    return f"proc-{uuid4().hex}"


def serialize_draft(record: ProcurementDraftRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "supplier_ref": record.supplier_ref,
        "sku_payload": record.sku_payload,
        "qty": record.qty,
        "purchase_price": record.purchase_price,
        "status": record.status,
        "invalid_reason": record.invalid_reason,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def create_draft(
    opportunity_item_id: str,
    supplier_ref: str,
    purchase_price: float,
    sku_payload: str | None = None,
    qty: int = 1,
) -> dict[str, Any]:
    """Create a new procurement draft."""
    with SessionLocal() as session:
        draft = ProcurementDraftRecord(
            id=generate_draft_id(),
            opportunity_item_id=opportunity_item_id,
            supplier_ref=supplier_ref,
            sku_payload=sku_payload,
            qty=qty,
            purchase_price=purchase_price,
            status="draft",
        )
        session.add(draft)
        session.commit()
        session.refresh(draft)
        return serialize_draft(draft)


def get_draft(draft_id: str) -> dict[str, Any] | None:
    """Get a draft by ID."""
    with SessionLocal() as session:
        draft = session.get(ProcurementDraftRecord, draft_id)
        if draft is None:
            return None
        return serialize_draft(draft)


def list_drafts(
    opportunity_item_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List drafts with optional filters."""
    with SessionLocal() as session:
        query = select(ProcurementDraftRecord).order_by(ProcurementDraftRecord.created_at.desc())
        if opportunity_item_id:
            query = query.where(ProcurementDraftRecord.opportunity_item_id == opportunity_item_id)
        if status:
            query = query.where(ProcurementDraftRecord.status == status)
        query = query.limit(limit).offset(offset)
        records = session.scalars(query).all()
        return [serialize_draft(r) for r in records]


def update_status(draft_id: str, status: str, invalid_reason: str | None = None) -> dict[str, Any] | None:
    """Update draft status."""
    with SessionLocal() as session:
        draft = session.get(ProcurementDraftRecord, draft_id)
        if draft is None:
            return None
        draft.status = status
        if invalid_reason:
            draft.invalid_reason = invalid_reason
        session.commit()
        session.refresh(draft)
        return serialize_draft(draft)


def submit_for_confirmation(draft_id: str) -> dict[str, Any] | None:
    """Submit draft for confirmation."""
    return update_status(draft_id, "awaiting_confirmation")


def confirm_draft(draft_id: str) -> dict[str, Any] | None:
    """Confirm a draft."""
    return update_status(draft_id, "confirmed")


def invalidate_draft(draft_id: str, reason: str) -> dict[str, Any] | None:
    """Invalidate a draft."""
    return update_status(draft_id, "invalidated", reason)


def cancel_draft(draft_id: str) -> dict[str, Any] | None:
    """Cancel a draft."""
    return update_status(draft_id, "cancelled")


def get_latest_draft(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest draft for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(ProcurementDraftRecord)
            .where(ProcurementDraftRecord.opportunity_item_id == opportunity_item_id)
            .where(ProcurementDraftRecord.status.in_(["draft", "awaiting_confirmation"]))
            .order_by(ProcurementDraftRecord.created_at.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_draft(record)
