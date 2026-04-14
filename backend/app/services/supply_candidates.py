"""Services for SupplyCandidate operations."""

from typing import Any

import app.repositories.supply_candidates as repo
import app.repositories.opportunities as item_repo


def create_candidate(
    opportunity_item_id: str,
    source_platform: str,
    source_item_ref: str,
    cost_amount: float,
    supplier_ref: str | None = None,
    moq: int = 1,
    ship_from: str | None = None,
) -> dict[str, Any]:
    """Create a new supply candidate."""
    return repo.create_candidate(
        opportunity_item_id=opportunity_item_id,
        source_platform=source_platform,
        source_item_ref=source_item_ref,
        cost_amount=cost_amount,
        supplier_ref=supplier_ref,
        moq=moq,
        ship_from=ship_from,
    )


def get_candidate(candidate_id: str) -> dict[str, Any] | None:
    """Get a candidate by ID."""
    return repo.get_candidate(candidate_id)


def list_candidates(opportunity_item_id: str, status: str | None = None) -> list[dict[str, Any]]:
    """List candidates for an opportunity item."""
    return repo.list_candidates(opportunity_item_id, status=status)


def score_candidate(
    candidate_id: str,
    reliability_score: float,
    image_quality_score: float,
) -> dict[str, Any] | None:
    """Update candidate scores.

    Scores should be 0.0 to 1.0.
    """
    return repo.update_scores(
        candidate_id,
        reliability_score=min(1.0, max(0.0, reliability_score)),
        image_quality_score=min(1.0, max(0.0, image_quality_score)),
    )


def calculate_combined_score(reliability: float, image_quality: float) -> float:
    """Calculate combined score from reliability and image quality.

    Weighted average with reliability weighted higher (0.6 vs 0.4).
    """
    return 0.6 * reliability + 0.4 * image_quality


def select_best_candidate(opportunity_item_id: str) -> dict[str, Any] | None:
    """Select the best candidate for an item and set it as current.

    Returns:
        The selected candidate or None if no candidates available
    """
    best = repo.get_best_candidate(opportunity_item_id)
    if best is None:
        return None

    # Set as current supply candidate
    item_repo.set_current_supply_candidate(opportunity_item_id, best["id"])
    return best


def deactivate_candidate(candidate_id: str) -> dict[str, Any] | None:
    """Deactivate a candidate (mark as inactive)."""
    return repo.update_status(candidate_id, "inactive")


def activate_candidate(candidate_id: str) -> dict[str, Any] | None:
    """Activate a candidate (mark as active)."""
    return repo.update_status(candidate_id, "active")


def get_best_candidate(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the best scoring candidate without setting it as current."""
    return repo.get_best_candidate(opportunity_item_id)
