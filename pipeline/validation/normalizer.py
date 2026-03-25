"""
Normalization functions for jurisdiction, sector, violation types, etc.

Reused from export_to_frontend.py — these map raw extracted values to the
frontend's enum types.
"""

from __future__ import annotations

from typing import List

# ── Enums ────────────────────────────────────────────────────────────────────

JURISDICTION_ENUM = [
    "US FTC",
    "California DOJ",
    "UK ICO",
    "Singapore PDPC",
    "EU GDPR",
    "EU EDPB",
    "Australia OAIC",
]

SECTORS = [
    "Technology",
    "Social Media",
    "Healthcare",
    "E-Commerce",
    "Gaming",
    "Finance",
    "Advertising",
    "Food Delivery",
    "Hospitality",
    "Retail",
    "Transportation",
]

VIOLATION_TYPES = [
    "Misrepresentation of practices",
    "Failure to disclose practices",
    "Health breach notification failure",
    "Excessive retention of childrens data",
    "Failure of parent control over childrens data",
    "Failure to obtain parental consent",
]


# ── Jurisdiction ─────────────────────────────────────────────────────────────


def norm_jurisdiction(j: str | None) -> str:
    if not j:
        return "US FTC"
    j_lower = j.lower()
    if "ftc" in j_lower or "federal trade commission" in j_lower:
        return "US FTC"
    if "california" in j_lower or "ccpa" in j_lower or "doj" in j_lower:
        return "California DOJ"
    if "ico" in j_lower or "uk" in j_lower or "information commissioner" in j_lower:
        return "UK ICO"
    if "singapore" in j_lower or "pdpa" in j_lower:
        return "Singapore PDPC"
    if "edpb" in j_lower:
        return "EU EDPB"
    if "gdpr" in j_lower or "dpc" in j_lower or "eu" in j_lower:
        return "EU GDPR"
    if "oaic" in j_lower or "australia" in j_lower:
        return "Australia OAIC"
    return "US FTC"


# ── Sector ───────────────────────────────────────────────────────────────────


def norm_sector(s: str | None) -> str:
    if not s:
        return "Technology"
    s_clean = s.strip()
    for allowed in SECTORS:
        if s_clean.lower() == allowed.lower():
            return allowed
    s_lower = s_clean.lower()
    if "social" in s_lower or "platform" in s_lower:
        return "Social Media"
    if "health" in s_lower or "clinic" in s_lower or "hospital" in s_lower:
        return "Healthcare"
    if "financ" in s_lower or "bank" in s_lower or "credit" in s_lower:
        return "Finance"
    if "retail" in s_lower or "store" in s_lower:
        return "Retail"
    if "adtech" in s_lower or "advertis" in s_lower or "marketing" in s_lower:
        return "Advertising"
    return "Technology"


# ── Violation type mapping ───────────────────────────────────────────────────

_HEALTH_KEYWORDS = {
    "health", "medical", "patient", "clinical", "hipaa", "phi", "hospital",
    "diagnosis", "prescription", "mental health", "wellness", "healthcare",
}


def _involves_health_data(data_types: str) -> bool:
    d = (data_types or "").lower()
    return any(k in d for k in _HEALTH_KEYWORDS)


def map_violation_type(solove_type: str | None, data_types: str = "") -> List[str]:
    """Map Solove taxonomy string to frontend ViolationType[] values."""
    if not solove_type:
        return []
    t = solove_type.lower()

    result: List[str] = []

    if any(k in t for k in [
        "disclosure", "exposure", "accessibility",
        "breach of confidentiality", "secondary use",
    ]):
        result.append("Failure to disclose practices")
    if any(k in t for k in ["insecurity", "security"]) and _involves_health_data(data_types):
        result.append("Health breach notification failure")
    if any(k in t for k in ["children", "child", "minor", "coppa"]):
        result.append("Failure to obtain parental consent")
    if any(k in t for k in [
        "surveillance", "interrogation", "intrusion",
        "decisional interference", "aggregation", "identification",
    ]):
        result.append("Misrepresentation of practices")

    if not result:
        result.append("Misrepresentation of practices")

    return [v for v in dict.fromkeys(result) if v in VIOLATION_TYPES]


# ── Impact formatting ────────────────────────────────────────────────────────


def format_impacted(n: int | None) -> str:
    if not n or n <= 0:
        return ""
    if n >= 1_000_000_000:
        return f"{n / 1_000_000_000:.1f}B+"
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M+"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K+"
    return str(n)


# ── Severity ─────────────────────────────────────────────────────────────────


def severity_from_impact_and_data(individuals: int | None, data_types: str) -> int:
    """Severity 1-5 based on people affected and type of data."""
    dt_lower = (data_types or "").lower()
    if any(k in dt_lower for k in [
        "health", "medical", "biometric", "children", "child",
        "ssn", "social security", "financial", "bank",
    ]):
        data_score = 3
    elif any(k in dt_lower for k in ["location", "identity", "credit", "genetic"]):
        data_score = 2
    else:
        data_score = 1

    if individuals is None or individuals <= 0:
        people_score = 0
    elif individuals >= 1_000_000:
        people_score = 2
    elif individuals >= 10_000:
        people_score = 1
    else:
        people_score = 0

    return max(1, min(5, data_score + people_score))
