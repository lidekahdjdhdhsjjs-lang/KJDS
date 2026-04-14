"""Services for CategoryMapping operations."""

import json
from typing import Any

import app.repositories.category_mappings as repo
import app.repositories.opportunities as item_repo


def create_mapping(
    opportunity_item_id: str,
    category_ref: str,
    attributes: dict[str, Any],
    confidence_score: float = 0.0,
    variation: dict[str, Any] | None = None,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a new category mapping.

    Args:
        opportunity_item_id: The item to map
        category_ref: Shopee category ID
        attributes: Attribute key-value pairs
        confidence_score: Confidence level (0.0 to 1.0)
        variation: Variation structure (for products with variants)
        evidence: Evidence supporting this mapping (e.g., competitor data)

    Returns:
        The created mapping
    """
    return repo.create_mapping(
        opportunity_item_id=opportunity_item_id,
        category_ref=category_ref,
        attributes_payload=json.dumps(attributes),
        confidence_score=confidence_score,
        variation_payload=json.dumps(variation) if variation else None,
        evidence_payload=json.dumps(evidence) if evidence else None,
    )


def get_mapping(mapping_id: str) -> dict[str, Any] | None:
    """Get a mapping by ID."""
    return repo.get_mapping(mapping_id)


def list_mappings(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List mappings for an opportunity item."""
    return repo.list_mappings(opportunity_item_id)


def confirm_mapping(mapping_id: str) -> dict[str, Any]:
    """Confirm a mapping and update the item's current mapping.

    Raises:
        ValueError: If mapping not found
    """
    mapping = repo.confirm_mapping(mapping_id)
    if mapping is None:
        raise ValueError(f"Mapping {mapping_id} not found")

    # Update item's current mapping
    item_repo.set_current_mapping(mapping["opportunity_item_id"], mapping_id)
    return mapping


def reject_mapping(mapping_id: str) -> dict[str, Any] | None:
    """Reject a mapping."""
    return repo.reject_mapping(mapping_id)


def get_latest_confirmed_mapping(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest confirmed mapping for an item."""
    return repo.get_latest_confirmed_mapping(opportunity_item_id)


def parse_mapping_payload(mapping: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payloads in mapping to Python objects."""
    result = mapping.copy()
    result["attributes"] = json.loads(mapping["attributes_payload"])
    if mapping.get("variation_payload"):
        result["variation"] = json.loads(mapping["variation_payload"])
    if mapping.get("evidence_payload"):
        result["evidence"] = json.loads(mapping["evidence_payload"])
    return result
