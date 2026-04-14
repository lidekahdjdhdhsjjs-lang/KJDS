"""Services for ProcurementDraft operations."""

import json
from typing import Any

import app.repositories.procurement_drafts as repo
import app.repositories.opportunities as item_repo


def create_draft(
    opportunity_item_id: str,
    supplier_ref: str,
    purchase_price: float,
    sku: dict[str, Any] | None = None,
    qty: int = 1,
) -> dict[str, Any]:
    """Create a new procurement draft.

    Args:
        opportunity_item_id: The item to procure
        supplier_ref: 1688 supplier reference
        purchase_price: Price per unit from supplier
        sku: SKU information (size, color, etc.)
        qty: Quantity to order

    Returns:
        The created draft
    """
    return repo.create_draft(
        opportunity_item_id=opportunity_item_id,
        supplier_ref=supplier_ref,
        purchase_price=purchase_price,
        sku_payload=json.dumps(sku) if sku else None,
        qty=qty,
    )


def get_draft(draft_id: str) -> dict[str, Any] | None:
    """Get a draft by ID."""
    return repo.get_draft(draft_id)


def list_drafts(
    opportunity_item_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List drafts with optional filters."""
    return repo.list_drafts(
        opportunity_item_id=opportunity_item_id,
        status=status,
        limit=limit,
        offset=offset,
    )


def submit_for_confirmation(draft_id: str) -> dict[str, Any] | None:
    """Submit draft for confirmation."""
    return repo.submit_for_confirmation(draft_id)


def confirm_draft(draft_id: str) -> dict[str, Any] | None:
    """Confirm a draft.

    After confirmation, the procurement can proceed manually.
    """
    return repo.confirm_draft(draft_id)


def invalidate_draft(draft_id: str, reason: str) -> dict[str, Any] | None:
    """Invalidate a draft (e.g., when price changes)."""
    return repo.invalidate_draft(draft_id, reason)


def cancel_draft(draft_id: str) -> dict[str, Any] | None:
    """Cancel a draft."""
    return repo.cancel_draft(draft_id)


def get_latest_draft(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest draft for an item."""
    return repo.get_latest_draft(opportunity_item_id)


def parse_draft_payload(draft: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payload in draft to Python object."""
    result = draft.copy()
    if draft.get("sku_payload"):
        result["sku"] = json.loads(draft["sku_payload"])
    return result


def check_price_change(draft_id: str, new_price: float) -> bool:
    """Check if price has changed significantly.

    Returns:
        True if price changed more than 5%
    """
    draft = repo.get_draft(draft_id)
    if draft is None:
        return False

    old_price = draft["purchase_price"]
    if old_price == 0:
        return True

    change_percent = abs(new_price - old_price) / old_price
    return change_percent > 0.05


def handle_price_increase(draft_id: str, new_price: float) -> dict[str, Any]:
    """Handle a price increase by invalidating the draft.

    Args:
        draft_id: The draft ID
        new_price: The new price from supplier

    Returns:
        The invalidated draft
    """
    return invalidate_draft(
        draft_id,
        reason=f"Price increased to {new_price}",
    )
