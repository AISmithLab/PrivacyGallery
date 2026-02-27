"""
Export AI-enriched cases from PostgreSQL (filled by files/agent.py + Claude)
into the frontend's EnforcementCase JSON format at:

    src/data/generatedCases.json

Usage (from repo root or files/):

    cd files
    python export_to_frontend.py

Requires:
  - DATABASE_URL in .env
  - `cases` table populated by agent.py (raw_json column contains full payload)
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List

import psycopg2


MAX_SUMMARY_CHARS = 195


def _strip_trailing_conjunction(text: str) -> str:
    """Remove trailing ', and', ', or', ', but' etc. that leave text cut off mid-thought."""
    for bad in (", and", ", or", ", but", " and", " or", " but"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[:- len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    for bad in (" of.", " user.", " approximately", " from", " to", " in", " on", " for", " with", " without", " by", " of", " regardless of", " user", " the", " a", " an"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[:- len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    t = text.rstrip()
    if t and t[-1] not in ".?!":
        for sep in (" and ", ", ", ",' "):
            idx = t.rfind(sep)
            if idx > len(t) * 0.5:
                t = t[:idx].rstrip()
                if t.endswith(","):
                    t = t[:-1].rstrip()
                break
        if t and t[-1] not in ".?!":
            t = t + "."
    return t.strip()


def _truncate_to_complete_summary(text: str, max_chars: int = MAX_SUMMARY_CHARS) -> str:
    """Keep complete sentences only, max max_chars. Never cut mid-sentence."""
    if not text or not (t := (text or "").strip()):
        return ""
    if len(t) <= max_chars:
        return _strip_trailing_conjunction(t)
    sentences = re.split(r"(?<=[.!?])\s+", t)
    result = []
    for s in sentences:
        candidate = " ".join(result + [s]).strip()
        if len(candidate) <= max_chars:
            result.append(s)
        else:
            break
    if result:
        return _strip_trailing_conjunction(" ".join(result).strip())
    cut = t[:max_chars]
    last_space = cut.rfind(" ")
    out = cut[: last_space + 1].strip() if last_space > max_chars * 0.5 else cut.strip()
    return _strip_trailing_conjunction(out)
import psycopg2.extras
from dotenv import load_dotenv


load_dotenv()

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "src" / "data" / "generatedCases.json"
DATABASE_URL = os.getenv("DATABASE_URL")
# Optional: base URL for local PDF server (e.g. http://localhost:8765)
# Start server with: cd files/processed && python3 -m http.server 8765
PDF_SERVER_URL = (os.getenv("PDF_SERVER_URL") or "").rstrip("/")


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


def norm_sector(s: str | None) -> str:
    if not s:
        return "Technology"
    s_clean = s.strip()
    for allowed in SECTORS:
        if s_clean.lower() == allowed.lower():
            return allowed
    # Fuzzy matches
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


def map_violation_type(solove_type: str | None) -> List[str]:
    """Map Solove taxonomy string (from agent) into our ViolationType[] approximations."""
    if not solove_type:
        return []
    t = solove_type.lower()

    result: List[str] = []

    if any(k in t for k in ["disclosure", "exposure", "accessibility", "breach of confidentiality", "secondary use"]):
        result.append("Failure to disclose practices")
    if any(k in t for k in ["insecurity", "security", "breach"]):
        result.append("Health breach notification failure")
    if any(k in t for k in ["children", "child", "minor", "coppa"]):
        result.append("Failure to obtain parental consent")
    if any(k in t for k in ["surveillance", "interrogation", "intrusion", "decisional interference"]):
        result.append("Misrepresentation of practices")

    if not result:
        result.append("Misrepresentation of practices")

    # De-duplicate and keep only known types
    return [v for v in dict.fromkeys(result) if v in VIOLATION_TYPES]


def format_impacted(n: int | None) -> str:
    if not n or n <= 0:
        return ""
    if n >= 1_000_000_000:
        return f"{n/1_000_000_000:.1f}B+"
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M+"
    if n >= 1_000:
        return f"{n/1_000:.0f}K+"
    return str(n)


def severity_from_penalty_and_outcomes(penalty: float | None, outcomes: List[str]) -> int:
    if "Criminal Referral" in outcomes:
        return 5
    if penalty is None:
        return 3
    if penalty >= 1_000_000_000:
        return 5
    if penalty >= 50_000_000:
        return 4
    if penalty >= 5_000_000:
        return 3
    if penalty > 0:
        return 2
    return 3


def severity_from_impact_and_data(individuals: int | None, data_types: str) -> int:
    """Severity 1-5 based mainly on people affected and type of data."""
    dt_lower = (data_types or "").lower()
    # Data sensitivity: 1-3 (higher = more sensitive)
    if any(k in dt_lower for k in ["health", "medical", "biometric", "children", "child", "ssn", "social security", "financial", "bank"]):
        data_score = 3
    elif any(k in dt_lower for k in ["location", "identity", "credit", "genetic"]):
        data_score = 2
    else:
        data_score = 1

    # People impacted: 0-2 (higher = more people)
    if individuals is None or individuals <= 0:
        people_score = 0
    elif individuals >= 1_000_000:
        people_score = 2
    elif individuals >= 10_000:
        people_score = 1
    else:
        people_score = 0

    # Combined: 1-5 (data_score 1-3 + people_score 0-2)
    severity = data_score + people_score
    return max(1, min(5, severity))


def build_case(row: Dict[str, Any]) -> Dict[str, Any]:
    raw = row.get("raw_json")
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
    elif isinstance(raw, dict):
        data = raw
    else:
        data = {}

    company = data.get("company") or row.get("company") or "Unknown"
    jurisdiction_raw = data.get("jurisdiction") or row.get("jurisdiction")
    jurisdiction = norm_jurisdiction(jurisdiction_raw)
    year = data.get("year") or row.get("year") or 0
    summary = data.get("summary") or ""
    violation_type = data.get("violation_type")
    violation_notes = data.get("violation_notes") or ""
    legal_bases = data.get("legal_bases_violated") or []
    if isinstance(legal_bases, str):
        try:
            legal_bases = json.loads(legal_bases)
        except Exception:
            legal_bases = []
    if not isinstance(legal_bases, list):
        legal_bases = []
    enforcement_outcomes = data.get("enforcement_outcomes") or []
    if isinstance(enforcement_outcomes, str):
        try:
            enforcement_outcomes = json.loads(enforcement_outcomes)
        except Exception:
            enforcement_outcomes = []
    if not isinstance(enforcement_outcomes, list):
        enforcement_outcomes = []
    penalty_amount = data.get("penalty_amount_usd") or row.get("penalty_amount_usd")
    if penalty_amount is not None:
        try:
            penalty_amount = float(penalty_amount)
        except Exception:
            penalty_amount = 0.0
    penalty_original = data.get("penalty_original") or row.get("penalty_original") or ""
    penalty_total_display = data.get("penalty_total_display") or ""
    individuals = data.get("individuals_affected") or row.get("individuals_affected")
    try:
        individuals_int = int(individuals) if individuals is not None else None
    except Exception:
        individuals_int = None

    what_they_did = _truncate_to_complete_summary(data.get("what_they_did") or summary)
    why_they_were_wrong = _truncate_to_complete_summary(data.get("why_they_were_wrong") or violation_notes)

    claims_vs_reality = data.get("claims_vs_reality") or []
    if not isinstance(claims_vs_reality, list):
        claims_vs_reality = []
    claims_clean = []
    for cr in claims_vs_reality:
        if not isinstance(cr, dict):
            continue
        claim = (cr.get("claim") or "").strip()
        reality = (cr.get("reality") or "").strip()
        if claim or reality:
            claims_clean.append({"claim": claim, "reality": reality})

    legal_findings = data.get("legal_findings") or []
    if not isinstance(legal_findings, list):
        legal_findings = []
    regulatory_findings = []
    if legal_findings:
        for lf in legal_findings:
            if not isinstance(lf, dict):
                continue
            act = (lf.get("act") or "").strip()  # generic law text only
            desc = (lf.get("description") or "").strip()
            vios = lf.get("violations") or []  # case-specific: how company violated it
            if isinstance(vios, str):
                vios = [vios]
            if not isinstance(vios, list):
                vios = []
            vios_clean = [str(v).strip() for v in vios if str(v).strip()]
            regulatory_findings.append(
                {
                    "act": act,
                    "description": desc or (vios_clean[0] if vios_clean else ""),
                    "violations": vios_clean,
                }
            )
    if not regulatory_findings and legal_bases:
        # Fallback: one finding per legal basis with description from violation_notes
        for lb in legal_bases:
            regulatory_findings.append(
                {
                    "act": str(lb).strip(),
                    "description": (violation_notes or summary or "").strip(),
                    "violations": [violation_notes or summary] if (violation_notes or summary) else [],
                }
            )

    company_desc = data.get("company_description") or data.get("company_synopsis") or ""
    company_long = data.get("company_long_description") or company_desc
    founding_year = data.get("founding_year") or row.get("founding_year") or 0
    try:
        founding_year = int(founding_year)
    except Exception:
        founding_year = 0
    company_worth = data.get("company_worth") or ""
    company_now = data.get("company_now") or ""
    outcome_summary_short = data.get("outcome_summary_short") or ""

    data_types = data.get("data_types") or ""
    outcome = data.get("outcome") or row.get("outcome") or ""

    sector = norm_sector(data.get("sector") or row.get("sector"))
    violations = map_violation_type(violation_type)
    impacted_individuals = format_impacted(individuals_int) if (individuals_int and individuals_int > 0) else "Unknown"
    # Severity: use people affected + type of data as main factors
    severity = severity_from_impact_and_data(individuals_int, data_types)

    # Total fine only (no breakdown): prefer penalty_total_display, else parse "= X total" from penalty_original, else format from amount
    if penalty_total_display:
        fine_display = penalty_total_display.strip()
    elif penalty_original and ("=" in penalty_original or "total" in penalty_original.lower()):
        # e.g. "€130,000 (Art. 5...) + €1,250,000 (Art. 32) = €1,380,000 total" -> "€1,380,000"
        parts = penalty_original.split("=")
        if len(parts) >= 2:
            fine_display = parts[-1].replace("total", "").strip().strip(".")
        else:
            fine_display = penalty_original.strip()
    else:
        fine_display = penalty_original.strip() if penalty_original else ""
    if not fine_display and penalty_amount and penalty_amount > 0:
        fine_display = f"${penalty_amount:,.0f}"
    # When no monetary fine, always use "No fine" (not long phrases like "Injunctive relief sought")
    if not fine_display:
        fine_display = "No fine"
    # Normalize Singapore dollar for clarity (S$ → SGD)
    if fine_display and fine_display != "No fine" and "S$" in fine_display:
        fine_display = fine_display.replace("S$", "SGD ").strip()

    file_name = row.get("file_name") or ""
    attached_pdfs: List[Dict[str, Any]] = []
    case_source_url = (data.get("case_source_url") or "").strip()
    # Reject press release / news URLs — only use legal library / case pages
    _bad = ("/news-events/", "/press-releases/", "/news/")
    _skip_url = False
    if case_source_url and case_source_url.startswith("http"):
        if any(b in case_source_url.lower() for b in _bad):
            _skip_url = True
        elif "ftc.gov" in case_source_url.lower() and "legal-library" not in case_source_url.lower() and "cases-proceedings" not in case_source_url.lower():
            _skip_url = True
    if case_source_url and case_source_url.startswith("http") and not _skip_url:
        source_label = {
            "US FTC": "View case on FTC",
            "California DOJ": "View case on CA DOJ",
            "UK ICO": "View case on ICO",
            "Singapore PDPC": "View case on PDPC",
            "EU GDPR": "View case on regulator",
            "EU EDPB": "View case on EDPB",
            "Australia OAIC": "View case on OAIC",
        }.get(jurisdiction, "View case on regulator")
        attached_pdfs.append({"url": case_source_url, "label": source_label})

    # PDF download link — only when local PDF server is running
    if PDF_SERVER_URL and file_name:
        from urllib.parse import quote
        pdf_url = f"{PDF_SERVER_URL}/{quote(file_name)}"
        attached_pdfs.append({"url": pdf_url, "label": "Download source PDF"})

    # Build EnforcementCase object
    case: Dict[str, Any] = {
        "id": str(row.get("id")),
        "company": company,
        "companyDescription": company_desc,
        "companyLongDescription": company_long,
        "caseDescription": summary or outcome or "",
        "country": "",  # could be inferred later
        "sector": sector,
        "foundingYear": founding_year,
        "companyWorth": company_worth,
        "jurisdiction": jurisdiction,
        "fineAmount": penalty_amount or 0,
        "fineDisplay": fine_display,
        "violationSummary": violation_notes or summary,
        "violations": violations,
        "severityForIndividuals": severity,
        "impactedPopulation": 0,
        "impactedIndividuals": impacted_individuals,
        "year": int(year) if isinstance(year, int) else 0,
        "complaintYear": int(year) if isinstance(year, int) else 0,
        "views": 0,
        "whatTheyDid": what_they_did,
        "whyTheyWereWrong": why_they_were_wrong,
        "claimsVsReality": claims_clean,
        "regulatoryFindings": regulatory_findings,
        "outcome": outcome,
        "consequences": "",  # could be added to prompt later
        "companyNow": company_now,
        "attachedPDFs": attached_pdfs,
        "outcomeSummary": outcome_summary_short,
        "dataType": data_types,
        "legalBasisViolated": [str(b).strip() for b in legal_bases if str(b).strip()],
        "enforcementStrategy": [str(o).strip() for o in enforcement_outcomes if str(o).strip()],
    }
    return case


def main() -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set; configure it in .env for export_to_frontend.py")

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM cases ORDER BY year DESC NULLS LAST, processed_at DESC NULLS LAST, id")
            rows = cur.fetchall()

        cases: List[Dict[str, Any]] = []
        for row in rows:
            try:
                cases.append(build_case(dict(row)))
            except Exception as e:
                # Skip bad rows but continue
                print(f"Skipping row id={row.get('id')} due to error: {e}")

        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(json.dumps(cases, indent=2), encoding="utf-8")
        print(f"Wrote {len(cases)} cases to {OUT_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

