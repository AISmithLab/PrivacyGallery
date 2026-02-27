"""
Privacy Case PDF Agent
======================
Watches an input folder for PDF files, sends them to Claude for structured
extraction, and stores results in PostgreSQL.

Requirements:
    pip install anthropic watchdog psycopg2-binary

Usage:
    python agent.py

Config via .env file (see .env.example)
"""

import os
import re
import time
import json
import base64
import logging
import hashlib
from pathlib import Path
from datetime import datetime

import anthropic
import psycopg2
import psycopg2.extras
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("agent.log"),
    ],
)
log = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────

# Default paths are under the files/ folder so inbox/, processed/, errors/ live here
_AGENT_DIR = Path(__file__).resolve().parent
WATCH_DIR   = Path(os.getenv("WATCH_DIR", str(_AGENT_DIR / "inbox")))
DONE_DIR    = Path(os.getenv("DONE_DIR",  str(_AGENT_DIR / "processed")))
ERROR_DIR   = Path(os.getenv("ERROR_DIR", str(_AGENT_DIR / "errors")))
DB_URL      = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/privacy_cases")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL       = "claude-haiku-4-5"  # Haiku 4.5 — fast, cost-efficient
# Optional: process only this many PDFs then exit (saves credits). Unset = process all, then watch.
_MAX_PDFS   = os.getenv("MAX_PDFS")
MAX_PDFS    = int(_MAX_PDFS) if (_MAX_PDFS and _MAX_PDFS.isdigit()) else None

# ── Extraction prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a legal research assistant specialising in privacy law and data 
protection enforcement cases. You extract structured information from legal documents, 
regulatory decisions, and enforcement notices with precision.

Always return ONLY a valid JSON object — no markdown, no explanation, no preamble."""

EXTRACTION_PROMPT = """Analyse this legal/regulatory document and extract the following fields.
Return ONLY a valid JSON object with exactly these keys.

IMPORTANT: Do not leave null for fine, num impacted, founding year, or company_worth if you can infer or estimate from the document or reasonable public knowledge. Use an estimate, "Unknown", or outcome_summary_short (e.g. Consent order) so the UI is never blank.

Keep "what_they_did" and "why_they_were_wrong" to a maximum of 195 characters each. Summarize and condense — do not cut off mid-sentence.
Use "penalty_total_display" for the total fine only (e.g. "€1,380,000" or "$520,000") — no breakdown by article. If no monetary fine, use null for penalty fields and set outcome_summary_short (e.g. "Consent order", "No penalty").

