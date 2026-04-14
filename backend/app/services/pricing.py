"""Services for PricingDecision operations."""

import json
from typing import Any

import app.repositories.pricing_decisions as repo
import app.repositories.opportunities as item_repo


def create_decision(
    opportunity_item_id: str,
    cost: dict[str, Any],
    fee: dict[str, Any],
    exchange_rate: dict[str, Any],
    suggested_price: float,
    min_profit_line: float,
    competitor_band: dict[str, Any] | None = None,
    decision_reason: str | None = None,
) -> dict[str, Any]:
    """Create a new pricing decision.

    Args:
        opportunity_item_id: The item to price
        cost: Cost breakdown (product, shipping, packaging, etc.)
        fee: Fee breakdown (platform fee, payment fee, etc.)
        exchange_rate: Exchange rate info
        suggested_price: AI-suggested price
        min_profit_line: Minimum acceptable profit threshold
        competitor_band: Competitor price range data
        decision_reason: Explanation for the pricing

    Returns:
        The created decision
    """
    return repo.create_decision(
        opportunity_item_id=opportunity_item_id,
        cost_payload=json.dumps(cost),
        fee_payload=json.dumps(fee),
        exchange_rate_payload=json.dumps(exchange_rate),
        suggested_price=suggested_price,
        min_profit_line=min_profit_line,
        competitor_band_payload=json.dumps(competitor_band) if competitor_band else None,
        decision_reason=decision_reason,
    )


def get_decision(decision_id: str) -> dict[str, Any] | None:
    """Get a decision by ID."""
    return repo.get_decision(decision_id)


def list_decisions(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List decisions for an opportunity item."""
    return repo.list_decisions(opportunity_item_id)


def approve_decision(decision_id: str, final_price: float | None = None) -> dict[str, Any]:
    """Approve a decision and update item's current pricing.

    Args:
        decision_id: The decision to approve
        final_price: Override price (if None, uses suggested_price)

    Raises:
        ValueError: If decision not found
    """
    decision = repo.approve_decision(decision_id, final_price=final_price)
    if decision is None:
        raise ValueError(f"Decision {decision_id} not found")

    # Update item's current pricing decision
    item_repo.set_current_pricing_decision(decision["opportunity_item_id"], decision_id)
    return decision


def reject_decision(decision_id: str) -> dict[str, Any] | None:
    """Reject a decision."""
    return repo.reject_decision(decision_id)


def invalidate_decision(decision_id: str, reason: str) -> dict[str, Any] | None:
    """Invalidate a decision (e.g., when cost changes)."""
    return repo.invalidate_decision(decision_id, reason)


def check_profit_line(decision_id: str) -> bool:
    """Check if the decision meets the minimum profit line."""
    return repo.check_profit_line(decision_id)


def get_latest_approved_decision(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest approved decision for an item."""
    return repo.get_latest_approved_decision(opportunity_item_id)


def parse_decision_payload(decision: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payloads in decision to Python objects."""
    result = decision.copy()
    result["cost"] = json.loads(decision["cost_payload"])
    result["fee"] = json.loads(decision["fee_payload"])
    result["exchange_rate"] = json.loads(decision["exchange_rate_payload"])
    if decision.get("competitor_band_payload"):
        result["competitor_band"] = json.loads(decision["competitor_band_payload"])
    return result


def calculate_profit_margin(decision: dict[str, Any]) -> float:
    """Calculate profit margin as percentage."""
    parsed = parse_decision_payload(decision)
    price = decision.get("final_price") or decision.get("suggested_price", 0)

    # Sum up all costs
    cost_total = sum(parsed["cost"].values()) if isinstance(parsed["cost"], dict) else 0

    # Sum up all fees as percentages
    fee_total = 0
    if isinstance(parsed["fee"], dict):
        for key, value in parsed["fee"].items():
            if isinstance(value, (int, float)):
                if key.endswith("_rate") or key.endswith("_percent"):
                    fee_total += price * value
                else:
                    fee_total += value

    if price == 0:
        return 0.0

    profit = price - cost_total - fee_total
    return (profit / price) * 100
