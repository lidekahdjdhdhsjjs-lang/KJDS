"""Repository for PreflightCheck operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import PreflightCheckRecord


def generate_check_id() -> str:
    return f"preflight-{uuid4().hex}"


def serialize_check(record: PreflightCheckRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "opportunity_item_id": record.opportunity_item_id,
        "profit_check": record.profit_check,
        "compliance_check": record.compliance_check,
        "supply_check": record.supply_check,
        "account_health_check": record.account_health_check,
        "overall_result": record.overall_result,
        "detail_payload": record.detail_payload,
        "created_at": record.created_at.isoformat(),
    }


def create_check(
    opportunity_item_id: str,
    profit_check: str,
    compliance_check: str,
    supply_check: str,
    account_health_check: str,
    overall_result: str,
    detail_payload: str,
) -> dict[str, Any]:
    """Create a new preflight check."""
    with SessionLocal() as session:
        check = PreflightCheckRecord(
            id=generate_check_id(),
            opportunity_item_id=opportunity_item_id,
            profit_check=profit_check,
            compliance_check=compliance_check,
            supply_check=supply_check,
            account_health_check=account_health_check,
            overall_result=overall_result,
            detail_payload=detail_payload,
        )
        session.add(check)
        session.commit()
        session.refresh(check)
        return serialize_check(check)


def get_check(check_id: str) -> dict[str, Any] | None:
    """Get a check by ID."""
    with SessionLocal() as session:
        check = session.get(PreflightCheckRecord, check_id)
        if check is None:
            return None
        return serialize_check(check)


def get_latest_check(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest preflight check for an item."""
    with SessionLocal() as session:
        record = session.scalar(
            select(PreflightCheckRecord)
            .where(PreflightCheckRecord.opportunity_item_id == opportunity_item_id)
            .order_by(PreflightCheckRecord.created_at.desc())
            .limit(1)
        )
        if record is None:
            return None
        return serialize_check(record)


def list_checks(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List all preflight checks for an item."""
    with SessionLocal() as session:
        records = session.scalars(
            select(PreflightCheckRecord)
            .where(PreflightCheckRecord.opportunity_item_id == opportunity_item_id)
            .order_by(PreflightCheckRecord.created_at.desc())
        ).all()
        return [serialize_check(r) for r in records]


def is_passed(check_id: str) -> bool:
    """Check if a preflight check passed."""
    with SessionLocal() as session:
        check = session.get(PreflightCheckRecord, check_id)
        if check is None:
            return False
        return check.overall_result == "passed"