{
  "case_name":              "Official case name or docket number (string or null)",
  "jurisdiction":           "e.g. EU/GDPR, USA/FTC, California/CCPA, UK/ICO, Singapore/PDPA (string)",
  "year":                   "Year of decision/enforcement action (integer or null)",
  "company":                "Respondent company or organisation name (string)",
  "sector":                 "Industry sector — e.g. Healthcare, Advertising/AdTech, Finance, Social Media, Retail, Telecom, Education (string)",
  "data_types":             "Types of personal data involved — e.g. health data, location, financial, biometric (string)",
  "founding_year":          "Year company was founded (integer or null). CRITICAL: Infer from document or public knowledge whenever possible. Use your knowledge of well-known companies (e.g. Meta=2004, Google=1998). Do not leave null if inferable.",

  "summary":                "2-3 sentence plain-English summary of what went wrong (string)",
  "what_they_did":          "What the company/organisation did (string, max 195 chars). Summarize to fit — no truncation.",
  "why_they_were_wrong":     "Why this was wrong under the law (string, max 195 chars). CRITICAL: Must be 100% company-specific — describe what THIS company exposed, harmed, or failed to protect. NEVER start with 'Section X requires...', 'The Act prohibits...', or any description of what the law says. Instead write what actually happened to real people because of this company's failure. E.g. 'X million users' financial data was left exposed because the company ignored known vulnerabilities for 18 months.' Summarize to fit — no truncation.",

  "violation_type":         "Primary category from Solove Privacy Taxonomy (string). Must be one of:
                               'Information Collection – Surveillance',
                               'Information Collection – Interrogation',
                               'Information Processing – Aggregation',
                               'Information Processing – Identification',
                               'Information Processing – Insecurity',
                               'Information Processing – Secondary Use',
                               'Information Processing – Exclusion',
                               'Information Dissemination – Breach of Confidentiality',
                               'Information Dissemination – Disclosure',
                               'Information Dissemination – Exposure',
                               'Information Dissemination – Increased Accessibility',
                               'Information Dissemination – Blackmail',
                               'Information Dissemination – Appropriation',
                               'Information Dissemination – Distortion',
                               'Invasion – Intrusion',
                               'Invasion – Decisional Interference'",

  "violation_notes":        "Brief explanation of why this Solove category applies (string)",

  "legal_bases_violated":   ["Array of specific provisions — e.g. 'GDPR Art. 5(1)(f)', 'GDPR Art. 32', 'FTC Act Section 5', 'CCPA §1798.120', 'PDPA s.24'"],

  "enforcement_outcomes":   ["Array — only include applicable items from:
                               'Monetary Penalty',
                               'Compliance Order',
                               'Processing Restriction',
                               'Structural Reform',
                               'Monitoring',
                               'Criminal Referral'"],

  "penalty_amount_usd":     "Monetary penalty normalised to USD (number or null). If no fine, use null.",
  "penalty_original":       "Penalty in original currency as stated (string or null). If no fine, use null.",
  "penalty_total_display":  "Total fine only — e.g. '€1,380,000' or '$520,000'. If no monetary fine, use null (outcome_summary_short will be shown instead). (string or null)",

  "individuals_affected":   "Number of individuals affected (integer). Estimate from document when possible (e.g. '4.6 million' -> 4600000); use 0 only if truly unknown.",

  "legal_findings":        "Array of { \"act\": \"Generic statement of what the law/article requires — NOT case-specific (e.g. 'Section 5(a) prohibits unfair or deceptive acts or practices in or affecting commerce.')\", \"violations\": [\"How this company specifically violated it — case-specific\"] }. Omit 'description'; use act for law text only.",

  "outcome":                "Description of the final resolution, any remediation required, and current status (string)",
  "outcome_summary_short":  "When there is NO monetary fine: 1-2 word consequence (e.g. Consent order, Compliance order, No penalty). When there is a fine, use null. (string or null)",
  "company_now":            "Brief status of the company/organisation today (1-2 sentences, or null if unknown) (string or null)",
  "company_worth":          "Company valuation (string). CRITICAL: Infer from public knowledge whenever possible. Use market cap, revenue, or valuation e.g. '$24B', '€500M', '$1.7T'. For well-known companies (Meta, Google, Amazon, Uber, etc.) use your knowledge. Use parent/subsidiary valuation when the entity itself is private. Use 'Unknown' only if the company is obscure and no public data exists.",
  "company_synopsis":       "Brief company description (1-2 sentences) (string or null)",
  "claims_vs_reality":      "Array of { \"claim\": \"What the company claimed\", \"reality\": \"What was actually true\" } — infer from document where possible.",
  "severity_1_to_5":        "Severity of harm to individuals (integer 1-5, 5 = most severe). WEIGHT BY: (1) Type of data — health, biometric, financial, children = higher; messaging, general browsing = lower. (2) Number impacted — more people = higher. (3) Nature of violations — deception, breach, misuse = higher. Output 1-5."
}

If a field cannot be determined from the document, use null except: prefer an estimate for individuals_affected, outcome_summary_short when no fine, and infer founding_year when possible.
For arrays, use an empty array [] if nothing applies."""


# ── Database ──────────────────────────────────────────────────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS cases (
    id                    SERIAL PRIMARY KEY,
    file_name             TEXT NOT NULL,
    file_hash             TEXT UNIQUE NOT NULL,   -- prevents duplicate processing
    processed_at          TIMESTAMPTZ DEFAULT NOW(),

    case_name             TEXT,
    jurisdiction          TEXT,
    year                  INTEGER,
    company               TEXT,
    sector                TEXT,
    data_types            TEXT,
    summary               TEXT,
    violation_type        TEXT,
    violation_notes       TEXT,
    legal_bases_violated  JSONB,
    enforcement_outcomes  JSONB,
    penalty_amount_usd    NUMERIC,
    penalty_original      TEXT,
    individuals_affected  BIGINT,
    outcome               TEXT,

    raw_json              JSONB       -- full extracted payload for forward-compat
);

CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction ON cases (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_cases_year         ON cases (year);
CREATE INDEX IF NOT EXISTS idx_cases_company      ON cases (company);
CREATE INDEX IF NOT EXISTS idx_cases_sector       ON cases (sector);
"""

INSERT_SQL = """
INSERT INTO cases (
    file_name, file_hash, case_name, jurisdiction, year, company, sector,
    data_types, summary, violation_type, violation_notes, legal_bases_violated,
    enforcement_outcomes, penalty_amount_usd, penalty_original,
    individuals_affected, outcome, raw_json
) VALUES (
    %(file_name)s, %(file_hash)s, %(case_name)s, %(jurisdiction)s, %(year)s,
    %(company)s, %(sector)s, %(data_types)s, %(summary)s, %(violation_type)s,
    %(violation_notes)s, %(legal_bases_violated)s, %(enforcement_outcomes)s,
    %(penalty_amount_usd)s, %(penalty_original)s, %(individuals_affected)s,
    %(outcome)s, %(raw_json)s
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
    raw_json             = EXCLUDED.raw_json;
"""


MAX_SUMMARY_CHARS = 195


def _truncate_to_complete_summary(text: str, max_chars: int = MAX_SUMMARY_CHARS) -> str:
    """Keep complete sentences only, max max_chars. Never cut mid-sentence."""
    if not text or not (t := (text or "").strip()):
        return ""
    if len(t) <= max_chars:
        return t
    sentences = re.split(r"(?<=[.!?])\s+", t)
    result = []
    for s in sentences:
        candidate = " ".join(result + [s]).strip()
        if len(candidate) <= max_chars:
            result.append(s)
        else:
            break
    if result:
        return " ".join(result).strip()
    cut = t[:max_chars]
    last_space = cut.rfind(" ")
    return cut[: last_space + 1].strip() if last_space > max_chars * 0.5 else cut.strip()


def get_db():
    return psycopg2.connect(DB_URL)


def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
        conn.commit()
    log.info("Database schema ready")


def file_already_processed(file_hash: str) -> bool:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM cases WHERE file_hash = %s", (file_hash,))
            return cur.fetchone() is not None


def save_case(file_name: str, file_hash: str, data: dict):
    row = {
        "file_name":            file_name,
        "file_hash":            file_hash,
        "case_name":            data.get("case_name"),
        "jurisdiction":         data.get("jurisdiction"),
        "year":                 data.get("year"),
        "company":              data.get("company"),
        "sector":               data.get("sector"),
        "data_types":           data.get("data_types"),
        "summary":              data.get("summary"),
        "violation_type":       data.get("violation_type"),
        "violation_notes":      data.get("violation_notes"),
        "legal_bases_violated": json.dumps(data.get("legal_bases_violated", [])),
        "enforcement_outcomes": json.dumps(data.get("enforcement_outcomes", [])),
        "penalty_amount_usd":   data.get("penalty_amount_usd"),
        "penalty_original":     data.get("penalty_original"),
        "individuals_affected": data.get("individuals_affected"),
        "outcome":              data.get("outcome"),
        "raw_json":             json.dumps(data),
    }
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(INSERT_SQL, row)
        conn.commit()
    log.info(f"Saved: {data.get('company', '?')} | {data.get('jurisdiction', '?')} | {data.get('year', '?')}")


# ── Claude extraction ─────────────────────────────────────────────────────────

def extract_from_pdf(pdf_path: Path) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    with open(pdf_path, "rb") as f:
        pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

    log.info(f"Sending to Claude: {pdf_path.name}")

    message = client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type":       "base64",
                        "media_type": "application/pdf",
                        "data":       pdf_b64,
                    },
                },
                {
                    "type": "text",
                    "text": EXTRACTION_PROMPT,
                },
            ],
        }],
    )

    raw = message.content[0].text.strip()

    # Strip markdown fences if model adds them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]

    data = json.loads(raw)
    # Enforce 195-char complete-sentence summaries
    if data.get("what_they_did"):
        data["what_they_did"] = _truncate_to_complete_summary(data["what_they_did"])
    if data.get("why_they_were_wrong"):
        data["why_they_were_wrong"] = _truncate_to_complete_summary(data["why_they_were_wrong"])
    return data


