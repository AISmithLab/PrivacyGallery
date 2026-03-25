"""
Post-extraction validation — check for missing fields, impossible values, etc.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime

log = logging.getLogger(__name__)


def validate_case(data: dict) -> list[str]:
    """
    Validate extracted case data. Returns a list of warning messages.
    Empty list means all checks passed.
    """
    warnings: list[str] = []

    # Required string fields
    for field in ("company", "jurisdiction", "summary"):
        if not data.get(field):
            warnings.append(f"Missing required field: {field}")

    # Year validation
    year = data.get("year")
    if year is not None:
        try:
            y = int(year)
            if y < 1990 or y > datetime.now().year + 1:
                warnings.append(f"Suspicious year: {y}")
        except (TypeError, ValueError):
            warnings.append(f"Invalid year: {year}")

    # Penalty validation
    penalty = data.get("penalty_amount_usd")
    if penalty is not None:
        try:
            p = float(penalty)
            if p < 0:
                warnings.append(f"Negative penalty: {p}")
            if p > 50_000_000_000:
                warnings.append(f"Implausibly large penalty: {p}")
        except (TypeError, ValueError):
            warnings.append(f"Invalid penalty amount: {penalty}")

    # Individuals validation
    individuals = data.get("individuals_affected")
    if individuals is not None:
        try:
            n = int(individuals)
            if n < 0:
                warnings.append(f"Negative individuals_affected: {n}")
            if n > 10_000_000_000:
                warnings.append(f"Implausibly large individuals_affected: {n}")
        except (TypeError, ValueError):
            pass  # 0 or null is acceptable

    # Narrative length checks
    for field in ("what_they_did", "why_they_were_wrong"):
        val = data.get(field, "")
        if val and len(val) > 200:
            warnings.append(f"{field} exceeds 200 chars ({len(val)})")

    # Legal bases should be a list
    bases = data.get("legal_bases_violated")
    if bases is not None and not isinstance(bases, list):
        warnings.append(f"legal_bases_violated should be a list, got {type(bases).__name__}")

    # Enforcement outcomes should be a list
    outcomes = data.get("enforcement_outcomes")
    if outcomes is not None and not isinstance(outcomes, list):
        warnings.append(f"enforcement_outcomes should be a list, got {type(outcomes).__name__}")

    if warnings:
        company = data.get("company", "?")
        log.warning(f"Validation warnings for {company}: {warnings}")

    return warnings


def is_valid(data: dict) -> bool:
    """Return True if there are no critical validation failures."""
    warnings = validate_case(data)
    # Only block on missing company — everything else is a warning
    critical = [w for w in warnings if "Missing required field: company" in w]
    return len(critical) == 0
