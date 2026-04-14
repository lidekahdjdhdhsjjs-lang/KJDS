"""Services for OpportunityItem operations."""

from typing import Any

import app.repositories.opportunities as item_repo
import app.repositories.supply_candidates as supply_repo
import app.repositories.category_mappings as mapping_repo
import app.repositories.content_variants as content_repo
import app.repositories.pricing_decisions as pricing_repo
import app.repositories.preflight_checks as preflight_repo


# Valid status transitions for opportunity items
VALID_TRANSITIONS = {
    "discovered": ["shortlisted", "rejected"],
    "shortlisted": ["sourcing_scored", "rejected"],
    "sourcing_scored": ["mapping_in_progress", "rejected"],
    "mapping_in_progress": ["mapping_confirmed", "rejected"],
    "mapping_confirmed": ["content_generating", "rejected"],
    "content_generating": ["pricing_ready", "rejected"],
    "pricing_ready": ["review_passed", "rejected"],
    "review_passed": ["preflight_passed", "rejected"],
    "preflight_passed": ["publish_queued", "rejected"],
    "publish_queued": ["publishing", "rejected"],
    "publishing": ["published", "blocked", "manual_required"],
    "blocked": ["manual_required", "rejected"],
    "manual_required": ["discovered", "rejected"],  # Can restart
    "procurement_draft_ready": ["archived"],
    "published": ["procurement_draft_ready", "archived"],
    "rejected": [],
    "archived": [],
}


def create_item(
    batch_id: str,
    store_id: str,
    risk_level: int = 0,
    score_total: float = 0.0,
) -> dict[str, Any]:
    """Create a new opportunity item."""
    return item_repo.create_item(
        batch_id=batch_id,
        store_id=store_id,
        risk_level=risk_level,
        score_total=score_total,
    )


def get_item(item_id: str) -> dict[str, Any] | None:
    """Get an item by ID."""
    return item_repo.get_item(item_id)


