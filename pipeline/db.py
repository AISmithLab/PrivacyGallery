"""Database connection and schema management."""

from __future__ import annotations

import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras

from pipeline.config import DATABASE_URL

log = logging.getLogger(__name__)

# ── Connection ───────────────────────────────────────────────────────────────


@contextmanager
def get_conn():
    """Yield a psycopg2 connection, closing it on exit."""
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_cursor(conn=None, dict_cursor: bool = False):
    """Yield a cursor (optionally dict-based). Opens its own connection if none given."""
    factory = psycopg2.extras.DictCursor if dict_cursor else None
    if conn is not None:
        with conn.cursor(cursor_factory=factory) as cur:
            yield cur
    else:
        with get_conn() as c:
            with c.cursor(cursor_factory=factory) as cur:
                yield cur
            c.commit()


# ── Schema ───────────────────────────────────────────────────────────────────

NEW_TABLES_SQL = """
-- Jurisdiction registry
CREATE TABLE IF NOT EXISTS jurisdictions (
    id              TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    country         TEXT NOT NULL,
    regulator       TEXT NOT NULL,
    base_url        TEXT NOT NULL,
    case_list_url   TEXT,
    document_types  TEXT[] DEFAULT '{pdf}',
    access_method   TEXT DEFAULT 'direct',
    crawl_frequency TEXT DEFAULT 'weekly',
    enabled         BOOLEAN DEFAULT TRUE,
    config_json     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Document discovery log
CREATE TABLE IF NOT EXISTS discovered_documents (
    id              SERIAL PRIMARY KEY,
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(id),
    case_title      TEXT,
    source_page_url TEXT,
    document_url    TEXT NOT NULL,
    file_type       TEXT DEFAULT 'pdf',
    document_hash   TEXT,
    status          TEXT DEFAULT 'discovered',
    error_message   TEXT,
    discovered_at   TIMESTAMPTZ DEFAULT NOW(),
    downloaded_at   TIMESTAMPTZ,
    UNIQUE (jurisdiction_id, document_url)
);
CREATE INDEX IF NOT EXISTS idx_dd_status ON discovered_documents(status);
CREATE INDEX IF NOT EXISTS idx_dd_jurisdiction ON discovered_documents(jurisdiction_id);

-- Raw document storage (BLOBs)
CREATE TABLE IF NOT EXISTS raw_documents (
    id              SERIAL PRIMARY KEY,
    document_id     INTEGER NOT NULL REFERENCES discovered_documents(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_hash       TEXT UNIQUE NOT NULL,
    file_data       BYTEA NOT NULL,
    file_size       INTEGER,
    mime_type       TEXT DEFAULT 'application/pdf',
    extracted_text  TEXT,
    downloaded_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rd_document_id ON raw_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_rd_file_hash ON raw_documents(file_hash);

-- Extraction audit log
CREATE TABLE IF NOT EXISTS extraction_runs (
    id              SERIAL PRIMARY KEY,
    document_id     INTEGER NOT NULL REFERENCES discovered_documents(id),
    phase           TEXT NOT NULL,
    model_used      TEXT,
    prompt_version  TEXT,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    raw_response    JSONB,
    extracted_data  JSONB,
    status          TEXT DEFAULT 'pending',
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_er_document_id ON extraction_runs(document_id);
CREATE INDEX IF NOT EXISTS idx_er_phase ON extraction_runs(phase);

-- Pipeline monitoring log
CREATE TABLE IF NOT EXISTS pipeline_log (
    id              SERIAL PRIMARY KEY,
    jurisdiction_id TEXT REFERENCES jurisdictions(id),
    step            TEXT NOT NULL,
    status          TEXT NOT NULL,
    message         TEXT,
    details_json    JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pl_jurisdiction ON pipeline_log(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_pl_step ON pipeline_log(step);
CREATE INDEX IF NOT EXISTS idx_pl_created ON pipeline_log(created_at);
"""

ALTER_CASES_SQL = """
-- Add pipeline link columns to existing cases table (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cases' AND column_name = 'document_id') THEN
        ALTER TABLE cases ADD COLUMN document_id INTEGER REFERENCES discovered_documents(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cases' AND column_name = 'extraction_version') THEN
        ALTER TABLE cases ADD COLUMN extraction_version TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'cases' AND column_name = 'last_enriched_at') THEN
        ALTER TABLE cases ADD COLUMN last_enriched_at TIMESTAMPTZ;
    END IF;
END
$$;
"""

# Also ensure the original cases table exists (from agent.py)
CASES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS cases (
    id                    SERIAL PRIMARY KEY,
    file_name             TEXT NOT NULL,
    file_hash             TEXT UNIQUE NOT NULL,
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
    raw_json              JSONB
);
CREATE INDEX IF NOT EXISTS idx_cases_jurisdiction ON cases (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_cases_year         ON cases (year);
CREATE INDEX IF NOT EXISTS idx_cases_company      ON cases (company);
CREATE INDEX IF NOT EXISTS idx_cases_sector       ON cases (sector);
"""


def init_schema():
    """Create all tables (idempotent). Safe to call on every pipeline run."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(CASES_TABLE_SQL)
            cur.execute(NEW_TABLES_SQL)
            cur.execute(ALTER_CASES_SQL)
        conn.commit()
    log.info("Database schema ready (all tables)")


# ── Pipeline logging helper ──────────────────────────────────────────────────


def log_pipeline_event(
    step: str,
    status: str,
    message: str = "",
    jurisdiction_id: str | None = None,
    details: dict | None = None,
):
    """Write a row to pipeline_log."""
    import json

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO pipeline_log (jurisdiction_id, step, status, message, details_json)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    jurisdiction_id,
                    step,
                    status,
                    message,
                    json.dumps(details) if details else None,
                ),
            )
        conn.commit()
