"""
Fill company_worth and founding_year for cases where they're missing or "Unknown"
=================================================================================
Calls Claude with company name to infer valuation and founding year from public knowledge.
Only updates company_worth and founding_year; does not touch what_they_did or why_they_were_wrong.

Usage:
    cd files
    python fill_company_worth.py

Optional env:
    FILL_LIMIT=N  - process only first N cases with missing data
    FILL_DRY=1    - don't write to DB, just print
"""

import json
import os

import anthropic
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/privacy_cases")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("REVISE_MODEL", "claude-haiku-4-5")
FILL_LIMIT = os.getenv("FILL_LIMIT")
FILL_CASE_IDS = os.getenv("FILL_CASE_IDS")  # e.g. "1,2,3,4,5,6,7,8,9,10"
FILL_DRY = os.getenv("FILL_DRY", "").lower() in ("1", "true", "yes")

PROMPT = """Given this company/organisation from a privacy enforcement case, provide valuation and founding year.

Company: {company}
Sector: {sector}
Jurisdiction: {jurisdiction}

Return ONLY a valid JSON object:
{{
  "company_worth": "Market cap, revenue, or valuation e.g. '$24B', '€500M'. Use parent valuation for subsidiaries. Use 'Unknown' if truly obscure.",
  "founding_year": 1998
}}

Use founding_year as integer (year founded). Use null if unknown.
"""


def infer_info(company: str, sector: str, jurisdiction: str) -> tuple[str, int | None]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    prompt = PROMPT.format(
        company=company or "?",
        sector=sector or "unknown",
        jurisdiction=jurisdiction or "unknown",
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=256,
        system="Return ONLY a valid JSON object — no markdown, no explanation.",
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    data = json.loads(raw)
    worth = (data.get("company_worth") or "").strip()
    fy = data.get("founding_year")
    if fy is not None:
        try:
            fy = int(fy)
        except (TypeError, ValueError):
            fy = None
    return (worth, fy)


def main():
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    if not DB_URL:
        raise RuntimeError("DATABASE_URL not set")

    limit = int(FILL_LIMIT) if FILL_LIMIT and FILL_LIMIT.isdigit() else None
    if FILL_DRY:
        print("DRY RUN — no DB updates")

    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT id, raw_json FROM cases ORDER BY id")
            rows = cur.fetchall()

        # Filter to cases with missing company_worth or founding_year
        case_ids = None
        if FILL_CASE_IDS:
            case_ids = [int(x.strip()) for x in FILL_CASE_IDS.split(",") if x.strip().isdigit()]
        to_process = []
        for row in rows:
            rid = row["id"]
            if case_ids and rid not in case_ids:
                continue
            raw = row.get("raw_json")
            data = json.loads(raw) if isinstance(raw, str) else (raw or {})
            worth = (data.get("company_worth") or "").strip()
            fy = data.get("founding_year") or 0
            try:
                fy = int(fy) if fy else 0
            except (TypeError, ValueError):
                fy = 0
            need_worth = not worth or worth.lower() in ("unknown", "—", "-")
            need_founding = fy == 0
            if (case_ids and rid in case_ids) or (not case_ids and (need_worth or need_founding)):
                to_process.append((rid, data))

        if limit and not case_ids:
            to_process = to_process[:limit]
        total = len(to_process)
        print(f"Filling company_worth and founding_year for {total} cases")

        updated = 0
        for rid, data in to_process:
            company = data.get("company") or "?"
            sector = data.get("sector") or ""
            jurisdiction = data.get("jurisdiction") or ""
            try:
                new_worth, new_fy = infer_info(company, sector, jurisdiction)
                changed = False
                if new_worth and new_worth.lower() != "unknown":
                    data["company_worth"] = new_worth
                    changed = True
                if new_fy and new_fy > 0:
                    data["founding_year"] = new_fy
                    changed = True
                if changed:
                    if not FILL_DRY:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE cases SET raw_json = %s WHERE id = %s",
                                (json.dumps(data), rid),
                            )
                        conn.commit()
                    updated += 1
                    parts = []
                    if new_worth and new_worth.lower() != "unknown":
                        parts.append(f"worth={new_worth}")
                    if new_fy:
                        parts.append(f"founded={new_fy}")
                    print(f"  [{rid}] {company}: {', '.join(parts)}")
                else:
                    print(f"  [{rid}] {company}: still unknown")
            except Exception as e:
                print(f"  [{rid}] {company}: error — {e}")

        print(f"\nDone. Updated {updated} cases.")
        if updated and not FILL_DRY:
            print("Run: python export_to_frontend.py  # to refresh frontend")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