def list_items(
    batch_id: str | None = None,
    store_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List items with optional filters."""
    return item_repo.list_items(
        batch_id=batch_id,
        store_id=store_id,
        status=status,
        limit=limit,
        offset=offset,
    )


def update_item_status(item_id: str, new_status: str) -> dict[str, Any]:
    """Update item status with validation.

    Raises:
        ValueError: If the transition is invalid
    """
    item = item_repo.get_item(item_id)
    if item is None:
        raise ValueError(f"Item {item_id} not found")

    current_status = item["status"]
    if current_status not in VALID_TRANSITIONS:
        raise ValueError(f"Unknown status '{current_status}'")

    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        raise ValueError(f"Invalid transition from '{current_status}' to '{new_status}'")

    return item_repo.update_item_status(item_id, new_status)


def update_item_score(item_id: str, score_total: float) -> dict[str, Any] | None:
    """Update item total score."""
    return item_repo.update_item_score(item_id, score_total)


def update_item_risk(item_id: str, risk_level: int) -> dict[str, Any] | None:
    """Update item risk level."""
    return item_repo.update_item_risk(item_id, risk_level)


def get_item_detail(item_id: str) -> dict[str, Any] | None:
    """Get item with all related entities."""
    item = item_repo.get_item(item_id)
    if item is None:
        return None

    detail: dict[str, Any] = {"item": item}

    # Add supply candidates
    detail["supply_candidates"] = supply_repo.list_candidates(item_id)

    # Add current supply candidate details
    if item.get("current_supply_candidate_id"):
        detail["current_supply_candidate"] = supply_repo.get_candidate(
            item["current_supply_candidate_id"]
        )
    else:
        detail["current_supply_candidate"] = None

    # Add mappings
    detail["mappings"] = mapping_repo.list_mappings(item_id)
    if item.get("current_mapping_id"):
        detail["current_mapping"] = mapping_repo.get_mapping(item["current_mapping_id"])
    else:
        detail["current_mapping"] = None

    # Add content variants
    detail["content_variants"] = content_repo.list_variants(item_id)
    if item.get("current_content_variant_id"):
        detail["current_content_variant"] = content_repo.get_variant(
            item["current_content_variant_id"]
        )
    else:
        detail["current_content_variant"] = None

    # Add pricing decisions
    detail["pricing_decisions"] = pricing_repo.list_decisions(item_id)
    if item.get("current_pricing_decision_id"):
        detail["current_pricing_decision"] = pricing_repo.get_decision(
            item["current_pricing_decision_id"]
        )
    else:
        detail["current_pricing_decision"] = None

    # Add preflight checks
    detail["preflight_checks"] = preflight_repo.list_checks(item_id)

    return detail


def advance_to_shortlisted(item_id: str) -> dict[str, Any]:
    """Advance item to shortlisted status."""
    return update_item_status(item_id, "shortlisted")


def advance_to_sourcing_scored(item_id: str, score_total: float) -> dict[str, Any]:
    """Advance item to sourcing_scored and set score."""
    item = update_item_status(item_id, "sourcing_scored")
    update_item_score(item_id, score_total)
    return item


def advance_to_mapping_in_progress(item_id: str) -> dict[str, Any]:
    """Advance item to mapping_in_progress."""
    return update_item_status(item_id, "mapping_in_progress")


def advance_to_mapping_confirmed(item_id: str, mapping_id: str) -> dict[str, Any]:
    """Advance item to mapping_confirmed and set current mapping."""
    item_repo.set_current_mapping(item_id, mapping_id)
    return update_item_status(item_id, "mapping_confirmed")


def advance_to_content_generating(item_id: str) -> dict[str, Any]:
    """Advance item to content_generating."""
    return update_item_status(item_id, "content_generating")


def advance_to_pricing_ready(item_id: str, variant_id: str) -> dict[str, Any]:
    """Advance item to pricing_ready and set current content."""
    item_repo.set_current_content_variant(item_id, variant_id)
    return update_item_status(item_id, "pricing_ready")


def advance_to_review_passed(item_id: str, decision_id: str) -> dict[str, Any]:
    """Advance item to review_passed and set current pricing."""
    item_repo.set_current_pricing_decision(item_id, decision_id)
    return update_item_status(item_id, "review_passed")


def advance_to_preflight_passed(item_id: str) -> dict[str, Any]:
    """Advance item to preflight_passed after successful preflight."""
    item_repo.set_preflight_status(item_id, "passed")
    return update_item_status(item_id, "preflight_passed")


def advance_to_publish_queued(item_id: str, idempotency_key: str) -> dict[str, Any]:
    """Advance item to publish_queued."""
    item_repo.set_publish_idempotency_key(item_id, idempotency_key)
    return update_item_status(item_id, "publish_queued")


def advance_to_publishing(item_id: str) -> dict[str, Any]:
    """Advance item to publishing."""
    return update_item_status(item_id, "publishing")


def mark_as_published(item_id: str) -> dict[str, Any]:
    """Mark item as successfully published."""
    return update_item_status(item_id, "published")


def mark_as_blocked(item_id: str) -> dict[str, Any]:
    """Mark item as blocked."""
    return update_item_status(item_id, "blocked")


def mark_as_manual_required(item_id: str) -> dict[str, Any]:
    """Mark item as requiring manual intervention."""
    return update_item_status(item_id, "manual_required")


def mark_as_rejected(item_id: str) -> dict[str, Any]:
    """Mark item as rejected."""
    return update_item_status(item_id, "rejected")


def mark_as_procurement_draft_ready(item_id: str) -> dict[str, Any]:
    """Mark item as ready for procurement draft."""
    return update_item_status(item_id, "procurement_draft_ready")


def mark_as_archived(item_id: str) -> dict[str, Any]:
    """Mark item as archived."""
    return update_item_status(item_id, "archived")


def bulk_advance_status(item_ids: list[str], new_status: str) -> list[dict[str, Any]]:
    """Bulk advance multiple items to a new status.

    Validates that all items can transition to the new status.
    Raises ValueError if any item cannot transition.
    """
    # Validate all transitions first
    for item_id in item_ids:
        item = item_repo.get_item(item_id)
        if item is None:
            raise ValueError(f"Item {item_id} not found")
        current_status = item["status"]
        if new_status not in VALID_TRANSITIONS.get(current_status, []):
            raise ValueError(f"Invalid transition from '{current_status}' to '{new_status}' for item {item_id}")

    return item_repo.bulk_update_status(item_ids, new_status)


def bulk_set_risk(item_ids: list[str], risk_level: int) -> list[dict[str, Any]]:
    """Bulk set risk level for multiple items."""
    return item_repo.bulk_update_risk(item_ids, risk_level)


def bulk_create_items(
    batch_id: str,
    store_id: str,
    items_data: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Bulk create multiple items in a batch."""
    return item_repo.bulk_create_items(batch_id, store_id, items_data)
