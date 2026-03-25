"""
Write validated extraction + enrichment data to the cases table.

Merges Phase 1 and Phase 2 data into the same format that agent.py used,
maintaining full backward compatibility with the existing cases schema.
"""

from __future__ import annotations

import json
import logging

from pipeline.db import get_conn
from pipeline.validation.validator import validate_case

log = logging.getLogger(__name__)

INSERT_SQL = """
INSERT INTO cases (
    file_name, file_hash, case_name, jurisdiction, year, company, sector,
    data_types, summary, violation_type, violation_notes, legal_bases_violated,
    enforcement_outcomes, penalty_amount_usd, penalty_original,
    individuals_affected, outcome, raw_json, document_id, extraction_version
) VALUES (
    %(file_name)s, %(file_hash)s, %(case_name)s, %(jurisdiction)s, %(year)s,
    %(company)s, %(sector)s, %(data_types)s, %(summary)s, %(violation_type)s,
    %(violation_notes)s, %(legal_bases_violated)s, %(enforcement_outcomes)s,
    %(penalty_amount_usd)s, %(penalty_original)s, %(individuals_affected)s,
    %(outcome)s, %(raw_json)s, %(document_id)s, %(extraction_version)s
)
ON CONFLICT (file_hash) DO UPDATE SET
    processed_at         = NOW(),
    case_name            = EXCLUDED.case_name,
    jurisdiction         = EXCLUDED.jurisdiction,
    year                 = EXCLUDED.year,
    company              = EXCLUDED.company,
    sector               = EXCLUDED.sector,
    data_types           = EXCLUDED.data_types,
    summary              = EXCLUDED.summary,
    violation_type       = EXCLUDED.violation_type,
    violation_notes      = EXCLUDED.violation_notes,
    legal_bases_violated = EXCLUDED.legal_bases_violated,
    enforcement_outcomes = EXCLUDED.enforcement_outcomes,
    penalty_amount_usd   = EXCLUDED.penalty_amount_usd,
    penalty_original     = EXCLUDED.penalty_original,
    individuals_affected = EXCLUDED.individuals_affected,
    outcome              = EXCLUDED.outcome,
    raw_json             = EXCLUDED.raw_json,
    document_id          = EXCLUDED.document_id,
    extraction_version   = EXCLUDED.extraction_version;
"""


def merge_phase_data(phase1: dict, phase2: dict | None) -> dict:
    """
    Merge Phase 1 extraction and Phase 2 enrichment into a single data dict.
    Phase 2 fields overwrite Phase 1 where they exist.
    """
    merged = dict(phase1)
    if phase2:
        # Phase 2 enrichment fields
        for key in (
            "what_they_did", "why_they_were_wrong",
            "company_synopsis", "company_long_description",
            "company_worth", "founding_year", "company_now",
            "claims_vs_reality",
        ):
            if phase2.get(key):
                merged[key] = phase2[key]

        # Use enrichment estimate for individuals if Phase 1 had 0
        if (not merged.get("individuals_affected") or merged["individuals_affected"] == 0):
            estimate = phase2.get("impacted_individuals_estimate")
            if estimate:
                merged["individuals_affected"] = estimate

        # Apply sector correction from Phase 2 if provided
        if phase2.get("sector_corrected"):
            merged["sector"] = phase2["sector_corrected"]

        # Apply outcome_summary_short from Phase 2 if Phase 1 left it empty
        if not merged.get("outcome_summary_short") and phase2.get("outcome_summary_short"):
            merged["outcome_summary_short"] = phase2["outcome_summary_short"]

    return merged


def save_to_cases(document_id: int, file_name: str, file_hash: str,
                  phase1_data: dict, phase2_data: dict | None = None,
                  extraction_version: str = "v2.0") -> bool:
    """
    Save merged extraction data to the cases table.

    Returns True on success, False on validation failure.
    """
    merged = merge_phase_data(phase1_data, phase2_data)

    # Validate before saving
    warnings = validate_case(merged)
    if not merged.get("company"):
        log.error(f"Cannot save doc {document_id}: missing company name")
        return False

    row = {
        "file_name": file_name,
        "file_hash": file_hash,
        "case_name": merged.get("case_name"),
        "jurisdiction": merged.get("jurisdiction"),
        "year": merged.get("year"),
        "company": merged.get("company"),
        "sector": merged.get("sector"),
        "data_types": merged.get("data_types"),
        "summary": merged.get("summary"),
        "violation_type": merged.get("violation_type"),
        "violation_notes": merged.get("violation_notes"),
        "legal_bases_violated": json.dumps(merged.get("legal_bases_violated", [])),
        "enforcement_outcomes": json.dumps(merged.get("enforcement_outcomes", [])),
        "penalty_amount_usd": merged.get("penalty_amount_usd"),
        "penalty_original": merged.get("penalty_original"),
        "individuals_affected": merged.get("individuals_affected"),
        "outcome": merged.get("outcome"),
        "raw_json": json.dumps(merged),
        "document_id": document_id,
        "extraction_version": extraction_version,
    }

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(INSERT_SQL, row)
        conn.commit()

    log.info(f"Saved to cases: {merged.get('company')} | {merged.get('jurisdiction')}")
    return True


def save_pending(jurisdiction_id: str | None = None, limit: int | None = None) -> int:
    """
    Save all enriched documents to the cases table.

    Returns count of cases saved.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            query = """
                SELECT dd.id, dd.jurisdiction_id, rd.file_name, rd.file_hash,
                       er1.extracted_data AS phase1_data,
                       er2.extracted_data AS phase2_data
                FROM discovered_documents dd
                JOIN raw_documents rd ON rd.document_id = dd.id
                JOIN extraction_runs er1 ON er1.document_id = dd.id
                    AND er1.phase = 'extraction' AND er1.status = 'success'
                LEFT JOIN extraction_runs er2 ON er2.document_id = dd.id
                    AND er2.phase = 'enrichment' AND er2.status = 'success'
                WHERE dd.status IN ('enriched', 'extracted')
                  AND NOT EXISTS (
                      SELECT 1 FROM cases c WHERE c.document_id = dd.id
                  )
            """
            params: list = []
            if jurisdiction_id:
                query += " AND dd.jurisdiction_id = %s"
                params.append(jurisdiction_id)
            query += " ORDER BY dd.id"
            if limit:
                query += " LIMIT %s"
                params.append(limit)
            cur.execute(query, params)
            rows = cur.fetchall()

    count = 0
    for doc_id, jid, file_name, file_hash, p1_data, p2_data in rows:
        p1 = p1_data if isinstance(p1_data, dict) else json.loads(p1_data) if p1_data else {}
        p2 = p2_data if isinstance(p2_data, dict) else json.loads(p2_data) if p2_data else None

        if save_to_cases(doc_id, file_name, file_hash, p1, p2):
            _update_doc_status(doc_id, "exported")
            count += 1

    return count


def _update_doc_status(document_id: int, status: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE discovered_documents SET status = %s WHERE id = %s",
                (status, document_id),
            )
        conn.commit()
