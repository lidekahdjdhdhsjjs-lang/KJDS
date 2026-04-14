"""Repository for AgentRun operations."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.db import SessionLocal
from app.models import AgentRunRecord


def generate_run_id() -> str:
    return f"run-{uuid4().hex}"


def serialize_run(record: AgentRunRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "agent_name": record.agent_name,
        "model_name": record.model_name,
        "entity_type": record.entity_type,
        "entity_id": record.entity_id,
        "input_summary": record.input_summary,
        "output_summary": record.output_summary,
        "evidence_payload": record.evidence_payload,
        "cost_payload": record.cost_payload,
        "status": record.status,
        "started_at": record.started_at.isoformat(),
        "ended_at": record.ended_at.isoformat() if record.ended_at else None,
    }


def create_run(
    agent_name: str,
    entity_type: str,
    entity_id: str,
    model_name: str | None = None,
    input_summary: str | None = None,
) -> dict[str, Any]:
    """Create a new agent run."""
    with SessionLocal() as session:
        run = AgentRunRecord(
            id=generate_run_id(),
            agent_name=agent_name,
            model_name=model_name,
            entity_type=entity_type,
            entity_id=entity_id,
            input_summary=input_summary,
            status="running",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        return serialize_run(run)


def get_run(run_id: str) -> dict[str, Any] | None:
    """Get a run by ID."""
    with SessionLocal() as session:
        run = session.get(AgentRunRecord, run_id)
        if run is None:
            return None
        return serialize_run(run)


def list_runs(
    agent_name: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List runs with optional filters."""
    with SessionLocal() as session:
        query = select(AgentRunRecord).order_by(AgentRunRecord.started_at.desc())
        if agent_name:
            query = query.where(AgentRunRecord.agent_name == agent_name)
        if entity_type:
            query = query.where(AgentRunRecord.entity_type == entity_type)
        if entity_id:
            query = query.where(AgentRunRecord.entity_id == entity_id)
        if status:
            query = query.where(AgentRunRecord.status == status)
        query = query.limit(limit).offset(offset)
        records = session.scalars(query).all()
        return [serialize_run(r) for r in records]


def complete_run(
    run_id: str,
    output_summary: str | None = None,
    evidence_payload: str | None = None,
    cost_payload: str | None = None,
) -> dict[str, Any] | None:
    """Mark a run as completed."""
    with SessionLocal() as session:
        run = session.get(AgentRunRecord, run_id)
        if run is None:
            return None
        run.status = "completed"
        run.output_summary = output_summary
        run.evidence_payload = evidence_payload
        run.cost_payload = cost_payload
        run.ended_at = datetime.now(UTC)
        session.commit()
        session.refresh(run)
        return serialize_run(run)


def fail_run(run_id: str, output_summary: str | None = None) -> dict[str, Any] | None:
    """Mark a run as failed."""
    with SessionLocal() as session:
        run = session.get(AgentRunRecord, run_id)
        if run is None:
            return None
        run.status = "failed"
        run.output_summary = output_summary
        run.ended_at = datetime.now(UTC)
        session.commit()
        session.refresh(run)
        return serialize_run(run)


def get_runs_for_entity(entity_type: str, entity_id: str) -> list[dict[str, Any]]:
    """Get all runs for an entity."""
    return list_runs(entity_type=entity_type, entity_id=entity_id)
