"""Repository for SupplyCandidate operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import SupplyCandidateRecord


def generate_candidate_id() -> str:
    return f"supply-{uuid4().hex}"


def serialize_candidate(record: SupplyCandidateRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "source_platform": record.source_platform,
        "source_item_ref": record.source_item_ref,
        "supplier_ref": record.supplier_ref,
        "cost_amount": record.cost_amount,
        "moq": record.moq,
        "ship_from": record.ship_from,
        "reliability_score": record.reliability_score,
        "image_quality_score": record.image_quality_score,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
    }


def create_candidate(
    opportunity_item_id: str,
    source_platform: str,
    source_item_ref: str,
    cost_amount: float,
    supplier_ref: str | None = None,
    moq: int = 1,
    ship_from: str | None = None,
    reliability_score: float = 0.0,
    image_quality_score: float = 0.0,
) -> dict[str, Any]:
    """Create a new supply candidate."""
    with SessionLocal() as session:
        candidate = SupplyCandidateRecord(
            id=generate_candidate_id(),
            opportunity_item_id=opportunity_item_id,
            source_platform=source_platform,
            source_item_ref=source_item_ref,
            supplier_ref=supplier_ref,
            cost_amount=cost_amount,
            moq=moq,
            ship_from=ship_from,
            reliability_score=reliability_score,
            image_quality_score=image_quality_score,
            status="active",
        )
        session.add(candidate)
        session.commit()
        session.refresh(candidate)
        return serialize_candidate(candidate)


def get_candidate(candidate_id: str) -> dict[str, Any] | None:
    """Get a candidate by ID."""
    with SessionLocal() as session:
        candidate = session.get(SupplyCandidateRecord, candidate_id)
        if candidate is None:
            return None
        return serialize_candidate(candidate)


def list_candidates(
    opportunity_item_id: str,
    status: str | None = None,
) -> list[dict[str, Any]]:
    """List candidates for an opportunity item."""
    with SessionLocal() as session:
        query = select(SupplyCandidateRecord).where(
            SupplyCandidateRecord.opportunity_item_id == opportunity_item_id
        )
        if status:
            query = query.where(SupplyCandidateRecord.status == status)
        query = query.order_by(SupplyCandidateRecord.reliability_score.desc())
        records = session.scalars(query).all()
        return [serialize_candidate(r) for r in records]


def update_scores(
    candidate_id: str,
    reliability_score: float,
    image_quality_score: float,
) -> dict[str, Any] | None:
    """Update candidate scores."""
    with SessionLocal() as session:
        candidate = session.get(SupplyCandidateRecord, candidate_id)
        if candidate is None:
            return None
        candidate.reliability_score = reliability_score
        candidate.image_quality_score = image_quality_score
        session.commit()
        session.refresh(candidate)
        return serialize_candidate(candidate)


def update_status(candidate_id: str, status: str) -> dict[str, Any] | None:
    """Update candidate status."""
    with SessionLocal() as session:
        candidate = session.get(SupplyCandidateRecord, candidate_id)
        if candidate is None:
            return None
        candidate.status = status
        session.commit()
        session.refresh(candidate)
        return serialize_candidate(candidate)


def get_best_candidate(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the best scoring candidate for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(SupplyCandidateRecord)
            .where(SupplyCandidateRecord.opportunity_item_id == opportunity_item_id)
            .where(SupplyCandidateRecord.status == "active")
            .order_by(SupplyCandidateRecord.reliability_score.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_candidate(record)