# ── File processing ───────────────────────────────────────────────────────────

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def process_pdf(pdf_path: Path):
    if not pdf_path.exists():
        log.warning(f"File no longer present, skipping: {pdf_path}")
        return
    log.info(f"Processing: {pdf_path.name}")

    file_hash = sha256(pdf_path)

    if file_already_processed(file_hash):
        log.info(f"Skipping duplicate: {pdf_path.name}")
        if pdf_path.exists():
            dest = DONE_DIR / pdf_path.name
            if dest.exists():
                dest = DONE_DIR / f"{pdf_path.stem}_{int(time.time())}{pdf_path.suffix}"
            pdf_path.rename(dest)
        return

    try:
        data = extract_from_pdf(pdf_path)
        save_case(pdf_path.name, file_hash, data)

        # Move to processed/
        if not pdf_path.exists():
            log.warning(f"File already gone, skipping move: {pdf_path}")
            return
        dest = DONE_DIR / pdf_path.name
        if dest.exists():
            dest = DONE_DIR / f"{pdf_path.stem}_{int(time.time())}{pdf_path.suffix}"
        pdf_path.rename(dest)
        log.info(f"Done → {dest}")

    except json.JSONDecodeError as e:
        log.error(f"JSON parse error for {pdf_path.name}: {e}")
        if pdf_path.exists():
            dest = ERROR_DIR / pdf_path.name
            if dest.exists():
                dest = ERROR_DIR / f"{pdf_path.stem}_{int(time.time())}{pdf_path.suffix}"
            pdf_path.rename(dest)

    except anthropic.APIError as e:
        log.error(f"Claude API error for {pdf_path.name}: {e}")
        if pdf_path.exists():
            dest = ERROR_DIR / pdf_path.name
            if dest.exists():
                dest = ERROR_DIR / f"{pdf_path.stem}_{int(time.time())}{pdf_path.suffix}"
            pdf_path.rename(dest)

    except Exception as e:
        log.error(f"Unexpected error for {pdf_path.name}: {e}", exc_info=True)
        if pdf_path.exists():
            dest = ERROR_DIR / pdf_path.name
            if dest.exists():
                dest = ERROR_DIR / f"{pdf_path.stem}_{int(time.time())}{pdf_path.suffix}"
            pdf_path.rename(dest)


