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
    "Canada OPC",
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
    "Unauthorized Data Collection",
    "Data Breach & Negligence",
    "Unauthorized Disclosure/Selling",
    "Failure to Honor Consumer Rights",
    "Misleading Privacy Policies",
    "Invasion of Seclusion",
    "False Light/Misappropriation",
    "Improper Data Disposal",
    "Illegal Monitoring/Surveillance",
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
    if "canada" in j_lower or "pipeda" in j_lower or "opc" in j_lower or "privacy act (canada)" in j_lower:
        return "Canada OPC"
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


def map_violation_type(solove_type: str | None, data_types: str = "",
                       legal_bases: list | None = None,
                       summary: str = "") -> List[str]:
    """Map Solove taxonomy + case context to frontend ViolationType[] values.

    9 violation types:
    - Unauthorized Data Collection: collecting without consent, pre-ticked boxes, ignoring opt-out
    - Data Breach & Negligence: poor security leading to unauthorized access
    - Unauthorized Disclosure/Selling: sharing/selling data to third parties without authorization
    - Failure to Honor Consumer Rights: not fulfilling access/delete/correct requests (CCPA, GDPR rights)
    - Misleading Privacy Policies: deceptive/inaccurate privacy representations
    - Invasion of Seclusion: intruding into private space/affairs
    - False Light/Misappropriation: using name/likeness without consent, publishing private facts
    - Improper Data Disposal: failing to securely destroy records
    - Illegal Monitoring/Surveillance: tracking, cameras, web session recording without consent
    """
    if not solove_type:
        return ["Unauthorized Data Collection"]
    t = solove_type.lower()
    dt = (data_types or "").lower()
    bases_str = " ".join(legal_bases or []).lower()
    s = (summary or "").lower()

    result: List[str] = []

    # ── Data Breach & Negligence ──────────────────────────────────────────
    if (any(k in t for k in ["insecurity"]) or
        any(k in s for k in [
            "breach", "hack", "unauthorized access", "data breach", "leaked",
            "exposed", "security", "inadequate safeguard", "failed to protect",
            "compromised", "vulnerability",
        ])):
        result.append("Data Breach & Negligence")

    # ── Unauthorized Disclosure/Selling ───────────────────────────────────
    if (any(k in t for k in [
            "breach of confidentiality", "disclosure", "increased accessibility",
        ]) or
        any(k in s for k in [
            "sold", "selling", "shared", "disclosed", "transferred",
            "third part", "without authorization", "without consent",
            "data broker", "sold data",
        ])):
        result.append("Unauthorized Disclosure/Selling")

    # ── Misleading Privacy Policies ───────────────────────────────────────
    if (any(k in t for k in ["distortion"]) or
        any(k in s for k in [
            "misrepresent", "deceptive", "false", "misleading", "claimed",
            "privacy policy", "represented that", "unfair", "fraudulent",
            "inaccurate", "failed to disclose",
        ])):
        result.append("Misleading Privacy Policies")

    # ── Unauthorized Data Collection ──────────────────────────────────────
    if (any(k in t for k in [
            "surveillance", "interrogation", "aggregation",
            "secondary use", "exclusion",
        ]) or
        any(k in s for k in [
            "without consent", "without notice", "collected", "pre-ticked",
            "opt-out", "opted out", "tracking", "gathered", "harvested",
            "scraped", "profiling",
        ])):
        result.append("Unauthorized Data Collection")

    # ── Illegal Monitoring/Surveillance ───────────────────────────────────
    if (any(k in t for k in ["surveillance", "intrusion"]) or
        any(k in s for k in [
            "monitor", "surveillance", "tracking", "recorded", "session recording",
            "chat box", "wiretap", "camera", "gps", "geolocation", "spyware",
            "keystroke", "screen capture",
        ])):
        result.append("Illegal Monitoring/Surveillance")

    # ── Failure to Honor Consumer Rights ──────────────────────────────────
    if (any(k in t for k in ["exclusion"]) or
        any(k in s for k in [
            "access request", "deletion request", "right to delete",
            "right to access", "right to correct", "opt-out request",
            "failed to respond", "consumer rights", "data subject request",
            "dsar", "right to erasure", "right to rectification",
        ]) or
        any(k in bases_str for k in [
            "ccpa", "cpra", "art. 15", "art. 17", "art. 16",
            "right of access", "right to erasure",
        ])):
        result.append("Failure to Honor Consumer Rights")

    # ── Invasion of Seclusion ─────────────────────────────────────────────
    if (any(k in t for k in ["intrusion", "decisional interference"]) or
        any(k in s for k in [
            "intrusion", "seclusion", "private space", "private affairs",
            "unwanted contact", "stalking", "harassment",
        ])):
        result.append("Invasion of Seclusion")

    # ── False Light/Misappropriation ──────────────────────────────────────
    if (any(k in t for k in ["appropriation", "exposure"]) or
        any(k in s for k in [
            "likeness", "false light", "misappropriation", "name or image",
            "identity theft", "impersonat", "deepfake", "private facts",
        ])):
        result.append("False Light/Misappropriation")

    # ── Improper Data Disposal ────────────────────────────────────────────
    if any(k in s for k in [
            "disposal", "dispose", "destroy", "shredding", "retention",
            "retained", "kept longer", "failed to delete", "improper disposal",
            "data retention",
        ]):
        result.append("Improper Data Disposal")

    # ── Default fallback ──────────────────────────────────────────────────
    if not result:
        result.append("Unauthorized Data Collection")

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
