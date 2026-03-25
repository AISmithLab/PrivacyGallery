"""
One-time migration: seed jurisdictions table and link existing cases to new pipeline tables.

Usage:
    python -m pipeline.migrate

Idempotent — safe to run multiple times.
"""

from __future__ import annotations

import json
import logging

from pipeline.db import get_conn, init_schema

log = logging.getLogger(__name__)

# ── Jurisdiction seed data ───────────────────────────────────────────────────

JURISDICTIONS = [
    {
        "id": "us_ftc",
        "display_name": "US FTC",
        "country": "US",
        "regulator": "Federal Trade Commission",
        "base_url": "https://www.ftc.gov",
        "case_list_url": "https://www.ftc.gov/legal-library/browse/cases-proceedings",
        "document_types": ["pdf"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
    {
        "id": "us_ca_doj",
        "display_name": "California DOJ",
        "country": "US",
        "regulator": "California Department of Justice",
        "base_url": "https://oag.ca.gov",
        "case_list_url": "https://oag.ca.gov/privacy/privacy-enforcement-actions",
        "document_types": ["pdf", "html"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
    {
        "id": "uk_ico",
        "display_name": "UK ICO",
        "country": "UK",
        "regulator": "Information Commissioner's Office",
        "base_url": "https://ico.org.uk",
        "case_list_url": "https://ico.org.uk/action-weve-taken/enforcement/",
        "document_types": ["pdf"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
    {
        "id": "sg_pdpc",
        "display_name": "Singapore PDPC",
        "country": "Singapore",
        "regulator": "Personal Data Protection Commission",
        "base_url": "https://www.pdpc.gov.sg",
        "case_list_url": "https://www.pdpc.gov.sg/all-commissions-decisions",
        "document_types": ["pdf"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
    {
        "id": "eu_gdpr",
        "display_name": "EU GDPR",
        "country": "EU",
        "regulator": "National Data Protection Authorities",
        "base_url": "https://www.enforcementtracker.com",
        "case_list_url": "https://www.enforcementtracker.com/statistics.html",
        "document_types": ["pdf", "html"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
    {
        "id": "eu_edpb",
        "display_name": "EU EDPB",
        "country": "EU",
        "regulator": "European Data Protection Board",
        "base_url": "https://www.edpb.europa.eu",
        "case_list_url": "https://www.edpb.europa.eu/our-work-tools/consistency-findings_en",
        "document_types": ["pdf"],
        "access_method": "scrape",
        "crawl_frequency": "monthly",
    },
    {
        "id": "au_oaic",
        "display_name": "Australia OAIC",
        "country": "Australia",
        "regulator": "Office of the Australian Information Commissioner",
        "base_url": "https://www.oaic.gov.au",
        "case_list_url": "https://www.oaic.gov.au/privacy/privacy-decisions",
        "document_types": ["html", "pdf"],
        "access_method": "scrape",
        "crawl_frequency": "weekly",
    },
]

# Map from display_name (as stored in cases.jurisdiction via norm_jurisdiction) to jurisdiction id
DISPLAY_TO_ID = {j["display_name"]: j["id"] for j in JURISDICTIONS}

# Fuzzy mapping for raw jurisdiction strings in the DB
_JURISDICTION_MAP = {
    "ftc": "us_ftc",
    "federal trade commission": "us_ftc",
    "usa/ftc": "us_ftc",
    "us ftc": "us_ftc",
    "california": "us_ca_doj",
    "ccpa": "us_ca_doj",
    "california doj": "us_ca_doj",
    "ico": "uk_ico",
    "uk/ico": "uk_ico",
    "uk ico": "uk_ico",
    "information commissioner": "uk_ico",
    "singapore": "sg_pdpc",
    "pdpa": "sg_pdpc",
    "singapore pdpc": "sg_pdpc",
    "singapore/pdpa": "sg_pdpc",
    "edpb": "eu_edpb",
    "eu edpb": "eu_edpb",
    "gdpr": "eu_gdpr",
    "eu/gdpr": "eu_gdpr",
    "eu gdpr": "eu_gdpr",
    "oaic": "au_oaic",
    "australia": "au_oaic",
    "australia oaic": "au_oaic",
    "australia/oaic": "au_oaic",
}


def resolve_jurisdiction_id(raw: str | None) -> str:
    """Map a raw jurisdiction string to a jurisdiction ID."""
    if not raw:
        return "us_ftc"
    lower = raw.strip().lower()
    # Exact match first
    if lower in _JURISDICTION_MAP:
        return _JURISDICTION_MAP[lower]
    # Substring match
    for key, jid in _JURISDICTION_MAP.items():
        if key in lower:
            return jid
    return "us_ftc"


def seed_jurisdictions():
    """Insert jurisdiction rows (ON CONFLICT skip)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            for j in JURISDICTIONS:
                cur.execute(
                    """INSERT INTO jurisdictions
                       (id, display_name, country, regulator, base_url, case_list_url,
                        document_types, access_method, crawl_frequency)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id) DO NOTHING""",
                    (
                        j["id"],
                        j["display_name"],
                        j["country"],
                        j["regulator"],
                        j["base_url"],
                        j.get("case_list_url"),
                        j.get("document_types", ["pdf"]),
                        j.get("access_method", "direct"),
                        j.get("crawl_frequency", "weekly"),
                    ),
                )
        conn.commit()
    log.info(f"Seeded {len(JURISDICTIONS)} jurisdictions")


def link_existing_cases():
    """
    For each existing row in `cases`, create a discovered_documents entry
    and update cases.document_id to point to it.

    Skips cases that already have a document_id set.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Find cases not yet linked
            cur.execute(
                "SELECT id, file_name, file_hash, jurisdiction, raw_json "
                "FROM cases WHERE document_id IS NULL ORDER BY id"
            )
            rows = cur.fetchall()

        if not rows:
            log.info("No unlinked cases to migrate")
            return

        linked = 0
        with conn.cursor() as cur:
            for case_id, file_name, file_hash, jurisdiction_raw, raw_json in rows:
                data = {}
                if raw_json:
                    if isinstance(raw_json, str):
                        try:
                            data = json.loads(raw_json)
                        except Exception:
                            data = {}
                    elif isinstance(raw_json, dict):
                        data = raw_json

                jid = resolve_jurisdiction_id(
                    data.get("jurisdiction") or jurisdiction_raw
                )
                source_url = (data.get("case_source_url") or "").strip()
                case_title = data.get("case_name") or ""
                # Use file_name as a pseudo document_url for legacy cases
                doc_url = source_url if source_url.startswith("http") else f"legacy://{file_name}"

                # Insert into discovered_documents
                cur.execute(
                    """INSERT INTO discovered_documents
                       (jurisdiction_id, case_title, source_page_url, document_url,
                        file_type, document_hash, status, discovered_at)
                       VALUES (%s, %s, %s, %s, 'pdf', %s, 'exported', NOW())
                       ON CONFLICT (jurisdiction_id, document_url) DO UPDATE
                           SET case_title = EXCLUDED.case_title
                       RETURNING id""",
                    (jid, case_title, source_url or None, doc_url, file_hash),
                )
                dd_id = cur.fetchone()[0]

                # Link the case
                cur.execute(
                    "UPDATE cases SET document_id = %s, extraction_version = 'legacy_v1' WHERE id = %s",
                    (dd_id, case_id),
                )
                linked += 1

        conn.commit()
        log.info(f"Linked {linked} existing cases to discovered_documents")


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    log.info("Initialising schema...")
    init_schema()

    log.info("Seeding jurisdictions...")
    seed_jurisdictions()

    log.info("Linking existing cases...")
    link_existing_cases()

    log.info("Migration complete.")


if __name__ == "__main__":
    main()
