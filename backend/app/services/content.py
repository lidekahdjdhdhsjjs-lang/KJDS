"""Services for ContentVariant operations."""

import json
from typing import Any

import app.repositories.content_variants as repo
import app.repositories.opportunities as item_repo


def create_variant(
    opportunity_item_id: str,
    title: str,
    bullet_points: list[str] | None = None,
    image_bundle: dict[str, Any] | None = None,
    template_ref: str | None = None,
    locale: str = "vi",
) -> dict[str, Any]:
    """Create a new content variant.

    Args:
        opportunity_item_id: The item for this content
        title: Product title
        bullet_points: List of bullet point strings
        image_bundle: Dict with image URLs and metadata
        template_ref: Reference to the template used
        locale: Locale code (default: vi for Vietnamese)

    Returns:
        The created variant
    """
    return repo.create_variant(
        opportunity_item_id=opportunity_item_id,
        title=title,
        bullet_points=json.dumps(bullet_points) if bullet_points else None,
        image_bundle_ref=json.dumps(image_bundle) if image_bundle else None,
        template_ref=template_ref,
        locale=locale,
    )


def get_variant(variant_id: str) -> dict[str, Any] | None:
    """Get a variant by ID."""
    return repo.get_variant(variant_id)


def list_variants(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List variants for an opportunity item."""
    return repo.list_variants(opportunity_item_id)


def approve_variant(variant_id: str) -> dict[str, Any]:
    """Approve a variant and update item's current content.

    Raises:
        ValueError: If variant not found
    """
    variant = repo.approve_variant(variant_id)
    if variant is None:
        raise ValueError(f"Variant {variant_id} not found")

    # Update item's current content variant
    item_repo.set_current_content_variant(variant["opportunity_item_id"], variant_id)
    return variant


def reject_variant(variant_id: str) -> dict[str, Any] | None:
    """Reject a variant."""
    return repo.reject_variant(variant_id)


def get_latest_approved_variant(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest approved variant for an item."""
    return repo.get_latest_approved_variant(opportunity_item_id)


def parse_variant_payload(variant: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payloads in variant to Python objects."""
    result = variant.copy()
    if variant.get("bullet_points"):
        result["bullet_points_list"] = json.loads(variant["bullet_points"])
    if variant.get("image_bundle_ref"):
        result["images"] = json.loads(variant["image_bundle_ref"])
    return result
