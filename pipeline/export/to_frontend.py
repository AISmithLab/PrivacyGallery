"""
Export cases from PostgreSQL to generatedCases.json for the React frontend.

Refactored from files/export_to_frontend.py — preserves the exact build_case()
logic and JSON output format so the frontend needs zero changes.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

import psycopg2
import psycopg2.extras

from pipeline.config import DATABASE_URL, FRONTEND_JSON_PATH, MAX_SUMMARY_CHARS
from pipeline.validation.normalizer import (
    norm_jurisdiction,
    norm_sector,
    map_violation_type,
    format_impacted,
    severity_from_impact_and_data,
)

log = logging.getLogger(__name__)

# ── Text truncation (same as export_to_frontend.py) ──────────────────────────


def _strip_trailing_conjunction(text: str) -> str:
    for bad in (", and", ", or", ", but", " and", " or", " but"):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[: -len(bad)].rstrip()
            if text.endswith(","):
                text = text[:-1].rstrip()
    for bad in (
        " of.", " user.", " approximately", " from", " to", " in", " on",
        " for", " with", " without", " by", " of", " regardless of",
        " user", " the", " a", " an",
    ):
        while text.rstrip().endswith(bad):
            text = text.rstrip()[: -len(bad)].rstrip()
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


# ── Build case (preserved from export_to_frontend.py) ────────────────────────


def build_case(row: Dict[str, Any]) -> Dict[str, Any]:
    """Build an EnforcementCase dict from a cases DB row. Exact copy of original logic."""
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
            act = (lf.get("act") or "").strip()
            desc = (lf.get("description") or "").strip()
            vios = lf.get("violations") or []
            if isinstance(vios, str):
                vios = [vios]
            if not isinstance(vios, list):
                vios = []
            vios_clean = [str(v).strip() for v in vios if str(v).strip()]
            regulatory_findings.append({
                "act": act,
                "description": desc or (vios_clean[0] if vios_clean else ""),
                "violations": vios_clean,
            })
    if not regulatory_findings and legal_bases:
        for lb in legal_bases:
            regulatory_findings.append({
                "act": str(lb).strip(),
                "description": (violation_notes or summary or "").strip(),
                "violations": [violation_notes or summary] if (violation_notes or summary) else [],
            })

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
    violations = map_violation_type(violation_type, data_types)
    impacted_individuals = format_impacted(individuals_int) if (individuals_int and individuals_int > 0) else "Unknown"
    severity = severity_from_impact_and_data(individuals_int, data_types)

    # Fine display logic
    if penalty_total_display:
        fine_display = penalty_total_display.strip()
    elif penalty_original and ("=" in penalty_original or "total" in penalty_original.lower()):
        parts = penalty_original.split("=")
        if len(parts) >= 2:
            fine_display = parts[-1].replace("total", "").strip().strip(".")
        else:
            fine_display = penalty_original.strip()
    else:
        fine_display = penalty_original.strip() if penalty_original else ""
    if not fine_display and penalty_amount and penalty_amount > 0:
        fine_display = f"${penalty_amount:,.0f}"
    if not fine_display:
        fine_display = "No fine"
    if fine_display and fine_display != "No fine" and "S$" in fine_display:
        fine_display = fine_display.replace("S$", "SGD ").strip()

    # Attached PDFs / case source URL
    file_name = row.get("file_name") or ""
    attached_pdfs: List[Dict[str, Any]] = []
    # Try raw_json first, then fall back to discovered_documents.source_page_url,
    # then fall back to discovered_documents.document_url
    case_source_url = (data.get("case_source_url") or "").strip()
    if not case_source_url:
        case_source_url = (row.get("discovered_source_url") or "").strip()
    if not case_source_url:
        case_source_url = (row.get("discovered_document_url") or "").strip()
    _bad = ("/news-events/", "/press-releases/", "/news/")
    _skip_url = False
    if case_source_url and case_source_url.startswith("http"):
        if any(b in case_source_url.lower() for b in _bad):
            _skip_url = True
        # Skip generic listing pages (not a specific case page)
        elif case_source_url.rstrip("/").endswith("/cases-proceedings"):
            _skip_url = True
        elif "ftc.gov" in case_source_url.lower() and "legal-library" not in case_source_url.lower() and "cases-proceedings" not in case_source_url.lower() and "/system/files/" not in case_source_url.lower():
            _skip_url = True
    # If source_page_url was a generic listing or bad, fall back to direct document URL
    if _skip_url or not case_source_url or not case_source_url.startswith("http"):
        doc_url = (row.get("discovered_document_url") or "").strip()
        if doc_url and doc_url.startswith("http"):
            case_source_url = doc_url
            _skip_url = False
    if case_source_url and case_source_url.startswith("http") and not _skip_url:
        # Use "View document" label for direct file links, "View case on X" for case pages
        is_direct_file = any(case_source_url.lower().endswith(ext) for ext in (".pdf", ".docx", ".doc"))
        if is_direct_file:
            source_label = "View enforcement document"
        else:
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

    case: Dict[str, Any] = {
        "id": str(row.get("id")),
        "company": company,
        "companyDescription": company_desc,
        "companyLongDescription": company_long,
        "caseDescription": summary or outcome or "",
        "country": "",
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
        "consequences": "",
        "companyNow": company_now,
        "attachedPDFs": attached_pdfs,
        "outcomeSummary": outcome_summary_short,
        "dataType": data_types,
        "legalBasisViolated": [str(b).strip() for b in legal_bases if str(b).strip()],
        "enforcementStrategy": [str(o).strip() for o in enforcement_outcomes if str(o).strip()],
    }
    return case


# ── Export entry point ───────────────────────────────────────────────────────


def export_to_json(output_path: str | None = None) -> int:
    """
    Query all cases from PostgreSQL and write generatedCases.json.

    Returns count of cases exported.
    """
    from pathlib import Path

    out = Path(output_path) if output_path else FRONTEND_JSON_PATH

    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT c.*, dd.source_page_url AS discovered_source_url,
                       dd.document_url AS discovered_document_url
                FROM cases c
                LEFT JOIN discovered_documents dd ON c.document_id = dd.id
                ORDER BY c.year DESC NULLS LAST, c.processed_at DESC NULLS LAST, c.id
            """)
            rows = [dict(r) for r in cur.fetchall()]

        cases: List[Dict[str, Any]] = []
        for row in rows:
            try:
                cases.append(build_case(row))
            except Exception as e:
                log.warning(f"Skipping row id={row.get('id')}: {e}")

        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(cases, indent=2), encoding="utf-8")
        log.info(f"Exported {len(cases)} cases to {out}")
        return len(cases)
    finally:
        conn.close()
