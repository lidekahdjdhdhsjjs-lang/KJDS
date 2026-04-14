"""Services for PublishTask operations."""

import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import app.repositories.publish_tasks as repo
import app.repositories.opportunities as item_repo


def generate_idempotency_key() -> str:
    """Generate a unique idempotency key for publish tasks."""
    return f"pub-{uuid4().hex}"


def create_task(
    opportunity_item_id: str,
    store_id: str,
    request_data: dict[str, Any] | None = None,
    channel: str = "api",
) -> dict[str, Any]:
    """Create a new publish task.

    Args:
        opportunity_item_id: The item to publish
        store_id: The store to publish to
        request_data: The payload to send to Shopee
        channel: "api" or "manual"

    Returns:
        The created task
    """
    idempotency_key = generate_idempotency_key()
    return repo.create_task(
        opportunity_item_id=opportunity_item_id,
        store_id=store_id,
        idempotency_key=idempotency_key,
        request_payload=json.dumps(request_data) if request_data else None,
        channel=channel,
    )


def get_task(task_id: str) -> dict[str, Any] | None:
    """Get a task by ID."""
    return repo.get_task(task_id)


def get_task_by_idempotency_key(idempotency_key: str) -> dict[str, Any] | None:
    """Get a task by idempotency key."""
    return repo.get_task_by_idempotency_key(idempotency_key)


def list_tasks(
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List tasks with optional filters."""
    return repo.list_tasks(
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )


def start_task(task_id: str) -> dict[str, Any] | None:
    """Mark task as running."""
    return repo.set_task_running(task_id)


def complete_task(
    task_id: str,
    platform_item_ref: str | None = None,
    response_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Mark task as succeeded and create result.

    Args:
        task_id: The task ID
        platform_item_ref: Shopee item ID (if successful)
        response_data: Response from Shopee

    Returns:
        The updated task
    """
    task = repo.set_task_succeeded(
        task_id,
        response_payload=json.dumps(response_data) if response_data else None,
    )
    if task is None:
        raise ValueError(f"Task {task_id} not found")

    # Create result record
    result_type = "success" if platform_item_ref else "warning"
    repo.create_result(
        publish_task_id=task_id,
        result_type=result_type,
        platform_item_ref=platform_item_ref,
        detail_payload=json.dumps(response_data) if response_data else None,
    )

    return task


def fail_task_retryable(task_id: str, error: str) -> dict[str, Any] | None:
    """Mark task as failed (retryable)."""
    repo.increment_retry(task_id)
    return repo.set_task_failed_retryable(task_id, error)


def fail_task_terminal(task_id: str, error: str) -> dict[str, Any] | None:
    """Mark task as failed (terminal)."""
    return repo.set_task_failed_terminal(task_id, error)


def retry_task(task_id: str) -> dict[str, Any] | None:
    """Retry a failed task.

    Only retryable tasks can be retried.
    """
    task = repo.get_task(task_id)
    if task is None:
        return None
    if task["status"] != "failed_retryable":
        raise ValueError(f"Cannot retry task in status '{task['status']}'")

    return repo.update_task_status(task_id, "pending")


def get_results_for_task(publish_task_id: str) -> list[dict[str, Any]]:
    """Get all results for a task."""
    return repo.get_results_for_task(publish_task_id)


def parse_task_payload(task: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payloads in task to Python objects."""
    result = task.copy()
    if task.get("request_payload"):
        result["request"] = json.loads(task["request_payload"])
    if task.get("response_payload"):
        result["response"] = json.loads(task["response_payload"])
    return result


def can_publish(opportunity_item_id: str) -> bool:
    """Check if an item can be published (preflight passed)."""
    item = item_repo.get_item(opportunity_item_id)
    if item is None:
        return False
    return item.get("preflight_status") == "passed"
