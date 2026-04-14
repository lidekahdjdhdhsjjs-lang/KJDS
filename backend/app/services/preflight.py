"""Services for PreflightCheck operations."""

import json
from typing import Any

import app.repositories.preflight_checks as repo
import app.repositories.opportunities as item_repo


# Check result constants
PASSED = "passed"
FAILED = "failed"
WARNING = "warning"


def create_check(
    opportunity_item_id: str,
    profit_check: str,
    compliance_check: str,
    supply_check: str,
    account_health_check: str,
    details: dict[str, Any],
) -> dict[str, Any]:
    """Create a new preflight check.

    Args:
        opportunity_item_id: The item to check
        profit_check: "passed", "failed", or "warning"
        compliance_check: "passed", "failed", or "warning"
        supply_check: "passed", "failed", or "warning"
        account_health_check: "passed", "failed", or "warning"
        details: Detailed check results

    Returns:
        The created check
    """
    # Overall result is passed only if all checks are passed
    all_checks = [profit_check, compliance_check, supply_check, account_health_check]
    overall_result = PASSED if all(c == PASSED for c in all_checks) else FAILED

    return repo.create_check(
        opportunity_item_id=opportunity_item_id,
        profit_check=profit_check,
        compliance_check=compliance_check,
        supply_check=supply_check,
        account_health_check=account_health_check,
        overall_result=overall_result,
        detail_payload=json.dumps(details),
    )


def get_check(check_id: str) -> dict[str, Any] | None:
    """Get a check by ID."""
    return repo.get_check(check_id)


def get_latest_check(opportunity_item_id: str) -> dict[str, Any] | None:
    """Get the latest preflight check for an item."""
    return repo.get_latest_check(opportunity_item_id)


def list_checks(opportunity_item_id: str) -> list[dict[str, Any]]:
    """List all preflight checks for an item."""
    return repo.list_checks(opportunity_item_id)


def is_passed(check_id: str) -> bool:
    """Check if a preflight check passed."""
    return repo.is_passed(check_id)


def run_preflight(
    opportunity_item_id: str,
    profit_ok: bool,
    compliance_ok: bool,
    supply_ok: bool,
    account_ok: bool,
    profit_details: dict[str, Any] | None = None,
    compliance_details: dict[str, Any] | None = None,
    supply_details: dict[str, Any] | None = None,
    account_details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a preflight check and create the record.

    Args:
        opportunity_item_id: The item to check
        profit_ok: Whether profit check passes
        compliance_ok: Whether compliance check passes
        supply_ok: Whether supply check passes
        account_ok: Whether account health check passes
        *_details: Detailed information for each check

    Returns:
        The created check
    """
    check = create_check(
        opportunity_item_id=opportunity_item_id,
        profit_check=PASSED if profit_ok else FAILED,
        compliance_check=PASSED if compliance_ok else FAILED,
        supply_check=PASSED if supply_ok else FAILED,
        account_health_check=PASSED if account_ok else FAILED,
        details={
            "profit": profit_details or {},
            "compliance": compliance_details or {},
            "supply": supply_details or {},
            "account_health": account_details or {},
        },
    )

    # Update item's preflight status
    status = "passed" if check["overall_result"] == PASSED else "failed"
    item_repo.set_preflight_status(opportunity_item_id, status)

    return check


def parse_check_payload(check: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON payload in check to Python object."""
    result = check.copy()
    result["details"] = json.loads(check["detail_payload"])
    return result


def get_check_summary(check: dict[str, Any]) -> dict[str, str]:
    """Get a summary of check results."""
    return {
        "profit": check["profit_check"],
        "compliance": check["compliance_check"],
        "supply": check["supply_check"],
        "account_health": check["account_health_check"],
        "overall": check["overall_result"],
    }