# ── Folder watcher ────────────────────────────────────────────────────────────

def _path_in_inbox(path: Path) -> bool:
    try:
        path.resolve().relative_to(WATCH_DIR.resolve())
        return True
    except ValueError:
        return False


class PDFHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() != ".pdf" or not _path_in_inbox(path):
            return
        time.sleep(1)
        process_pdf(path)

    def on_moved(self, event):
        """Also catch files moved/copied into the watch dir (including subfolders)."""
        if event.is_directory:
            return
        path = Path(event.dest_path)
        if path.suffix.lower() != ".pdf" or not _path_in_inbox(path):
            return
        time.sleep(1)
        process_pdf(path)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set in environment / .env")

    # Create directories
    for d in (WATCH_DIR, DONE_DIR, ERROR_DIR):
        d.mkdir(parents=True, exist_ok=True)

    init_db()

    # Process any PDFs already in the inbox (including subfolders like Australia - OAIC, EU, etc.)
    existing = [p for p in WATCH_DIR.rglob("*.pdf") if p.exists()]
    if MAX_PDFS is not None:
        existing = existing[:MAX_PDFS]
        log.info(f"MAX_PDFS={MAX_PDFS} — processing only first {len(existing)} PDF(s), then exiting")
    if existing:
        log.info(f"Found {len(existing)} existing PDF(s) in inbox — processing now")
        for pdf in existing:
            process_pdf(pdf)

    if MAX_PDFS is not None:
        log.info("Limit reached. Run export_to_frontend.py then refresh the app.")
        return

    # Watch inbox and all subfolders for new PDFs
    observer = Observer()
    observer.schedule(PDFHandler(), str(WATCH_DIR), recursive=True)
    observer.start()
    log.info(f"Watching: {WATCH_DIR.resolve()}")

    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        observer.stop()
        log.info("Agent stopped")

    observer.join()


if __name__ == "__main__":
    main()
