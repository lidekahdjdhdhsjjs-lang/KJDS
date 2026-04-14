"""Services for OpportunityBatch operations."""

from datetime import UTC, datetime
from typing import Any

import app.repositories.batches as batch_repo
import app.repositories.opportunities as item_repo


def create_batch(
    store_id: str,
    trigger_type: str,
    trigger_payload: str | None = None,
    priority: int = 0,
) -> dict[str, Any]:
    """Create a new opportunity batch.

    Args:
        store_id: The store ID for this batch
        trigger_type: How the batch was triggered (manual, scheduled, signal)
        trigger_payload: Optional JSON payload with trigger details
        priority: Batch priority (higher = more important)

    Returns:
        The created batch
    """
    return batch_repo.create_batch(
        store_id=store_id,
        trigger_type=trigger_type,
        trigger_payload=trigger_payload,
        priority=priority,
    )


def get_batch(batch_id: str) -> dict[str, Any] | None:
    """Get a batch by ID."""
    return batch_repo.get_batch(batch_id)


def list_batches(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List batches with optional filters."""
    return batch_repo.list_batches(
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )


def start_batch(batch_id: str) -> dict[str, Any] | None:
    """Start a batch (transition from draft/queued to running).

    Validates that the batch exists and is in a startable state.
    """
    batch = batch_repo.get_batch(batch_id)
    if batch is None:
        return None
    if batch["status"] not in ("draft", "queued"):
        raise ValueError(f"Cannot start batch in status '{batch['status']}'")
    return batch_repo.start_batch(batch_id)


def pause_batch(batch_id: str) -> dict[str, Any] | None:
    """Pause a running batch."""
    batch = batch_repo.get_batch(batch_id)
    if batch is None:
        return None
    if batch["status"] != "running":
        raise ValueError(f"Cannot pause batch in status '{batch['status']}'")
    return batch_repo.pause_batch(batch_id)


def resume_batch(batch_id: str) -> dict[str, Any] | None:
    """Resume a paused batch."""
    batch = batch_repo.get_batch(batch_id)
    if batch is None:
        return None
    if batch["status"] != "paused":
        raise ValueError(f"Cannot resume batch in status '{batch['status']}'")
    return batch_repo.resume_batch(batch_id)


def complete_batch(batch_id: str, has_issues: bool = False) -> dict[str, Any] | None:
    """Mark batch as completed.

    Args:
        batch_id: The batch ID
        has_issues: If True, mark as completed_with_issues instead of completed
    """
    return batch_repo.complete_batch(batch_id, has_issues=has_issues)


def fail_batch(batch_id: str) -> dict[str, Any] | None:
    """Mark batch as failed."""
    return batch_repo.fail_batch(batch_id)


def archive_batch(batch_id: str) -> dict[str, Any] | None:
    """Archive a batch."""
    return batch_repo.archive_batch(batch_id)


def get_batch_status_summary(batch_id: str) -> dict[str, Any] | None:
    """Get batch with item status counts."""
    batch = batch_repo.get_batch(batch_id)
    if batch is None:
        return None
    status_counts = item_repo.count_items_by_status(batch_id)
    return {
        **batch,
        "status_counts": status_counts,
    }


def get_batch_statistics(batch_id: str) -> dict[str, Any]:
    """Get detailed statistics for a batch."""
    batch = batch_repo.get_batch(batch_id)
    if batch is None:
        return {}

    items = item_repo.list_items(batch_id=batch_id, limit=10000)
    total_items = len(items)

    if total_items == 0:
        return {
            "batch_id": batch_id,
            "total_items": 0,
            "stages": {},
            "progress_percentage": 0,
            "avg_score": 0,
            "avg_risk_level": 0,
        }

    # Count items per stage
    stage_counts: dict[str, int] = {}
    total_score = 0.0
    total_risk = 0

    for item in items:
        status = item.get("status", "unknown")
        stage_counts[status] = stage_counts.get(status, 0) + 1
        total_score += item.get("score_total", 0)
        total_risk += item.get("risk_level", 0)

    # Calculate progress (items in final stages / total)
    final_stages = ["published", "rejected", "archived", "blocked", "manual_required"]
    completed_items = sum(stage_counts.get(s, 0) for s in final_stages)
    progress_percentage = (completed_items / total_items) * 100 if total_items > 0 else 0

    # Stage grouping for UI
    stage_groups = {
        "discovery": ["discovered", "shortlisted", "sourcing_scored"],
        "processing": ["mapping_in_progress", "mapping_confirmed", "content_generating", "pricing_ready"],
        "review": ["review_passed", "preflight_passed"],
        "publishing": ["publish_queued", "publishing"],
        "completed": ["published", "rejected", "archived"],
        "issues": ["blocked", "manual_required"],
    }

    grouped_counts = {}
    for group, stages in stage_groups.items():
        grouped_counts[group] = sum(stage_counts.get(s, 0) for s in stages)

    return {
        "batch_id": batch_id,
        "total_items": total_items,
        "stages": stage_counts,
        "stage_groups": grouped_counts,
        "progress_percentage": round(progress_percentage, 1),
        "avg_score": round(total_score / total_items, 2) if total_items > 0 else 0,
        "avg_risk_level": round(total_risk / total_items, 2) if total_items > 0 else 0,
        "completed_items": completed_items,
        "pending_items": total_items - completed_items,
    }
