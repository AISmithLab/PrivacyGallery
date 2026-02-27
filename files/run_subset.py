"""
Full pipeline: agent (PDF extraction) → fill URLs → export to frontend
======================================================================
Steps:
  1. agent.py          — extract N new PDFs from inbox/ into DB
  2. fill_case_source_url.py — find working webpage URLs for newly added cases
  3. export_to_frontend.py  — write generatedCases.json (with PDF download links if PDF_SERVER_URL set)

Usage:
    cd files
    python3 run_subset.py            # process 10 new PDFs (default)
    SUBSET=50 python3 run_subset.py  # process 50 new PDFs
    SUBSET=0  python3 run_subset.py  # process ALL PDFs in inbox

Env:
    SUBSET=N   - number of new PDFs to process from inbox/ (default: 10; 0 = all)
    DRY=1      - don't write to DB or export (dry run)
"""

import os
import subprocess
import sys
import time

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

SUBSET_RAW = os.getenv("SUBSET", "10")
SUBSET = 0 if str(SUBSET_RAW).lower() in ("0", "all", "full") else int(SUBSET_RAW)
DRY = os.getenv("DRY", "").lower() in ("1", "true", "yes")
DB_URL = os.getenv("DATABASE_URL")


def get_existing_ids() -> set[int]:
    """Return all case IDs currently in the DB (before agent runs)."""
    if not DB_URL:
        return set()
    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM cases")
            return {r[0] for r in cur.fetchall()}
    finally:
        conn.close()


def get_new_ids(before: set[int]) -> list[int]:
    """Return IDs that were added since before."""
    if not DB_URL:
        return []
    conn = psycopg2.connect(DB_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM cases ORDER BY id")
            all_ids = {r[0] for r in cur.fetchall()}
        return sorted(all_ids - before)
    finally:
        conn.close()


def run(cmd: list[str], env: dict | None = None) -> int:
    e = os.environ.copy()
    if env:
        e.update(env)
    r = subprocess.run(cmd, cwd=os.path.dirname(__file__), env=e)
    return r.returncode


def main():
    label = f"{SUBSET} PDFs" if SUBSET else "ALL PDFs"
    print(f"=== Privacy Gallery Pipeline — {label} (DRY={DRY}) ===\n")

    # Step 1: agent.py — extract new PDFs
    print("1. agent.py (PDF extraction)...")
    before_ids = get_existing_ids()
    agent_env: dict[str, str] = {}
    if SUBSET:
        agent_env["MAX_PDFS"] = str(SUBSET)
    if DRY:
        print("   [DRY] skipping agent.py")
    else:
        if run(["python3", "agent.py"], agent_env) != 0:
            sys.exit(1)

    new_ids = get_new_ids(before_ids)
    if not new_ids and not DRY:
        print("\nNo new cases added (inbox may be empty). Nothing to do.")
        return
    if new_ids:
        print(f"   → {len(new_ids)} new cases added: IDs {new_ids[:5]}{'...' if len(new_ids) > 5 else ''}")

    new_ids_str = ",".join(str(i) for i in new_ids) if new_ids else ""

    revise_env: dict[str, str] = {}
    if new_ids_str:
        revise_env["REVISE_CASE_IDS"] = new_ids_str
    if DRY:
        revise_env["REVISE_DRY"] = "1"

    url_env: dict[str, str] = {}
    if new_ids_str:
        url_env["FILL_CASE_IDS"] = new_ids_str
    if DRY:
        url_env["FILL_DRY"] = "1"

    # Step 2: revise_what_why.py — improve/expand short or generic what/why fields
    print("\n2. revise_what_why.py (quality-check what/why, expand short content)...")
    if run(["python3", "revise_what_why.py"], revise_env) != 0:
        sys.exit(1)

    # Step 3: fill_case_source_url.py — webpage links for new cases
    print("\n3. fill_case_source_url.py (webpage links)...")
    if run(["python3", "fill_case_source_url.py"], url_env) != 0:
        sys.exit(1)

    # Step 4: export_to_frontend.py — update generatedCases.json
    if not DRY:
        print("\n4. export_to_frontend.py (update frontend)...")
        if run(["python3", "export_to_frontend.py"]) != 0:
            sys.exit(1)
        print(f"\n✓ Done. {len(new_ids)} new cases added and exported to frontend.")
        print("  If PDF download links are missing, make sure the PDF server is running:")
        print("  cd files/processed && python3 -m http.server 8765")
    else:
        print("\nDRY run complete — no DB writes, no export.")


if __name__ == "__main__":
    main()
