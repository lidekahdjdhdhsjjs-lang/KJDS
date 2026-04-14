"""Services for AgentRun operations."""

import json
from typing import Any

import app.repositories.agent_runs as repo


def create_run(
    agent_name: str,
    entity_type: str,
    entity_id: str,
    model_name: str | None = None,
    input_summary: str | None = None,
) -> dict[str, Any]:
    """Create a new agent run.

    Args:
        agent_name: Name of the agent (e.g., "sourcing", "mapping", "content")
        entity_type: Type of entity (e.g., "opportunity_item", "batch")
        entity_id: ID of the entity being processed
        model_name: AI model used
        input_summary: Summary of input to the agent

    Returns:
        The created run
    """
    return repo.create_run(
        agent_name=agent_name,
        model_name=model_name,
        entity_type=entity_type,
        entity_id=entity_id,
        input_summary=input_summary,
    )


def get_run(run_id: str) -> dict[str, Any] | None:
    """Get a run by ID."""
    return repo.get_run(run_id)


def list_runs(
    agent_name: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List runs with optional filters."""
    return repo.list_runs(
        agent_name=agent_name,
        entity_type=entity_type,
        entity_id=entity_id,
        status=status,
        limit=limit,
        offset=offset,
    )


def complete_run(
    run_id: str,
    output_summary: str | None = None,
    evidence: dict[str, Any] | None = None,
    cost: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Mark a run as completed.

    Args:
        run_id: The run ID
        output_summary: Summary of agent output
        evidence: Evidence/proof of agent decisions
        cost: Cost information (tokens, API calls, etc.)

    Returns:
        The completed run
    """
    return repo.complete_run(
        run_id,
        output_summary=output_summary,
        evidence_payload=json.dumps(evidence) if evidence else None,
        cost_payload=json.dumps(cost) if cost else None,
    )


def fail_run(run_id: str, output_summary: str | None = None) -> dict[str, Any] | None:
    """Mark a run as failed."""
    return repo.fail_run(run_id, output_summary=output_summary)


def get_runs_for_entity(entity_type: str, entity_id: str) -> list[dict[str, Any]]:
    """Get all runs for an entity."""
    return repo.get_runs_for_entity(entity_type, entity_id)


def parse_run_payload(run: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payloads in run to Python objects."""
    result = run.copy()
    if run.get("evidence_payload"):
        result["evidence"] = json.loads(run["evidence_payload"])
    if run.get("cost_payload"):
        result["cost"] = json.loads(run["cost_payload"])
    return result


# Agent name constants for consistency
AGENT_SOURCING = "sourcing"
AGENT_MAPPING = "mapping"
AGENT_CONTENT = "content"
AGENT_PRICING = "pricing"
AGENT_PREFLIGHT = "preflight"
AGENT_PUBLISH = "publish"
