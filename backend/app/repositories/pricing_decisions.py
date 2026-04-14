"""Repository for PricingDecision operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import PricingDecisionRecord


def generate_decision_id() -> str:
    return f"pricing-{uuid4().hex}"


def serialize_decision(record: PricingDecisionRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "cost_payload": record.cost_payload,
        "fee_payload": record.fee_payload,
        "exchange_rate_payload": record.exchange_rate_payload,
        "competitor_band_payload": record.competitor_band_payload,
        "suggested_price": record.suggested_price,
        "final_price": record.final_price,
        "min_profit_line": record.min_profit_line,
        "decision_reason": record.decision_reason,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
    }


def create_decision(
    opportunity_item_id: str,
    cost_payload: str,
    fee_payload: str,
    exchange_rate_payload: str,
    suggested_price: float,
    min_profit_line: float,
    competitor_band_payload: str | None = None,
    decision_reason: str | None = None,
) -> dict[str, Any]:
    """Create a new pricing decision."""
    with SessionLocal() as session:
        decision = PricingDecisionRecord(
            id=generate_decision_id(),
            opportunity_item_id=opportunity_item_id,
            cost_payload=cost_payload,
            fee_payload=fee_payload,
            exchange_rate_payload=exchange_rate_payload,
            competitor_band_payload=competitor_band_payload,
            suggested_price=suggested_price,
            final_price=None,
            min_profit_line=min_profit_line,
            decision_reason=decision_reason,
            status="proposed",
        )
        session.add(decision)
        session.commit()
        session.refresh(decision)
        return serialize_decision(decision)


def get_decision(decision_id: str) -> dict[str, Any] | None:
    """Get a decision by ID."""
    with SessionLocal() as session:
        decision = session.get(PricingDecisionRecord, decision_id)
        if decision is None:
            return None
        return serialize_decision(decision)


def list_decisions(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List decisions for an opportunity item."""
    with SessionLocal() as session:
        records = session.scalars(
            select(PricingDecisionRecord)
            .where(PricingDecisionRecord.opportunity_item_id == opportunity_item_id)
            .order_by(PricingDecisionRecord.created_at.desc())
        ).all()
        return [serialize_decision(r) for r in records]


def approve_decision(decision_id: str, final_price: float | None = None) -> dict[str, Any] | None:
    """Approve a decision."""
    with SessionLocal() as session:
        decision = session.get(PricingDecisionRecord, decision_id)
        if decision is None:
            return None
        decision.status = "approved"
        if final_price is not None:
            decision.final_price = final_price
        else:
            decision.final_price = decision.suggested_price
        session.commit()
        session.refresh(decision)
        return serialize_decision(decision)


def reject_decision(decision_id: str) -> dict[str, Any] | None:
    """Reject a decision."""
    with SessionLocal() as session:
        decision = session.get(PricingDecisionRecord, decision_id)
        if decision is None:
            return None
        decision.status = "rejected"
        session.commit()
        session.refresh(decision)
        return serialize_decision(decision)


def invalidate_decision(decision_id: str, reason: str) -> dict[str, Any] | None:
    """Invalidate a decision (e.g., when cost changes)."""
    with SessionLocal() as session:
        decision = session.get(PricingDecisionRecord, decision_id)
        if decision is None:
            return None
        decision.status = "invalidated"
        decision.decision_reason = f"Invalidated: {reason}"
        session.commit()
        session.refresh(decision)
        return serialize_decision(decision)


def get_latest_approved_decision(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest approved decision for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(PricingDecisionRecord)
            .where(PricingDecisionRecord.opportunity_item_id == opportunity_item_id)
            .where(PricingDecisionRecord.status == "approved")
            .order_by(PricingDecisionRecord.created_at.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_decision(record)


def check_profit_line(decision_id: str) -> bool:
    """Check if the decision meets the minimum profit line."""
    with SessionLocal() as session:
        decision = session.get(PricingDecisionRecord, decision_id)
        if decision is None:
            return False
        price = decision.final_price or decision.suggested_price
        return price >= decision.min_profit_line
